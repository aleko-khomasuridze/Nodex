import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'node:path';
import { scanNetworkForSsh } from './backend/networkScan';
import { JsonDeviceRepository } from './backend/devices/JsonDeviceRepository';
import { DeviceController } from './backend/devices/DeviceController';
import { DeviceValidationError } from './backend/devices/DeviceValidation';

const isDevelopment = process.env.NODE_ENV === 'development';

const createDeviceController = () => {
  const storagePath = path.join(app.getPath('userData'), 'devices.json');
  const repository = new JsonDeviceRepository(storagePath);
  return new DeviceController(repository);
};

const registerDeviceHandlers = (controller: DeviceController) => {
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
