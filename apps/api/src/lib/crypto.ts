import crypto from 'crypto';

// List of configuration fields that contain sensitive credentials
export const SENSITIVE_KEYS = [
  'stripeSecretKey',
  'stripeWebhookSecret',
  'mixpanelServiceAccountSecret',
  'intercomClientSecret',
  'intercomAccessToken',
  'hubspotAccessToken',
  'salesforceClientSecret',
  'slackWebhookUrl',
  'segmentWebhookSecret',
];

// Generate encryption key derived from environment variables
const ENCRYPTION_SECRET =
  process.env.ENCRYPTION_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'retentiq-default-secure-fallback-encryption-secret-key-32';

const ENCRYPTION_KEY = crypto.scryptSync(ENCRYPTION_SECRET, 'retentiq-salt', 32);
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns colon-separated string: iv:authTag:ciphertext
 */
export function encrypt(text: string): string {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err: any) {
    console.error('[Crypto] Encryption failed:', err.message);
    return text;
  }
}

/**
 * Decrypts an AES-256-GCM encrypted string.
 * If the string is not in the correct encrypted format (iv:tag:ciphertext),
 * it returns the input string as-is.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    // Return as-is if it is not encrypted
    return encryptedText;
  }

  try {
    const [ivHex, authTagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    // If decryption fails, it could be a raw key or mask, return as-is
    console.warn('[Crypto] Decryption failed or input was raw text:', err.message);
    return encryptedText;
  }
}

/**
 * Utility to check if a string is encrypted using the custom format
 */
export function isEncrypted(text: string): boolean {
  if (typeof text !== 'string') return false;
  const parts = text.split(':');
  return parts.length === 3 && parts[0].length === 24 && parts[1].length === 32;
}

/**
 * Utility to check if a string is a visual mask (e.g., starts with •)
 */
export function isMasked(text: string): boolean {
  if (typeof text !== 'string') return false;
  return text.startsWith('•');
}

/**
 * Encrypts all sensitive keys in a config object
 */
export function encryptConfig(config: Record<string, any>): Record<string, any> {
  const result = { ...config };
  for (const key of Object.keys(result)) {
    if (
      SENSITIVE_KEYS.includes(key) &&
      typeof result[key] === 'string' &&
      result[key].trim() !== ''
    ) {
      const value = result[key].trim();
      // Only encrypt if it's not already encrypted and not masked
      if (!isEncrypted(value) && !isMasked(value)) {
        result[key] = encrypt(value);
      }
    }
  }
  return result;
}

/**
 * Decrypts all sensitive keys in a config object
 */
export function decryptConfig(config: Record<string, any>): Record<string, any> {
  const result = { ...config };
  for (const key of Object.keys(result)) {
    if (
      SENSITIVE_KEYS.includes(key) &&
      typeof result[key] === 'string' &&
      result[key].trim() !== ''
    ) {
      const value = result[key].trim();
      if (isEncrypted(value)) {
        result[key] = decrypt(value);
      }
    }
  }
  return result;
}

/**
 * Replaces sensitive keys in a config object with visual masks for safety in API responses.
 * If the config contains encrypted secrets, they are decrypted first before creating the mask.
 */
export function maskConfig(config: Record<string, any>): Record<string, any> {
  const decrypted = decryptConfig(config);
  const result = { ...decrypted };
  for (const key of Object.keys(result)) {
    if (
      SENSITIVE_KEYS.includes(key) &&
      typeof result[key] === 'string' &&
      result[key].trim() !== ''
    ) {
      const val = result[key].trim();
      if (val.length > 8) {
        result[key] = `••••••••${val.slice(-4)}`;
      } else {
        result[key] = '••••••••';
      }
    }
  }
  return result;
}
