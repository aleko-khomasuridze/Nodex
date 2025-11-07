import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import os from 'node:os';
import sshpk from 'sshpk';
import dotenv from 'dotenv'

dotenv.config()

const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const parseKeyFromEnvironment = (): Buffer => {
  const value = process.env.NODEX_SECRET_KEY;
  if (!value) {
    throw new Error('NODEX_SECRET_KEY is not configured. Unable to encrypt secrets.');
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error('NODEX_SECRET_KEY is empty. Unable to encrypt secrets.');
  }

  const candidates: Buffer[] = [];

  try {
    candidates.push(Buffer.from(trimmed, 'base64'));
  } catch (error) {
    // Ignore base64 decoding failures and try other formats.
  }

  if (/^[0-9a-fA-F]+$/.test(trimmed) && trimmed.length % 2 === 0) {
    candidates.push(Buffer.from(trimmed, 'hex'));
  }

  candidates.push(Buffer.from(trimmed, 'utf-8'));

  const match = candidates.find((candidate) => candidate.length === KEY_LENGTH);
  if (!match) {
    throw new Error('NODEX_SECRET_KEY must represent exactly 32 bytes.');
  }

  return match;
};

const getSecretKey = (() => {
  let cached: Buffer | null = null;
  return (): Buffer => {
    if (!cached) {
      cached = parseKeyFromEnvironment();
    }
    return cached;
  };
})();

export const encrypt = (plainText: string): string => {
  const key = getSecretKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, encrypted, authTag]
    .map((segment) => segment.toString('base64'))
    .join(':');
};

export const decrypt = (payload: string): string => {
  if (!payload) {
    throw new Error('Unable to decrypt an empty payload.');
  }

  const [ivEncoded, contentEncoded, tagEncoded] = payload.split(':');
  if (!ivEncoded || !contentEncoded || !tagEncoded) {
    throw new Error('Encrypted payload is malformed.');
  }

  const key = getSecretKey();
  const iv = Buffer.from(ivEncoded, 'base64');
  const encrypted = Buffer.from(contentEncoded, 'base64');
  const authTag = Buffer.from(tagEncoded, 'base64');

  if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Encrypted payload is malformed.');
  }

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf-8');
};

export const generateKeyPair = (): { publicKey: string; privateKey: string } => {
  const comment = `nodex@${os.hostname()}`;
  const generate = sshpk.generatePrivateKey as unknown as (
    type: string,
    options?: { comment?: string }
  ) => sshpk.PrivateKey;
  const privateKey = generate('ed25519', { comment });

  return {
    publicKey: privateKey.toPublic().toString('ssh'),
    privateKey: privateKey.toString('openssh')
  };
};
