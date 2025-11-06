import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { randomUUID } from 'node:crypto';

type SessionHandlers = {
  onData: (sessionId: string, chunk: string) => void;
  onError: (sessionId: string, error: Error) => void;
  onClose: (sessionId: string, details: { code: number | null; signal: string | null }) => void;
};

type ShellSession = {
  process: ChildProcessWithoutNullStreams;
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
      cwd: process.cwd(),
      env: {
        ...process.env,
        TERM: 'xterm-256color'
      }
    });

    const sessionId = randomUUID();
    this.sessions.set(sessionId, { process: child });

    child.stdout.setEncoding('utf-8');
    child.stderr.setEncoding('utf-8');

    const handleChunk = (chunk: string | Buffer) => {
      handlers.onData(sessionId, chunk.toString());
    };

    child.stdout.on('data', handleChunk);
    child.stderr.on('data', handleChunk);

    child.once('error', (error) => {
      this.sessions.delete(sessionId);
      handlers.onError(sessionId, error);
    });

    child.once('close', (code, signal) => {
      this.sessions.delete(sessionId);
      handlers.onClose(sessionId, {
        code: typeof code === 'number' ? code : null,
        signal: signal ?? null
      });
    });

    return { sessionId };
  }

  sendInput(sessionId: string, input: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Unable to locate the local terminal session.');
    }
    if (session.process.stdin.destroyed) {
      throw new Error('Unable to send input: the local terminal session is no longer available.');
    }
    session.process.stdin.write(input);
  }

  resize(_sessionId: string, _cols: number, _rows: number): void {
    // Resizing is not supported when using a standard child process.
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
