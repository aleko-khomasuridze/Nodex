import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import dns from 'node:dns';

const isDevelopment = process.env.NODE_ENV === 'development';

type NetworkDevice = {
  ip: string;
  hostname?: string | null;
};

const SSH_PORT = 22;
const DEFAULT_SCAN_TIMEOUT = 600;
const MAX_HOSTS_TO_SCAN = 512;
const MAX_CONCURRENCY = 80;

const ipToInt = (ip: string) =>
  ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;

const intToIp = (int: number) =>
  [24, 16, 8, 0].map((shift) => ((int >>> shift) & 255).toString()).join('.');

const enumerateHosts = (ip: string, netmask: string) => {
  const ipInt = ipToInt(ip);
  const maskInt = ipToInt(netmask);
  const network = ipInt & maskInt;
  const broadcast = network | (~maskInt >>> 0);
  const start = network + 1;
  const end = broadcast - 1;

  if (end < start) {
    return [] as string[];
  }

  const hosts: string[] = [];
  for (let addr = start; addr <= end && hosts.length < MAX_HOSTS_TO_SCAN; addr++) {
    if (addr === ipInt) {
      continue;
    }
    hosts.push(intToIp(addr));
  }

  return hosts;
};

const probeSshPort = (ip: string, timeout = DEFAULT_SCAN_TIMEOUT) =>
  new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    let finished = false;

    const finalize = (result: boolean) => {
      if (!finished) {
        finished = true;
        socket.removeAllListeners();
        socket.destroy();
        resolve(result);
      }
    };

    socket.setTimeout(timeout);
    socket.once('error', () => finalize(false));
    socket.once('timeout', () => finalize(false));
    socket.connect(SSH_PORT, ip, () => finalize(true));
  });

const reverseLookup = async (ip: string) => {
  try {
    const [hostname] = await dns.promises.reverse(ip);
    return hostname ?? null;
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOTFOUND') {
      return null;
    }
    return null;
  }
};

const scanNetworkForSsh = async (): Promise<NetworkDevice[]> => {
  const interfaces = os.networkInterfaces();
  const candidateHosts = new Set<string>();

  for (const addresses of Object.values(interfaces)) {
    if (!addresses) {
      continue;
    }

    for (const address of addresses) {
      if (address.family !== 'IPv4' || address.internal) {
        continue;
      }

      const hosts = enumerateHosts(address.address, address.netmask);
      hosts.forEach((host) => candidateHosts.add(host));
    }
  }

  if (candidateHosts.size === 0) {
    return [];
  }

  const hosts = Array.from(candidateHosts);
  const devices: NetworkDevice[] = [];

  const workers = new Array(Math.min(MAX_CONCURRENCY, hosts.length)).fill(0).map(async () => {
    while (hosts.length > 0) {
      const ip = hosts.pop();
      if (!ip) {
        break;
      }

      const isAvailable = await probeSshPort(ip);
      if (!isAvailable) {
        continue;
      }

      const hostname = await reverseLookup(ip);
      devices.push({ ip, hostname });
    }
  });

  await Promise.all(workers);

  return devices.sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }));
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
