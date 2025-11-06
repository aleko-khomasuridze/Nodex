import type { App, IpcMain } from 'electron';
import path from 'node:path';
import { DeviceController } from '../application/devices/DeviceController';
import { JsonDeviceRepository } from '../infrastructure/devices/JsonDeviceRepository';
import { LocalShellManager } from '../infrastructure/terminal/LocalShellManager';
import { SshSessionManager } from '../infrastructure/terminal/SshSessionManager';
import { registerDeviceHandlers } from './deviceHandlers';
import { registerNetworkHandlers } from './networkHandlers';
import { registerTerminalHandlers } from './terminalHandlers';

export type BackendHandlerContext = {
  deviceController: DeviceController;
  sshSessionManager: SshSessionManager;
  localShellManager: LocalShellManager;
};

export const registerBackendHandlers = ({
  app,
  ipcMain
}: {
  app: App;
  ipcMain: IpcMain;
}): BackendHandlerContext => {
  const storagePath = path.join(app.getPath('userData'), 'devices.json');
  const repository = new JsonDeviceRepository(storagePath);
  const deviceController = new DeviceController(repository);
  const sshSessionManager = new SshSessionManager();
  const localShellManager = new LocalShellManager();

  registerDeviceHandlers(ipcMain, deviceController);
  registerTerminalHandlers(ipcMain, deviceController, sshSessionManager, localShellManager);
  registerNetworkHandlers(ipcMain);

  return {
    deviceController,
    sshSessionManager,
    localShellManager
  };
};
