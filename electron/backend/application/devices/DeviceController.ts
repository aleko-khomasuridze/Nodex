import type {
  DeviceAuthMethod,
  DeviceCreateInput,
  DeviceRecord,
  DeviceRegistrationInput,
  DeviceUpdateInput,
  DeviceUpdateRequest
} from '../../domain/devices/Device';
import type { DeviceRepository } from '../../domain/devices/DeviceRepository';
import {
  DeviceValidationError,
  sanitizeSecret,
  validateAndNormalizeInput
} from '../../domain/devices/DeviceValidation';
import { encrypt, generateKeyPair } from '../../infrastructure/security/encryption';

type DeviceCredentialPayload = Pick<
  DeviceCreateInput,
  'encryptedPassword' | 'privateKey' | 'publicKey'
>;

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

  async registerDevice(input: DeviceRegistrationInput): Promise<DeviceRecord> {
    const normalized = validateAndNormalizeInput(input);
    const existing = await this.repository.getByIp(normalized.ip);
    if (existing) {
      throw new DeviceValidationError('A device with this IP address is already registered.');
    }

    const credentials = this.resolveCredentialsForCreate(
      normalized.authMethod,
      sanitizeSecret(input.password)
    );

    const payload: DeviceCreateInput = {
      ip: normalized.ip,
      alias: normalized.alias ?? null,
      hostname: normalized.hostname ?? null,
      port: normalized.port ?? null,
      username: normalized.username ?? null,
      authMethod: normalized.authMethod,
      ...credentials
    };

    return this.repository.create(payload);
  }

  async updateDevice(id: string, updates: DeviceUpdateRequest): Promise<DeviceRecord> {
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new DeviceValidationError('Unable to update a device that does not exist.');
    }

    const normalized = validateAndNormalizeInput({
      ...existing,
      ...updates,
      authMethod: updates.authMethod ?? existing.authMethod
    });

    const sanitizedPassword =
      updates.password === undefined ? undefined : sanitizeSecret(updates.password);

    const credentials = this.resolveCredentialsForUpdate(
      normalized.authMethod,
      sanitizedPassword,
      existing
    );

    const payload: DeviceUpdateInput = {
      alias: normalized.alias ?? null,
      hostname: normalized.hostname ?? null,
      ip: normalized.ip,
      port: normalized.port ?? null,
      username: normalized.username ?? null,
      authMethod: normalized.authMethod,
      ...credentials
    };

    return this.repository.update(id, payload);
  }

  async removeDevice(id: string): Promise<void> {
    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new DeviceValidationError('Unable to delete a device that does not exist.');
    }

    await this.repository.delete(id);
  }

  private resolveCredentialsForCreate(
    authMethod: DeviceAuthMethod,
    password: string | null
  ): DeviceCredentialPayload {
    if (authMethod === 'password') {
      if (!password) {
        throw new DeviceValidationError(
          'A password is required when using password authentication.'
        );
      }

      return {
        encryptedPassword: encrypt(password),
        privateKey: null,
        publicKey: null
      };
    }

    const { privateKey, publicKey } = generateKeyPair();
    return {
      encryptedPassword: null,
      privateKey: encrypt(privateKey),
      publicKey
    };
  }

  private resolveCredentialsForUpdate(
    authMethod: DeviceAuthMethod,
    passwordUpdate: string | null | undefined,
    existing: DeviceRecord
  ): DeviceCredentialPayload {
    if (authMethod === 'password') {
      if (passwordUpdate === undefined) {
        if (existing.authMethod !== 'password' && !existing.encryptedPassword) {
          throw new DeviceValidationError(
            'Switching to password authentication requires providing a password.'
          );
        }

        return {
          encryptedPassword: existing.encryptedPassword,
          privateKey: null,
          publicKey: null
        };
      }

      if (!passwordUpdate) {
        throw new DeviceValidationError(
          'A password is required when using password authentication.'
        );
      }

      return {
        encryptedPassword: encrypt(passwordUpdate),
        privateKey: null,
        publicKey: null
      };
    }

    if (existing.authMethod === 'key' && passwordUpdate === undefined) {
      return {
        encryptedPassword: null,
        privateKey: existing.privateKey,
        publicKey: existing.publicKey
      };
    }

    const { privateKey, publicKey } = generateKeyPair();
    return {
      encryptedPassword: null,
      privateKey: encrypt(privateKey),
      publicKey
    };
  }
}
