import { randomUUID } from 'node:crypto';
import type { ClientChannel } from 'ssh2';
import { Client } from 'ssh2';
import type { DeviceRecord } from '../devices/Device';

const ESC = String.fromCharCode(0x1b);
const CSI = String.fromCharCode(0x9b);
const BEL = String.fromCharCode(0x07);
const STRING_TERMINATOR = `${ESC}\\`;

interface SessionHandlers {
  onData: (sessionId: string, chunk: string) => void;
  onError: (sessionId: string, error: Error) => void;
  onClose: (
    sessionId: string,
    details: { code: number | null; signal: string | null }
  ) => void;
}

interface ActiveSession {
  connection: Client;
  stream: ClientChannel;
  pendingControlSequence: string;
}

export class SshSessionManager {
  private readonly sessions = new Map<string, ActiveSession>();

  async startSession(
    device: DeviceRecord,
    handlers: SessionHandlers
  ): Promise<{ sessionId: string }> {
    const username = device.username;
    const password = device.password;

    if (!username || !password) {
      throw new Error(
        'The selected device is missing SSH credentials. Please provide a username and password before starting a session.'
      );
    }

    return new Promise((resolve, reject) => {
      const connection = new Client();
      let sessionId: string | null = null;
      let isSettled = false;

      connection
        .on('ready', () => {
          connection.shell(
            { term: 'xterm-256color' },
            (shellError: Error | undefined, stream?: ClientChannel) => {
              if (shellError || !stream) {
                connection.end();
                if (!isSettled) {
                  isSettled = true;
                  reject(shellError ?? new Error('Failed to open an interactive shell.'));
                }
                return;
              }

              sessionId = randomUUID();
              this.sessions.set(sessionId, {
                connection,
                stream,
                pendingControlSequence: ''
              });

              stream.on('data', (chunk: Buffer) => {
                const session = this.sessions.get(sessionId!);
                if (!session) {
                  return;
                }

                const combined =
                  session.pendingControlSequence + chunk.toString('utf-8');
                const { sanitized, pending } = this.removeControlSequences(combined);
                session.pendingControlSequence = pending;

                if (sanitized.length > 0) {
                  handlers.onData(sessionId!, sanitized);
                }
              });

            stream.on('close', (code: number | null, signal: string | null) => {
              if (sessionId) {
                this.sessions.delete(sessionId);
              }
              handlers.onClose(sessionId ?? '', { code, signal });
              connection.end();
            });

            stream.on('error', (streamError: Error) => {
              if (sessionId) {
                handlers.onError(sessionId, streamError);
              }
            });

            connection.on('error', (connectionError: Error) => {
              if (!sessionId) {
                if (!isSettled) {
                  isSettled = true;
                  reject(connectionError);
                }
                return;
              }
              handlers.onError(sessionId, connectionError);
            });

            if (!isSettled) {
              isSettled = true;
              resolve({ sessionId });
            }
            }
          );
        })
        .on('error', (connectionError: Error) => {
          if (!isSettled) {
            isSettled = true;
            reject(connectionError);
            return;
          }
          if (sessionId) {
            handlers.onError(sessionId, connectionError);
          }
        })
        .connect({
          host: device.ip,
          port: device.port ?? 22,
          username,
          password,
          readyTimeout: 15000
        });
    });
  }

  sendInput(sessionId: string, input: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Unable to locate the SSH session.');
    }
    session.stream.write(input);
  }

  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    session.stream.end();
    session.connection.end();
    this.sessions.delete(sessionId);
  }

  private removeControlSequences(
    input: string
  ): { sanitized: string; pending: string } {
    let buffer = input;
    let pending = '';

    const ansiPattern =
      /[\u001B\u009B][[\]()#;?]*(?:(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[\u0007A-PR-TZcf-ntqry=><~]|\u001B\][^\u0007]*(?:\u0007|\u001B\\))/g;

    buffer = buffer.replace(ansiPattern, '');

    const lastEscapeIndex = Math.max(buffer.lastIndexOf(ESC), buffer.lastIndexOf(CSI));
    if (lastEscapeIndex !== -1) {
      const fragment = buffer.slice(lastEscapeIndex);
      if (this.isIncompleteSequence(fragment)) {
        pending = fragment;
        buffer = buffer.slice(0, lastEscapeIndex);
      }
    }

    return { sanitized: buffer, pending };
  }

  private isIncompleteSequence(fragment: string): boolean {
    if (!fragment) {
      return false;
    }

    if (fragment === ESC || fragment === CSI) {
      return true;
    }

    if (fragment.startsWith(`${ESC}[`) || fragment.startsWith(CSI)) {
      const lastCharCode = fragment.charCodeAt(fragment.length - 1);
      const isTerminated =
        (lastCharCode >= 0x40 && lastCharCode <= 0x7e) || lastCharCode === BEL.charCodeAt(0);
      return !isTerminated;
    }

    if (fragment.startsWith(`${ESC}]`)) {
      return !fragment.includes(BEL) && !fragment.endsWith(STRING_TERMINATOR);
    }

    return false;
  }
}
