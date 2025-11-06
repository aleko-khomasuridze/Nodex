import type { IpcMain } from 'electron';
import type { DeviceController } from '../application/devices/DeviceController';
import { DeviceValidationError } from '../domain/devices/DeviceValidation';
import { LocalShellManager } from '../infrastructure/terminal/LocalShellManager';
import { SshSessionManager } from '../infrastructure/terminal/SshSessionManager';

export const registerTerminalHandlers = (
  ipcMain: IpcMain,
  controller: DeviceController,
  sessionManager: SshSessionManager,
  localShellManager: LocalShellManager
): void => {
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
