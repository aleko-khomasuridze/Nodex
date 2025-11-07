export type DeviceAuthMethod = 'password' | 'key';

export interface DeviceBase {
  ip: string;
  hostname?: string | null;
  alias?: string | null;
  port?: number | null;
  username?: string | null;
  authMethod: DeviceAuthMethod;
}

export interface DeviceCredentials {
  encryptedPassword: string | null;
  privateKey: string | null;
  publicKey: string | null;
}

export interface DeviceRecord extends DeviceBase, DeviceCredentials {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type DeviceCreateInput = DeviceBase & DeviceCredentials;

export type DeviceUpdateInput = Partial<DeviceBase & DeviceCredentials>;

export interface DeviceRegistrationInput extends DeviceBase {
  password?: string | null;
}

export type DeviceUpdateRequest = Partial<DeviceRegistrationInput>;
