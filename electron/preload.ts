import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  versions: process.versions,
  send: (channel: string, data?: unknown) => {
    ipcRenderer.send(channel, data);
  },
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => listener(...args));
  }
});
