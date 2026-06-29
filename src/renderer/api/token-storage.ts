import { ipcRenderer } from 'electron';

import { IpcMessage } from '../../constants';

// Tokens are encrypted at rest by the main process (Electron safeStorage). These
// thin synchronous wrappers keep the settings-persistence flow synchronous; the
// payloads are tiny and only touched when the login actually changes.
export const encryptToken = (plain: string): string =>
  plain ? ipcRenderer.sendSync(IpcMessage.EncryptString, plain) : plain;

export const decryptToken = (value: string): string =>
  value ? ipcRenderer.sendSync(IpcMessage.DecryptString, value) : value;
