import { safeStorage } from 'electron';

import { decryptToken, encryptToken } from './token-crypto';

const MARKER = 'enc:v1:';

describe('token-crypto', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns empty/falsy values unchanged', () => {
    expect(encryptToken('')).toBe('');
    expect(decryptToken('')).toBe('');
  });

  it('encrypts with a marker and round-trips back to the original', () => {
    const cipher = encryptToken('my-refresh-token');
    expect(cipher.startsWith(MARKER)).toBe(true);
    expect(cipher).not.toContain('my-refresh-token');
    expect(decryptToken(cipher)).toBe('my-refresh-token');
  });

  it('passes a legacy plaintext token (no marker) through unchanged', () => {
    // Migration path: tokens written before encryption existed have no marker.
    expect(decryptToken('legacy-plaintext')).toBe('legacy-plaintext');
  });

  it('stores plaintext when OS encryption is unavailable', () => {
    jest.spyOn(safeStorage, 'isEncryptionAvailable').mockReturnValue(false);
    expect(encryptToken('tok')).toBe('tok');
  });

  it('clears the token when decryption throws (corrupt ciphertext)', () => {
    jest.spyOn(safeStorage, 'decryptString').mockImplementation(() => {
      throw new Error('keychain changed');
    });
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(decryptToken(`${MARKER}garbage`)).toBe('');
  });
});
