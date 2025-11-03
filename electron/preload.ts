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
  get: (id: string) => ipcRenderer.invoke('devices:get', id),
  list: () => ipcRenderer.invoke('devices:list'),
  register: (payload: unknown) => ipcRenderer.invoke('devices:register', payload),
  update: (id: string, updates: unknown) =>
    ipcRenderer.invoke('devices:update', { id, updates }),
  remove: (id: string) => ipcRenderer.invoke('devices:remove', id)
});

contextBridge.exposeInMainWorld('terminal', {
  startSession: (deviceId: string) =>
    ipcRenderer.invoke('terminal:start', { deviceId }),
  sendInput: (sessionId: string, input: string) =>
    ipcRenderer.send('terminal:input', { sessionId, input }),
  stopSession: (sessionId: string) =>
    ipcRenderer.invoke('terminal:stop', { sessionId }),
  onData: (
    listener: (payload: { sessionId: string; data: string }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: { sessionId: string; data: string }
    ) => listener(payload);
    ipcRenderer.on('terminal:data', handler);
    return () => ipcRenderer.removeListener('terminal:data', handler);
  },
  onClosed: (
    listener: (
      payload: { sessionId: string; code: number | null; signal: string | null }
    ) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: { sessionId: string; code: number | null; signal: string | null }
    ) => listener(payload);
    ipcRenderer.on('terminal:closed', handler);
    return () => ipcRenderer.removeListener('terminal:closed', handler);
  },
  onError: (
    listener: (payload: { sessionId: string; message: string }) => void
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: { sessionId: string; message: string }
    ) => listener(payload);
    ipcRenderer.on('terminal:error', handler);
    return () => ipcRenderer.removeListener('terminal:error', handler);
  }
});
