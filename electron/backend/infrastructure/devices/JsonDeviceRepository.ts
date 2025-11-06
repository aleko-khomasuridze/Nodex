import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import type {
  DeviceCreateInput,
  DeviceRecord,
  DeviceUpdateInput
} from '../../domain/devices/Device';
import type { DeviceRepository } from '../../domain/devices/DeviceRepository';

interface DeviceFileSchema {
  version: number;
  devices: DeviceRecord[];
}

const DEFAULT_SCHEMA: DeviceFileSchema = {
  version: 1,
  devices: []
};

export class JsonDeviceRepository implements DeviceRepository {
  constructor(private readonly filePath: string) {}

  private async ensureStorage(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch (error: unknown) {
      await this.writeFile(DEFAULT_SCHEMA);
    }
  }

  private async readFile(): Promise<DeviceFileSchema> {
    await this.ensureStorage();
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as DeviceFileSchema;
      if (!parsed.devices) {
        return { ...DEFAULT_SCHEMA };
      }
      return parsed;
    } catch (error: unknown) {
      await this.writeFile(DEFAULT_SCHEMA);
      return { ...DEFAULT_SCHEMA };
    }
  }

  private async writeFile(data: DeviceFileSchema): Promise<void> {
    const payload = JSON.stringify(data, null, 2);
    await fs.writeFile(this.filePath, payload, 'utf-8');
  }

  async getAll(): Promise<DeviceRecord[]> {
    const data = await this.readFile();
    return data.devices.slice();
  }

  async getById(id: string): Promise<DeviceRecord | null> {
    const data = await this.readFile();
    return data.devices.find((device) => device.id === id) ?? null;
  }

  async getByIp(ip: string): Promise<DeviceRecord | null> {
    const data = await this.readFile();
    return data.devices.find((device) => device.ip === ip) ?? null;
  }

  async create(input: DeviceCreateInput): Promise<DeviceRecord> {
    const now = new Date().toISOString();
    const record: DeviceRecord = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ip: input.ip,
      alias: input.alias ?? null,
      hostname: input.hostname ?? null,
      port: input.port ?? null,
      username: input.username ?? null,
      password: input.password ?? null
    };

    const data = await this.readFile();
    data.devices.push(record);
    await this.writeFile(data);

    return record;
  }

  async update(id: string, updates: DeviceUpdateInput): Promise<DeviceRecord> {
    const data = await this.readFile();
    const index = data.devices.findIndex((device) => device.id === id);
    if (index === -1) {
      throw new Error(`Device with id ${id} not found`);
    }

    const existing = data.devices[index];
    const updated: DeviceRecord = {
      ...existing,
      ...updates,
      alias: updates.alias ?? existing.alias ?? null,
      hostname: updates.hostname ?? existing.hostname ?? null,
      ip: updates.ip ?? existing.ip,
      port: updates.port ?? existing.port ?? null,
      username: updates.username ?? existing.username ?? null,
      password: updates.password ?? existing.password ?? null,
      updatedAt: new Date().toISOString()
    };

    data.devices[index] = updated;
    await this.writeFile(data);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const data = await this.readFile();
    const filtered = data.devices.filter((device) => device.id !== id);
    data.devices = filtered;
    await this.writeFile(data);
  }
}
