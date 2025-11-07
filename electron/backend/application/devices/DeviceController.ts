import bcrypt from 'bcrypt';
import type {
  DeviceCreateInput,
  DeviceRecord,
  DeviceUpdateInput
} from '../../domain/devices/Device';
import type { DeviceRepository } from '../../domain/devices/DeviceRepository';
import { DeviceValidationError, validateAndNormalizeInput } from '../../domain/devices/DeviceValidation';

const BCRYPT_SALT_ROUNDS = 12;

export class DeviceController {
  constructor(private readonly repository: DeviceRepository) {}

  async getDevice(id: string): Promise<DeviceRecord> {
    const record = await this.repository.getById(id);
    if (!record) {
      throw new DeviceValidationError('Unable to locate the requested device.');
    }
    return record;
  }

  async listDevices(): Promise<DeviceRecord[]> {
    return this.repository.getAll();
  }

  async registerDevice(input: DeviceCreateInput): Promise<DeviceRecord> {
    const normalized = validateAndNormalizeInput(input);
    const existing = await this.repository.getByIp(normalized.ip);
    if (existing) {
      throw new DeviceValidationError('A device with this IP address is already registered.');
    }
    const { password: normalizedPassword, ...rest } = normalized;
    const password = normalizedPassword ? await this.hashPassword(normalizedPassword) : null;
    return this.repository.create({
      ...rest,
      password
    });
  }

  async updateDevice(id: string, updates: DeviceUpdateInput): Promise<DeviceRecord> {
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new DeviceValidationError('Unable to update a device that does not exist.');
    }

    const normalized = updates.ip
      ? validateAndNormalizeInput({ ...existing, ...updates })
      : {
          ...existing,
          ...updates,
          alias: updates.alias ?? existing.alias,
          hostname: updates.hostname ?? existing.hostname,
          port: updates.port ?? existing.port,
          username: updates.username ?? existing.username,
          password: updates.password ?? existing.password
        };

    const sanitizedPassword =
      updates.password === undefined ? undefined : this.sanitizePassword(updates.password);
    const password = await this.resolvePasswordForUpdate(sanitizedPassword, existing.password ?? null);

    return this.repository.update(id, {
      alias: normalized.alias,
      hostname: normalized.hostname,
      ip: normalized.ip,
      port: normalized.port,
      username: normalized.username,
      password
    });
  }

  async removeDevice(id: string): Promise<void> {
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new DeviceValidationError('Unable to delete a device that does not exist.');
    }

    await this.repository.delete(id);
  }

  private sanitizePassword(value?: string | null): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  private async resolvePasswordForUpdate(
    sanitizedUpdate: string | null | undefined,
    currentPassword: string | null
  ): Promise<string | null> {
    if (sanitizedUpdate === undefined) {
      return currentPassword;
    }

    if (sanitizedUpdate === null) {
      return currentPassword;
    }

    return this.hashPassword(sanitizedUpdate);
  }
}
