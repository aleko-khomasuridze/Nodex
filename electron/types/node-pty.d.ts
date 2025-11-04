declare module 'node-pty' {
  export interface IPty {
    onData: (handler: (chunk: string) => void) => void;
    onExit: (
      handler: (details: { exitCode: number | null; signal: number | string | null }) => void
    ) => void;
    write(data: string): void;
    resize(columns: number, rows: number): void;
    kill(signal?: string): void;
  }

  export type SpawnOptions = {
    name?: string;
    cols?: number;
    rows?: number;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
  };

  export function spawn(command: string, args?: readonly string[], options?: SpawnOptions): IPty;
}
