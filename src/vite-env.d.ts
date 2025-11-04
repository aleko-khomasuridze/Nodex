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
      get: (id: string) => Promise<import('./types/device').RegisteredDevice>;
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
    terminal?: {
      startSession: (deviceId: string) => Promise<{ sessionId: string }>;
      sendInput: (sessionId: string, input: string) => void;
      stopSession: (sessionId: string) => Promise<void>;
      onData: (
        listener: (payload: { sessionId: string; data: string }) => void
      ) => () => void;
      onClosed: (
        listener: (
          payload: { sessionId: string; code: number | null; signal: string | null }
        ) => void
      ) => () => void;
      onError: (
        listener: (payload: { sessionId: string; message: string }) => void
      ) => () => void;
    };
  }
}

export {};
