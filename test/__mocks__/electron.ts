// Stand-in for the `electron` module in tests. Source under test only imports
// types from it (elided at runtime), but mapping it keeps any accidental
// runtime import from crashing the test environment.
export const ipcRenderer = {
  on: (): void => undefined,
  send: (): void => undefined,
};

export const ipcMain = {
  on: (): void => undefined,
  handle: (): void => undefined,
};

// Reversible fake so token-crypto round-trips can be asserted. `encryptString`
// returns a Buffer (as the real API does); `decryptString` reverses it.
export const safeStorage = {
  isEncryptionAvailable: (): boolean => true,
  encryptString: (plain: string): Buffer => Buffer.from(`cipher:${plain}`, 'utf-8'),
  decryptString: (buffer: Buffer): string => buffer.toString('utf-8').replace(/^cipher:/, ''),
};
