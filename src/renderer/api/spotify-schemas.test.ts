import { likedTracksSchema, spotifyAccountSchema, spotifyCurrentlyPlayingSchema } from './spotify-schemas';

describe('spotifyCurrentlyPlayingSchema', () => {
  const track = {
    device: { volume_percent: 55 },
    progress_ms: 1000,
    is_playing: true,
    item: {
      id: 'track-1',
      type: 'track',
      name: 'Song Name',
      artists: [{ name: 'Artist A' }, { name: 'Artist B' }],
      album: { name: 'Album', images: [{ url: 'cover.jpg', height: 640, width: 640 }] },
      duration_ms: 200000,
    },
  };

  it('accepts a valid track payload', () => {
    expect(spotifyCurrentlyPlayingSchema.safeParse(track).success).toBe(true);
  });

  it('accepts an episode payload (no album/artists, item images + description)', () => {
    const episode = {
      device: { volume_percent: 30 },
      progress_ms: 500,
      is_playing: true,
      item: {
        id: 'ep-1',
        type: 'episode',
        name: 'Episode',
        description: 'desc',
        images: [{ url: 'ep-cover.jpg' }],
        duration_ms: 999,
      },
    };
    expect(spotifyCurrentlyPlayingSchema.safeParse(episode).success).toBe(true);
  });

  it('accepts a sparse ad-like item', () => {
    const ad = { device: { volume_percent: 0 }, is_playing: true, item: { type: 'ad' } };
    expect(spotifyCurrentlyPlayingSchema.safeParse(ad).success).toBe(true);
  });

  it('accepts a null item and a null volume_percent', () => {
    const result = spotifyCurrentlyPlayingSchema.safeParse({
      device: { volume_percent: null as any },
      is_playing: false,
      item: null as any,
    });
    expect(result.success).toBe(true);
  });

  it('keeps unknown fields via passthrough', () => {
    const result = spotifyCurrentlyPlayingSchema.safeParse({ ...track, shuffle_state: true });
    expect(result.success && (result.data as Record<string, unknown>).shuffle_state).toBe(true);
  });

  it('rejects a missing device', () => {
    expect(spotifyCurrentlyPlayingSchema.safeParse({ is_playing: true, item: null as any }).success).toBe(false);
  });

  it('rejects a wrong-typed volume_percent', () => {
    const bad = { device: { volume_percent: 'loud' }, is_playing: true, item: null as any };
    expect(spotifyCurrentlyPlayingSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an error object slipping through with a 200', () => {
    const errorBody = { error: { status: 502, message: 'Bad gateway' } };
    expect(spotifyCurrentlyPlayingSchema.safeParse(errorBody).success).toBe(false);
  });
});

describe('spotifyAccountSchema', () => {
  it('accepts a typical profile', () => {
    const profile = {
      id: 'user-1',
      product: 'premium',
      email: 'a@b.com',
      display_name: 'Jay',
      images: [{ url: 'avatar.jpg' }],
    };
    expect(spotifyAccountSchema.safeParse(profile).success).toBe(true);
  });

  it('accepts a profile missing optional scopes (email/display_name/images)', () => {
    expect(spotifyAccountSchema.safeParse({ id: 'u', product: 'free' }).success).toBe(true);
  });

  it('rejects a non-object', () => {
    expect(spotifyAccountSchema.safeParse('nope').success).toBe(false);
  });
});

describe('likedTracksSchema', () => {
  it('accepts a boolean array', () => {
    expect(likedTracksSchema.safeParse([true]).success).toBe(true);
    expect(likedTracksSchema.safeParse([]).success).toBe(true);
  });

  it('rejects a non-boolean array', () => {
    expect(likedTracksSchema.safeParse(['yes']).success).toBe(false);
  });
});
