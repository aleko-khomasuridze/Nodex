/// <reference types="vite/client" />

declare global {
  interface Window {
    electron?: {
      versions: NodeJS.ProcessVersions;
      send: (channel: string, data?: unknown) => void;
      on: (channel: string, listener: (...args: unknown[]) => void) => void;
    };
  }
}

export {};
