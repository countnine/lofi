import Store from 'electron-store';
import React, {
  createContext,
  Dispatch,
  FunctionComponent,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import { DEFAULT_SETTINGS, Settings } from '../../models/settings';
import { decryptToken, encryptToken } from '../api/token-storage';
import { SettingsAction, useSettingsReducer } from '../reducers/settings.reducer';

interface SettingsContext {
  state: Settings;
  dispatch: Dispatch<SettingsAction>;
}

interface SettingsStorage {
  settings: Settings;
}

const Context = createContext<SettingsContext>({ state: null, dispatch: null });

export const SettingsProvider: FunctionComponent = ({ children }) => {
  const store = useMemo(
    () =>
      new Store<SettingsStorage>({
        clearInvalidConfig: true,
        defaults: { settings: DEFAULT_SETTINGS },
      }),
    []
  );
  // Decrypt the persisted tokens once on mount; the in-memory state keeps them in
  // plaintext (the Web API needs them), only the stored copy is encrypted.
  const [state, dispatch] = useReducer(useSettingsReducer, undefined, () => {
    const stored = { ...DEFAULT_SETTINGS, ...store.get('settings') };
    return {
      ...stored,
      accessToken: decryptToken(stored.accessToken),
      refreshToken: decryptToken(stored.refreshToken),
    };
  });

  // Cache the last plaintext->ciphertext mapping so a non-token settings change
  // (e.g. the rapid window-position writes during a drag) doesn't re-encrypt — a
  // sync IPC round-trip — on every persist.
  const tokenCipherCache = useRef({ access: { plain: '', cipher: '' }, refresh: { plain: '', cipher: '' } });

  useEffect(() => {
    if (!state) {
      store.set('settings', DEFAULT_SETTINGS);
      return;
    }

    if (state.rememberLogin === false) {
      store.set('settings', { ...state, accessToken: '', refreshToken: '' });
      return;
    }

    const cache = tokenCipherCache.current;
    if (state.accessToken !== cache.access.plain) {
      cache.access = { plain: state.accessToken, cipher: encryptToken(state.accessToken) };
    }
    if (state.refreshToken !== cache.refresh.plain) {
      cache.refresh = { plain: state.refreshToken, cipher: encryptToken(state.refreshToken) };
    }

    store.set('settings', { ...state, accessToken: cache.access.cipher, refreshToken: cache.refresh.cipher });
  }, [state, store]);

  const ctx: SettingsContext = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return <Context.Provider value={ctx}>{children}</Context.Provider>;
};

export const useSettings = (): SettingsContext => useContext(Context);
