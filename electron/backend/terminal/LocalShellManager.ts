import { randomUUID } from 'node:crypto';
import type { IPty } from 'node-pty';

const loadNodePty = () =>
  import('node-pty').catch((error) => {
    const message =
      'The "node-pty" module is required to launch a local terminal session. ' +
      'Please ensure it is installed and that native dependencies are built for your platform.';
    if (error instanceof Error) {
      throw new Error(`${message} Original error: ${error.message}`);
    }
    throw new Error(message);
  });

type SessionHandlers = {
  onData: (sessionId: string, chunk: string) => void;
  onError: (sessionId: string, error: Error) => void;
  onClose: (sessionId: string, details: { code: number | null; signal: string | null }) => void;
};

type ShellSession = {
  pty: IPty;
};

const resolveShell = () => {
  if (process.platform === 'win32') {
    return process.env.COMSPEC ?? 'cmd.exe';
  }
  return process.env.SHELL ?? '/bin/bash';
};

export class LocalShellManager {
  private readonly sessions = new Map<string, ShellSession>();

  async startSession(handlers: SessionHandlers): Promise<{ sessionId: string }> {
    const { spawn } = await loadNodePty();
    const shell = resolveShell();
    const cols = 80;
    const rows = 30;

    const ptyProcess = spawn(shell, [], {
      name: 'xterm-color',
      cols,
      rows,
      cwd: process.cwd(),
      env: {
        ...process.env,
        TERM: 'xterm-256color'
      }
    });

    const sessionId = randomUUID();
    this.sessions.set(sessionId, { pty: ptyProcess });

    ptyProcess.onData((chunk) => {
      handlers.onData(sessionId, chunk);
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      this.sessions.delete(sessionId);
      handlers.onClose(sessionId, {
        code: typeof exitCode === 'number' ? exitCode : null,
        signal:
          typeof signal === 'number'
            ? String(signal)
            : signal ?? null
      });
    });

    return { sessionId };
  }

  sendInput(sessionId: string, input: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Unable to locate the local terminal session.');
    }
    session.pty.write(input);
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    session.pty.resize(cols, rows);
  }

  stopSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    session.pty.kill();
    this.sessions.delete(sessionId);
  }
}
