import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'node:path';
import { scanNetworkForSsh } from './backend/networkScan';
import { JsonDeviceRepository } from './backend/devices/JsonDeviceRepository';
import { DeviceController } from './backend/devices/DeviceController';
import { DeviceValidationError } from './backend/devices/DeviceValidation';
import { SshSessionManager } from './backend/terminal/SshSessionManager';
import { LocalShellManager } from './backend/terminal/LocalShellManager';

const isDevelopment = process.env.NODE_ENV === 'development';

const createDeviceController = () => {
  const storagePath = path.join(app.getPath('userData'), 'devices.json');
  const repository = new JsonDeviceRepository(storagePath);
  return new DeviceController(repository);
};

const registerDeviceHandlers = (controller: DeviceController) => {
  ipcMain.handle('devices:get', async (_event, id: string) => {
    try {
      return await controller.getDevice(id);
    } catch (error: unknown) {
      if (error instanceof DeviceValidationError) {
        throw new Error(error.message);
      }
      throw error;
    }
  });
  ipcMain.handle('devices:list', async () => controller.listDevices());
  ipcMain.handle('devices:register', async (
    _event,
    payload: Parameters<DeviceController['registerDevice']>[0]
  ) => {
    try {
      return await controller.registerDevice(payload);
    } catch (error: unknown) {
      if (error instanceof DeviceValidationError) {
        throw new Error(error.message);
      }
      throw error;
    }
  });
  ipcMain.handle('devices:update', async (_event, payload: { id: string; updates: Parameters<DeviceController['updateDevice']>[1] }) => {
    try {
      return await controller.updateDevice(payload.id, payload.updates);
    } catch (error: unknown) {
      if (error instanceof DeviceValidationError) {
        throw new Error(error.message);
      }
      throw error;
    }
  });
  ipcMain.handle('devices:remove', async (_event, id: string) => {
    try {
      await controller.removeDevice(id);
    } catch (error: unknown) {
      if (error instanceof DeviceValidationError) {
        throw new Error(error.message);
      }
      throw error;
    }
  });
};

const registerTerminalHandlers = (
  controller: DeviceController,
  sessionManager: SshSessionManager,
  localShellManager: LocalShellManager
) => {
  ipcMain.handle(
    'terminal:start',
    async (
      event,
      payload: { deviceId?: string }
    ): Promise<{ sessionId: string }> => {
      const { deviceId } = payload ?? {};
      if (!deviceId) {
        throw new Error('A device identifier is required to start an SSH session.');
      }

      try {
        const device = await controller.getDevice(deviceId);
        const webContents = event.sender;
        return await sessionManager.startSession(device, {
          onData: (sessionId, chunk) => {
            webContents.send('terminal:data', { sessionId, data: chunk });
          },
          onError: (sessionId, error) => {
            webContents.send('terminal:error', {
              sessionId,
              message: error.message
            });
          },
          onClose: (sessionId, details) => {
            webContents.send('terminal:closed', {
              sessionId,
              code: details.code,
              signal: details.signal
            });
          }
        });
      } catch (error: unknown) {
        if (error instanceof DeviceValidationError) {
          throw new Error(error.message);
        }
        if (error instanceof Error) {
          throw new Error(error.message);
        }
        throw error;
      }
    }
  );

  ipcMain.on(
    'terminal:input',
    (event, payload: { sessionId?: string; input?: string }) => {
      const { sessionId, input } = payload ?? {};
      if (!sessionId || typeof input !== 'string') {
        return;
      }
      try {
        sessionManager.sendInput(sessionId, input);
      } catch (error: unknown) {
        event.sender.send('terminal:error', {
          sessionId,
          message:
            error instanceof Error
              ? error.message
              : 'Unable to send data to the SSH session.'
        });
      }
    }
  );

  ipcMain.handle(
    'terminal:stop',
    async (_event, payload: { sessionId?: string }): Promise<void> => {
      const { sessionId } = payload ?? {};
      if (!sessionId) {
        return;
      }
      await sessionManager.stopSession(sessionId);
    }
  );
  ipcMain.handle('terminal:start-local', async (event) => {
    const webContents = event.sender;
    try {
      return await localShellManager.startSession({
        onData: (sessionId, chunk) => {
          webContents.send('terminal:local:data', { sessionId, data: chunk });
        },
        onError: (sessionId, error) => {
          webContents.send('terminal:local:error', {
            sessionId,
            message: error.message
          });
        },
        onClose: (sessionId, details) => {
          webContents.send('terminal:local:closed', {
            sessionId,
            code: details.code,
            signal: details.signal
          });
        }
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw error;
    }
  });

  ipcMain.on(
    'terminal:local:input',
    (event, payload: { sessionId?: string; input?: string }) => {
      const { sessionId, input } = payload ?? {};
      if (!sessionId || typeof input !== 'string') {
        return;
      }
      try {
        localShellManager.sendInput(sessionId, input);
      } catch (error: unknown) {
        event.sender.send('terminal:local:error', {
          sessionId,
          message:
            error instanceof Error
              ? error.message
              : 'Unable to send data to the local terminal session.'
        });
      }
    }
  );

  ipcMain.on(
    'terminal:local:resize',
    (_event, payload: { sessionId?: string; cols?: number; rows?: number }) => {
      const { sessionId, cols, rows } = payload ?? {};
      if (!sessionId || typeof cols !== 'number' || typeof rows !== 'number') {
        return;
      }
      localShellManager.resize(sessionId, cols, rows);
    }
  );

  ipcMain.handle(
    'terminal:local:stop',
    async (_event, payload: { sessionId?: string }): Promise<void> => {
      const { sessionId } = payload ?? {};
      if (!sessionId) {
        return;
      }
      localShellManager.stopSession(sessionId);
    }
  );
};

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDevelopment) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  const devServerURL = process.env.VITE_DEV_SERVER_URL;
  if (isDevelopment && devServerURL) {
    await mainWindow.loadURL(devServerURL);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    await mainWindow.loadFile(indexPath);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

ipcMain.handle('network-scan', async () => {
  return scanNetworkForSsh();
});

app.whenReady().then(async () => {
  const deviceController = createDeviceController();
  registerDeviceHandlers(deviceController);
  const terminalManager = new SshSessionManager();
  const localShellManager = new LocalShellManager();
  registerTerminalHandlers(deviceController, terminalManager, localShellManager);

  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
