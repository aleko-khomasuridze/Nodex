import type { IpcMain } from 'electron';
import { scanNetworkForSsh } from '../application/network/scanNetworkForSsh';

export const registerNetworkHandlers = (ipcMain: IpcMain): void => {
  ipcMain.handle('network-scan', async () => scanNetworkForSsh());
};
