import { AuthData, getAuthUrl, refreshAccessToken, scopesMatch, setTokenRetrievedCallback } from './auth';

// The full set of scopes auth.ts requires (kept in sync with AUTH_SCOPES).
const ALL_SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-private',
  'user-library-read',
  'user-library-modify',
  'user-read-email',
].join(' ');

describe('scopesMatch', () => {
  it('accepts a scope string containing every required scope', () => {
    expect(scopesMatch(ALL_SCOPES)).toBe(true);
  });

  it('is order-independent and tolerates extra scopes', () => {
    const shuffled = `extra-scope ${ALL_SCOPES.split(' ').reverse().join(' ')}`;
    expect(scopesMatch(shuffled)).toBe(true);
  });

  it('rejects when a required scope is missing', () => {
    const missingOne = ALL_SCOPES.split(' ').slice(1).join(' ');
    expect(scopesMatch(missingOne)).toBe(false);
  });

  it('rejects an empty or undefined scope string', () => {
    expect(scopesMatch('')).toBe(false);
    expect(scopesMatch(undefined as unknown as string)).toBe(false);
  });
});

describe('getAuthUrl', () => {
  it('includes the client id, PKCE challenge and all scopes', () => {
    const url = getAuthUrl('my-client-id');
    expect(url).toContain('client_id=my-client-id');
    expect(url).toContain('code_challenge=');
    expect(url).toContain('code_challenge_method=S256');
    ALL_SCOPES.split(' ').forEach((scope) => expect(url).toContain(scope));
  });

  it('does not mutate the required-scope order across calls', () => {
    // A regression guard: scopesMatch must keep working after getAuthUrl runs
    // (an earlier bug sorted AUTH_SCOPES in place inside scopesMatch).
    getAuthUrl('a');
    getAuthUrl('b');
    expect(scopesMatch(ALL_SCOPES)).toBe(true);
  });
});

describe('refreshAccessToken', () => {
  let retrieved: AuthData | null | undefined;
  const mockFetch = jest.fn();

  const respondWith = (status: number, json: unknown): void => {
    mockFetch.mockResolvedValue({ status, json: async () => json });
  };

  beforeAll(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    // The callback the renderer normally registers; capture what auth hands back.
    setTokenRetrievedCallback((data) => {
      retrieved = data;
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;
  });

  afterAll(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    retrieved = undefined;
    mockFetch.mockReset();
  });

  it('carries the existing refresh token over when Spotify omits it', async () => {
    respondWith(200, { access_token: 'new-access', scope: ALL_SCOPES });

    await refreshAccessToken('original-refresh');

    expect(retrieved).not.toBeNull();
    expect(retrieved?.access_token).toBe('new-access');
    expect(retrieved?.refresh_token).toBe('original-refresh');
  });

  it('uses the returned refresh token when Spotify provides one', async () => {
    respondWith(200, { access_token: 'new-access', refresh_token: 'rotated', scope: ALL_SCOPES });

    await refreshAccessToken('original-refresh');

    expect(retrieved?.refresh_token).toBe('rotated');
  });

  it('clears the login (null) when the scopes no longer match', async () => {
    respondWith(200, { access_token: 'x', refresh_token: 'y', scope: 'user-read-email' });

    await refreshAccessToken('original-refresh');

    expect(retrieved).toBeNull();
  });

  it('clears the login (null) when the refresh token is invalid', async () => {
    respondWith(400, { error: 'invalid_grant', error_description: 'revoked' });

    await refreshAccessToken('original-refresh');

    expect(retrieved).toBeNull();
  });

  it('preserves the login on a transient server (5xx) error', async () => {
    respondWith(503, { error: 'server_error' });

    await refreshAccessToken('original-refresh');

    // Callback must NOT fire, so the renderer never resets the saved tokens.
    expect(retrieved).toBeUndefined();
  });

  it('preserves the login on a network failure', async () => {
    mockFetch.mockRejectedValue(new Error('offline'));

    await refreshAccessToken('original-refresh');

    expect(retrieved).toBeUndefined();
  });
});
