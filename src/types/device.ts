export type DeviceAuthMethod = 'password' | 'key';

export interface DeviceRegistrationPayload {
  ip: string;
  hostname?: string | null;
  alias?: string | null;
  port?: number | null;
  username?: string | null;
  authMethod: DeviceAuthMethod;
  password?: string | null;
}

export type DeviceUpdatePayload = Partial<DeviceRegistrationPayload>;

export interface RegisteredDevice {
  id: string;
  createdAt: string;
  updatedAt: string;
  ip: string;
  hostname: string | null;
  alias: string | null;
  port: number | null;
  username: string | null;
  authMethod: DeviceAuthMethod;
  encryptedPassword: string | null;
  privateKey: string | null;
  publicKey: string | null;
}
