export class DeviceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeviceValidationError';
  }
}

const IP_ADDRESS_PATTERN = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;

const sanitizeOptionalString = (value?: string | null): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const sanitizePort = (port?: number | null): number | null => {
  if (typeof port === 'number' && Number.isFinite(port)) {
    const integerPort = Math.round(port);
    if (integerPort >= 1 && integerPort <= 65535) {
      return integerPort;
    }
  }
  return null;
};

export const validateAndNormalizeInput = <T extends { ip: string; alias?: string | null; hostname?: string | null; port?: number | null; username?: string | null; password?: string | null; }>(
  input: T
): T => {
  const ip = input.ip.trim();
  if (!IP_ADDRESS_PATTERN.test(ip)) {
    throw new DeviceValidationError('A valid IPv4 address is required.');
  }

  return {
    ...input,
    ip,
    alias: sanitizeOptionalString(input.alias),
    hostname: sanitizeOptionalString(input.hostname),
    username: sanitizeOptionalString(input.username),
    password: sanitizeOptionalString(input.password),
    port: sanitizePort(input.port)
  };
};
