import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { spawn, type IPty } from 'node-pty-prebuilt-multiarch';

type SessionHandlers = {
  onData: (sessionId: string, chunk: string) => void;
  onError: (sessionId: string, error: Error) => void;
  onClose: (sessionId: string, details: { code: number | null; signal: string | null }) => void;
};

type ShellSession = {
  process: IPty;
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
    const shell = resolveShell();
    const child = spawn(shell, [], {
      name: 'xterm-256color',
      cols: 80,
      rows: 24,
      cwd: process.cwd(),
      env: {
        ...process.env,
        TERM: 'xterm-256color'
      }
    });

    const sessionId = randomUUID();
    this.sessions.set(sessionId, { process: child });

    const handleData = (chunk: string) => {
      handlers.onData(sessionId, chunk);
    };

    child.onData(handleData);

    const emitter = child as unknown as EventEmitter;
    emitter.once('error', (error) => {
      this.sessions.delete(sessionId);
      handlers.onError(sessionId, error instanceof Error ? error : new Error(String(error)));
    });

    child.onExit(({ exitCode, signal }) => {
      this.sessions.delete(sessionId);
      handlers.onClose(sessionId, {
        code: typeof exitCode === 'number' ? exitCode : null,
        signal: signal !== undefined && signal !== null ? String(signal) : null
      });
    });

    return { sessionId };
  }

  sendInput(sessionId: string, input: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Unable to locate the local terminal session.');
    }
    session.process.write(input);
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    session.process.resize(Math.max(cols, 1), Math.max(rows, 1));
  }

  stopSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }
    session.process.kill();
    this.sessions.delete(sessionId);
  }
}
