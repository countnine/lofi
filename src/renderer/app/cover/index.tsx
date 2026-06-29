/* eslint-disable no-console */
import { ipcRenderer } from 'electron';
import { clamp, throttle } from 'lodash';
import React, { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled, { css } from 'styled-components';

import { IpcMessage, WindowName } from '../../../constants';
import { Settings, VisualizationType } from '../../../models/settings';
import { AccountType, SpotifyApiInstance } from '../../api/spotify-api';
import { WindowPortal } from '../../components';
import { useCurrentlyPlaying } from '../../contexts/currently-playing.context';
import { CurrentlyPlayingActions, CurrentlyPlayingType } from '../../reducers/currently-playing.reducer';
import { TrackInfo } from '../../windows/track-info';
import { Bars } from '../bars';
import { Controls } from './controls';
import Menu from './menu';
import { Visualizer } from './visualizer';
import { Waiting } from './waiting';

const ONE_SECOND_IN_MS = 1000;
const ONE_MINUTE = ONE_SECOND_IN_MS * 60;

// Lower bound on the polling interval, matching the settings slider / zod schema.
const MIN_REFRESH_SECONDS = 1;
// When nothing is playing there is no progress to track (keepAlive still covers
// the premium re-seek), so poll this many times slower.
const PAUSED_POLL_BACKOFF = 3;
// Coalesce rapid scroll-wheel volume changes into at most one API call per window.
const VOLUME_THROTTLE_MS = 200;

const TRUNCATE_REGEX = /(.*?)\s[-(•].*/g;
const truncateText = (text: string): string => text?.replace(TRUNCATE_REGEX, '$1');

const CoverContent = styled.div<{ isPlaying: boolean }>`
  background-size: cover;
  transition: 0.2s;
  display: flex;

  ${({ isPlaying }) =>
    !isPlaying &&
    css`
      transition: 0.1s;
      filter: blur(2px) grayscale(50%);
      transform: scale(1.05);
    `}
`;

interface Props {
  settings: Settings;
  message: string;
  onVisualizationChange: () => void;
  onVisualizationCycle?: (isPrevious: boolean) => void;
}

export const Cover: FunctionComponent<Props> = ({ settings, message, onVisualizationChange, onVisualizationCycle }) => {
  const { state, dispatch } = useCurrentlyPlaying();

  const {
    barThickness,
    barColor,
    isAlwaysShowSongProgress,
    isAlwaysShowTrackInfo,
    showTrackInfoTemporarilyInSeconds,
    isOnLeft,
    size,
    skipSongDelay,
    volumeIncrement,
    visualizationId,
    visualizationType,
    visualizerOpacity,
    trackInfoRefreshTimeInSeconds,
  } = useMemo(() => settings, [settings]);

  const [currentSongId, setCurrentSongId] = useState('');
  const [shouldShowTrackInfo, setShouldShowTrackInfo] = useState(isAlwaysShowTrackInfo);
  const [trackInfoTimer, setTrackInfoTimer] = useState<NodeJS.Timeout | null>(null);
  const [errorToDisplay, setErrorToDisplay] = useState('');

  useEffect(() => setErrorToDisplay(message), [message]);

  useEffect(() => {
    setShouldShowTrackInfo(isAlwaysShowTrackInfo);
  }, [isAlwaysShowTrackInfo]);

  const artist = useMemo(() => truncateText(state.artist), [state.artist]);
  const songTitle = useMemo(() => truncateText(state.track), [state.track]);

  const handlePlaybackChanged = useCallback(async (): Promise<void> => {
    try {
      const currentlyPlaying = await SpotifyApiInstance.getCurrentlyPlaying();
      if (!currentlyPlaying) {
        return;
      }

      dispatch({ type: CurrentlyPlayingActions.SetCurrentlyPlaying, payload: currentlyPlaying });
      setErrorToDisplay('');
    } catch (error) {
      console.error(error);
      setErrorToDisplay((error as Error).message);
    }
  }, [dispatch]);

  const refreshTrackLiked = useCallback(async (): Promise<void> => {
    if (state.type === CurrentlyPlayingType.Track) {
      try {
        const isTrackLiked = await SpotifyApiInstance.isTrackLiked(state.id);
        if (state.isLiked !== isTrackLiked) {
          ipcRenderer.send(IpcMessage.TrackLiked, isTrackLiked);
        }
        dispatch({ type: CurrentlyPlayingActions.SetTrackLiked, payload: isTrackLiked });
        await handlePlaybackChanged();
      } catch (error) {
        console.error(error);
        setErrorToDisplay((error as Error).message);
      }
    }
  }, [dispatch, handlePlaybackChanged, state.id, state.isLiked, state.type]);

  useEffect(() => {
    (async () => {
      if (state.isPlaying) {
        if (state.id !== currentSongId) {
          setCurrentSongId(state.id);
          console.log(`New song '${songTitle}' by '${artist}.`);
          await refreshTrackLiked();
        }

        if (!isAlwaysShowTrackInfo && showTrackInfoTemporarilyInSeconds) {
          setShouldShowTrackInfo(true);

          const timer = setTimeout(() => {
            if (!document.getElementById('visible-ui')?.matches(':hover')) {
              setShouldShowTrackInfo(false);
            }
            setTrackInfoTimer(null);
          }, showTrackInfoTemporarilyInSeconds * ONE_SECOND_IN_MS);

          setTrackInfoTimer(timer);
        }
      }
    })();
  }, [
    artist,
    currentSongId,
    refreshTrackLiked,
    songTitle,
    state.id,
    state.isPlaying,
    isAlwaysShowTrackInfo,
    showTrackInfoTemporarilyInSeconds,
  ]);

  useEffect(() => {
    return () => {
      if (trackInfoTimer) {
        clearTimeout(trackInfoTimer);
      }
    };
  }, [trackInfoTimer]);

  const keepAlive = useCallback(async (): Promise<void> => {
    if (state.isPlaying || state.userProfile?.accountType !== AccountType.Premium) {
      return;
    }

    try {
      const currentlyPlaying = await SpotifyApiInstance.getCurrentlyPlaying();
      if (!currentlyPlaying?.is_playing) {
        await SpotifyApiInstance.seek(state.progress);
      }
    } catch (error) {
      console.error(error);
      setErrorToDisplay((error as Error).message);
    }
  }, [state.isPlaying, state.progress, state.userProfile?.accountType]);

  const changeVolume = useCallback(
    (newVolume: number) => {
      try {
        if (newVolume !== undefined && state.userProfile?.accountType === AccountType.Premium) {
          (async () => {
            await SpotifyApiInstance.setVolume(newVolume);
            await handlePlaybackChanged();

            console.log(`Volume set to ${newVolume}`);
          })();
        }
      } catch (error) {
        console.error(error);
        setErrorToDisplay((error as Error).message);
      }
    },
    [handlePlaybackChanged, state.userProfile?.accountType]
  );

  const handleTrackLiked = useCallback(() => {
    refreshTrackLiked();
  }, [refreshTrackLiked]);

  // The target volume a scroll burst is accumulating toward. Buffered in a ref so
  // a fast scroll moves the full distance instead of repeatedly recomputing from
  // the last-confirmed (and lagging) state.volume.
  const pendingVolumeRef = useRef<number | null>(null);

  // Once the confirmed volume catches up, drop the pending target so the next
  // scroll starts from the real value.
  useEffect(() => {
    pendingVolumeRef.current = null;
  }, [state.volume]);

  const flushVolume = useMemo(
    () =>
      throttle(
        () => {
          if (pendingVolumeRef.current !== null) {
            changeVolume(pendingVolumeRef.current);
          }
        },
        VOLUME_THROTTLE_MS,
        { leading: true, trailing: true }
      ),
    [changeVolume]
  );

  const onMouseWheel = useCallback(
    ({ deltaY }: WheelEvent): void => {
      const direction = Math.sign(deltaY);
      const currentVolume = pendingVolumeRef.current ?? state.volume;
      const newVolume = clamp(currentVolume - direction * volumeIncrement, 0, 100);
      if (newVolume !== currentVolume) {
        pendingVolumeRef.current = newVolume;
        flushVolume();
      }
    },
    [flushVolume, state.volume, volumeIncrement]
  );

  useEffect(() => {
    const element = document.getElementById('visible-ui');
    element?.addEventListener('mousewheel', onMouseWheel);
    return () => {
      element?.removeEventListener('mousewheel', onMouseWheel);
      flushVolume.cancel();
    };
  }, [onMouseWheel, flushVolume]);

  useEffect(() => {
    // Skip polling while the window is hidden (e.g. minimized to tray) and back
    // off when nothing is playing — both cut needless Spotify API calls (429s).
    const baseMs = Math.max(trackInfoRefreshTimeInSeconds, MIN_REFRESH_SECONDS) * ONE_SECOND_IN_MS;
    const intervalMs = state.isPlaying ? baseMs : baseMs * PAUSED_POLL_BACKOFF;
    const listeningToIntervalId = setInterval(() => {
      if (document.hidden) {
        return;
      }
      handlePlaybackChanged();
    }, intervalMs);

    return () => clearInterval(listeningToIntervalId);
  }, [handlePlaybackChanged, trackInfoRefreshTimeInSeconds, state.isPlaying]);

  useEffect(() => {
    const intervalMs = 2 * Math.max(trackInfoRefreshTimeInSeconds, MIN_REFRESH_SECONDS) * ONE_SECOND_IN_MS;
    const refreshTrackLikedIntervalId = setInterval(() => {
      if (document.hidden) {
        return;
      }
      refreshTrackLiked();
    }, intervalMs);

    return () => clearInterval(refreshTrackLikedIntervalId);
  }, [refreshTrackLiked, trackInfoRefreshTimeInSeconds]);

  useEffect(() => {
    const keepAliveIntervalId = setInterval(keepAlive, ONE_MINUTE);
    return () => {
      if (keepAliveIntervalId) {
        clearInterval(keepAliveIntervalId);
      }
    };
  }, [keepAlive]);

  const coverUrl = useMemo(() => state.cover, [state.cover]);

  return (
    <div
      className="transparent"
      onMouseEnter={() => !isAlwaysShowTrackInfo && setShouldShowTrackInfo(true)}
      onMouseLeave={() => !isAlwaysShowTrackInfo && !trackInfoTimer && setShouldShowTrackInfo(false)}>
      <Menu
        onVisualizationChange={onVisualizationChange}
        onVisualizationCycle={onVisualizationCycle}
        visualizationType={visualizationType}
      />
      {state.id ? (
        <>
          {shouldShowTrackInfo && (
            <WindowPortal name={WindowName.TrackInfo} features={{ focusable: false }}>
              <TrackInfo track={songTitle} artist={artist} isOnLeft={isOnLeft} message={errorToDisplay || message} />
            </WindowPortal>
          )}
          <CoverContent
            className="full"
            isPlaying={state.isPlaying}
            style={coverUrl ? { backgroundImage: `url(${coverUrl})` } : {}}
          />
          {visualizationType === VisualizationType.Small && (
            <Visualizer
              key={visualizationId}
              visualizationId={visualizationId}
              visualizerOpacity={visualizerOpacity}
              size={{ height: size, width: size }}
            />
          )}
          <Bars barThickness={barThickness} barColor={barColor} alwaysShowProgress={isAlwaysShowSongProgress} />
          <Controls
            skipSongDelay={skipSongDelay}
            onTrackLiked={handleTrackLiked}
            onPlaybackChanged={handlePlaybackChanged}
            onError={setErrorToDisplay}
          />
        </>
      ) : (
        <Waiting />
      )}
    </div>
  );
};
