export interface DeviceRegistrationPayload {
  ip: string;
  hostname?: string | null;
  alias?: string | null;
  port?: number | null;
  username?: string | null;
  password?: string | null;
}

export interface RegisteredDevice extends DeviceRegistrationPayload {
  id: string;
  createdAt: string;
  updatedAt: string;
}
