import type { DeviceCreateInput, DeviceRecord, DeviceUpdateInput } from './Device';

export interface DeviceRepository {
  getAll(): Promise<DeviceRecord[]>;
  getById(id: string): Promise<DeviceRecord | null>;
  getByIp(ip: string): Promise<DeviceRecord | null>;
  create(input: DeviceCreateInput): Promise<DeviceRecord>;
  update(id: string, updates: DeviceUpdateInput): Promise<DeviceRecord>;
  delete(id: string): Promise<void>;
}
