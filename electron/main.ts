import { app, BrowserWindow, shell, ipcMain, globalShortcut } from "electron";
import path from "node:path";
import type { BackendHandlerContext } from "./backend/handlers/handler";
import { registerBackendHandlers } from "./backend/handlers/handler";

let backendContext: BackendHandlerContext | null = null;

const createWindow = async () => {
  const mainWindow = new BrowserWindow({
    width: 1080,
    height: 720,
    backgroundColor: "#0f172a",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());

  if (!app.isPackaged) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || "http://localhost:5173");
  } else {
    await mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  if (app.isPackaged) {
    mainWindow.webContents.on("context-menu", (e) => e.preventDefault());
    mainWindow.webContents.on("devtools-opened", () => mainWindow.webContents.closeDevTools());
  }
};

app.whenReady().then(async () => {
  backendContext = registerBackendHandlers({ app, ipcMain });

  // disable devtools shortcuts when packaged
  if (app.isPackaged) {
    globalShortcut.register("Control+Shift+I", () => {});
    globalShortcut.register("Command+Option+I", () => {});
    globalShortcut.register("F12", () => {});
  }

  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) await createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

export const getBackendContext = () => backendContext;
