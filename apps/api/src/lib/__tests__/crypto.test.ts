import { describe, it, expect } from 'vitest';
import {
  encrypt,
  decrypt,
  isEncrypted,
  isMasked,
  encryptConfig,
  decryptConfig,
  maskConfig,
  SENSITIVE_KEYS,
} from '../crypto.js';

describe('Crypto Utility (AES-256-GCM)', () => {
  const sampleSecret = 'sk_test_51MzRetentIQSecureKey1234567890';

  it('encrypts and decrypts a plaintext secret back to original', () => {
    const encrypted = encrypt(sampleSecret);
    expect(encrypted).not.toEqual(sampleSecret);
    expect(isEncrypted(encrypted)).toBe(true);

    const decrypted = decrypt(encrypted);
    expect(decrypted).toEqual(sampleSecret);
  });

  it('produces unique ciphertexts with different IVs for identical plaintext', () => {
    const enc1 = encrypt(sampleSecret);
    const enc2 = encrypt(sampleSecret);
    expect(enc1).not.toEqual(enc2);
    expect(decrypt(enc1)).toEqual(sampleSecret);
    expect(decrypt(enc2)).toEqual(sampleSecret);
  });

  it('handles empty strings and falsy inputs gracefully', () => {
    expect(encrypt('')).toBe('');
    expect(decrypt('')).toBe('');
  });

  it('returns unencrypted string as-is when attempting decrypt', () => {
    const plain = 'regular-unencrypted-string';
    expect(decrypt(plain)).toBe(plain);
    expect(isEncrypted(plain)).toBe(false);
  });

  it('identifies masked secrets correctly', () => {
    expect(isMasked('••••••••1234')).toBe(true);
    expect(isMasked('••••••••')).toBe(true);
    expect(isMasked('sk_live_1234')).toBe(false);
  });

  it('encrypts and decrypts sensitive keys in config objects', () => {
    const rawConfig = {
      stripeSecretKey: 'sk_live_999888777666',
      webhookUrl: 'https://api.retentiq.com/webhook',
      nonSensitiveSetting: 'auto_sync',
    };

    const encryptedConfig = encryptConfig(rawConfig);
    expect(isEncrypted(encryptedConfig.stripeSecretKey)).toBe(true);
    expect(encryptedConfig.webhookUrl).toBe('https://api.retentiq.com/webhook');
    expect(encryptedConfig.nonSensitiveSetting).toBe('auto_sync');

    const decryptedConfig = decryptConfig(encryptedConfig);
    expect(decryptedConfig.stripeSecretKey).toBe('sk_live_999888777666');
    expect(decryptedConfig.webhookUrl).toBe('https://api.retentiq.com/webhook');
  });

  it('masks sensitive keys properly for client API responses', () => {
    const config = {
      stripeSecretKey: 'sk_live_999888777666',
      slackWebhookUrl: 'short',
      regularField: 'public_value',
    };

    const masked = maskConfig(config);
    expect(masked.stripeSecretKey).toEqual('••••••••7666');
    expect(masked.slackWebhookUrl).toEqual('••••••••');
    expect(masked.regularField).toEqual('public_value');
  });
});
