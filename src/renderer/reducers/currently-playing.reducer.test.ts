import {
  CurrentlyPlayingActions,
  CurrentlyPlayingType,
  INITIAL_STATE,
  useCurrentlyPlayingReducer,
} from './currently-playing.reducer';

// Build a Spotify "currently playing" payload; itemOverrides is shallow-merged
// onto a valid track item, rest onto the top-level object.
const makePayload = (itemOverrides: Record<string, unknown> = {}, rest: Record<string, unknown> = {}): any => ({
  progress_ms: 1000,
  is_playing: true,
  device: { volume_percent: 55 },
  item: {
    id: 'track-1',
    type: 'track',
    name: 'Song Name',
    artists: [{ name: 'Artist A' }, { name: 'Artist B' }],
    album: { images: [{ url: 'album-cover.jpg' }] },
    images: [],
    duration_ms: 200000,
    description: '',
    ...itemOverrides,
  },
  ...rest,
});

describe('useCurrentlyPlayingReducer', () => {
  it('returns same state for an unknown action', () => {
    const next = useCurrentlyPlayingReducer(INITIAL_STATE, { type: 'nope' } as any);
    expect(next).toBe(INITIAL_STATE);
  });

  it('SetCurrentlyPlaying with null payload keeps state', () => {
    const next = useCurrentlyPlayingReducer(INITIAL_STATE, {
      type: CurrentlyPlayingActions.SetCurrentlyPlaying,
      payload: null as any,
    });
    expect(next).toBe(INITIAL_STATE);
  });

  it('SetCurrentlyPlaying with no item keeps state', () => {
    const next = useCurrentlyPlayingReducer(INITIAL_STATE, {
      type: CurrentlyPlayingActions.SetCurrentlyPlaying,
      payload: makePayload({}, { item: null }),
    });
    expect(next).toBe(INITIAL_STATE);
  });

  it('SetCurrentlyPlaying maps a track payload onto state', () => {
    const next = useCurrentlyPlayingReducer(INITIAL_STATE, {
      type: CurrentlyPlayingActions.SetCurrentlyPlaying,
      payload: makePayload(),
    });
    expect(next.id).toBe('track-1');
    expect(next.type).toBe(CurrentlyPlayingType.Track);
    expect(next.track).toBe('Song Name');
    expect(next.artist).toBe('Artist A, Artist B');
    expect(next.progress).toBe(1000);
    expect(next.duration).toBe(200000);
    expect(next.isPlaying).toBe(true);
    expect(next.cover).toBe('album-cover.jpg');
    expect(next.volume).toBe(55);
  });

  it('SetCurrentlyPlaying falls back to item images when album has none', () => {
    const next = useCurrentlyPlayingReducer(INITIAL_STATE, {
      type: CurrentlyPlayingActions.SetCurrentlyPlaying,
      payload: makePayload({ album: { images: [] }, images: [{ url: 'episode-cover.jpg' }] }),
    });
    expect(next.cover).toBe('episode-cover.jpg');
  });

  it('SetUserProfile sets the user profile', () => {
    const profile = { name: 'Jay' } as any;
    const next = useCurrentlyPlayingReducer(INITIAL_STATE, {
      type: CurrentlyPlayingActions.SetUserProfile,
      payload: profile,
    });
    expect(next.userProfile).toBe(profile);
  });

  it('SetTrackLiked sets isLiked', () => {
    const next = useCurrentlyPlayingReducer(INITIAL_STATE, {
      type: CurrentlyPlayingActions.SetTrackLiked,
      payload: true,
    });
    expect(next.isLiked).toBe(true);
  });
});
