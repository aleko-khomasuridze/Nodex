export interface DeviceBase {
  ip: string;
  hostname?: string | null;
  alias?: string | null;
  port?: number | null;
  username?: string | null;
  password?: string | null;
}

export interface DeviceRecord extends DeviceBase {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type DeviceCreateInput = DeviceBase & {
  ip: string;
};

export type DeviceUpdateInput = Partial<DeviceBase>;
