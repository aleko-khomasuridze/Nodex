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

contextBridge.exposeInMainWorld('networkScan', {
  scan: () => ipcRenderer.invoke('network-scan')
});

contextBridge.exposeInMainWorld('devices', {
  list: () => ipcRenderer.invoke('devices:list'),
  register: (payload: unknown) => ipcRenderer.invoke('devices:register', payload),
  update: (id: string, updates: unknown) =>
    ipcRenderer.invoke('devices:update', { id, updates }),
  remove: (id: string) => ipcRenderer.invoke('devices:remove', id)
});
