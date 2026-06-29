// Minimal electron-store stand-in for tests. auth.ts does `new Store(...)` at
// module load and reads `store.get('settings')`; returning undefined makes
// getSpotifyClientId() fall back to the default AUTH_CLIENT_ID. (class-methods-
// use-this is disabled for test files via the eslint override.)
export default class Store {
  get(): unknown {
    return undefined;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  set(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  delete(): void {}

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  clear(): void {}
}
