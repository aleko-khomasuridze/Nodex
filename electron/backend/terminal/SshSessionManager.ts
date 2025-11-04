import { randomUUID } from 'node:crypto';
import type { ClientChannel } from 'ssh2';
import { Client } from 'ssh2';
import type { DeviceRecord } from '../devices/Device';

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
                stream
              });

              stream.on('data', (chunk: Buffer) => {
                handlers.onData(sessionId!, chunk.toString('utf-8'));
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
}
