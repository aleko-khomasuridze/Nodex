import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'node:path';
import type { BackendHandlerContext } from './backend/handlers/handler';
import { registerBackendHandlers } from './backend/handlers/handler';

const isDevelopment = process.env.NODE_ENV === 'development';

let backendContext: BackendHandlerContext | null = null;

const createWindow = async () => {
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
};

app.whenReady().then(async () => {
  backendContext = registerBackendHandlers({ app, ipcMain });

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

export const getBackendContext = () => backendContext;
