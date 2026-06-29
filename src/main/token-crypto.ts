import { safeStorage } from 'electron';

// Tokens persisted to disk are wrapped with this marker so we can tell an
// encrypted value apart from a legacy plaintext token (written before encryption
// existed) and migrate it transparently on the next save.
const ENCRYPTION_MARKER = 'enc:v1:';

export const encryptToken = (plain: string): string => {
  if (!plain) {
    return plain;
  }

  // No OS-level keychain available (e.g. some headless Linux setups). Fall back
  // to storing the value as-is rather than losing the login entirely.
  if (!safeStorage.isEncryptionAvailable()) {
    return plain;
  }

  const encrypted = safeStorage.encryptString(plain).toString('base64');
  return `${ENCRYPTION_MARKER}${encrypted}`;
};

export const decryptToken = (value: string): string => {
  // Empty, or a legacy plaintext token written before encryption existed — return
  // it unchanged (it gets re-encrypted on the next save).
  if (!value || !value.startsWith(ENCRYPTION_MARKER)) {
    return value;
  }

  try {
    const base64 = value.slice(ENCRYPTION_MARKER.length);
    return safeStorage.decryptString(Buffer.from(base64, 'base64'));
  } catch (error) {
    // Corrupt or undecryptable ciphertext (e.g. OS keychain changed). Clear it so
    // the user re-logs in instead of the app crashing on a bad token.
    // eslint-disable-next-line no-console
    console.error('Failed to decrypt stored token, clearing it.', error);
    return '';
  }
};
