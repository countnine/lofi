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

export const safeStorage = {
  isEncryptionAvailable: (): boolean => false,
};
