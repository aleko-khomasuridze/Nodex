import type { IpcMain } from 'electron';
import type { DeviceController } from '../application/devices/DeviceController';
import { DeviceValidationError } from '../domain/devices/DeviceValidation';

export const registerDeviceHandlers = (
  ipcMain: IpcMain,
  controller: DeviceController
): void => {
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

  ipcMain.handle(
    'devices:register',
    async (
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
    }
  );

  ipcMain.handle(
    'devices:update',
    async (
      _event,
      payload: { id: string; updates: Parameters<DeviceController['updateDevice']>[1] }
    ) => {
      try {
        return await controller.updateDevice(payload.id, payload.updates);
      } catch (error: unknown) {
        if (error instanceof DeviceValidationError) {
          throw new Error(error.message);
        }
        throw error;
      }
    }
  );

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
