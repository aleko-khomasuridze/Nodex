/// <reference types="vite/client" />

declare global {
  interface Window {
    electron?: {
      versions: NodeJS.ProcessVersions;
      send: (channel: string, data?: unknown) => void;
      on: (channel: string, listener: (...args: unknown[]) => void) => void;
    };
    networkScan?: {
      scan: () => Promise<{
        ip: string;
        hostname?: string | null;
      }[]>;
    };
    devices?: {
      list: () => Promise<import('./types/device').RegisteredDevice[]>;
      register: (
        payload: import('./types/device').DeviceRegistrationPayload
      ) => Promise<import('./types/device').RegisteredDevice>;
      update: (
        id: string,
        updates: Partial<import('./types/device').DeviceRegistrationPayload>
      ) => Promise<import('./types/device').RegisteredDevice>;
      remove: (id: string) => Promise<void>;
    };
  }
}

export {};
