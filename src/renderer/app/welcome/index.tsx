import { ipcRenderer } from 'electron';
import React, { FunctionComponent, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';

import { IpcMessage } from '../../../constants';
import { VisualizationType } from '../../../models/settings';
import { LoginButton } from '../../components';
import { useSettings } from '../../contexts/settings.context';
import { SettingsActionType } from '../../reducers/settings.reducer';
import wavesImage from '../../static/waves.gif';
import Menu from '../cover/menu';

const WelcomeContent = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  position: absolute;
  height: 100%;
  width: 100%;
  text-align: center;
  background-image: url(${wavesImage});
  background-size: cover;
  transition: 0.2s;
`;

const Brand = styled.h2`
  font-size: 20px;
  display: inline-block;
  color: white;
  text-shadow: 1px 1px 1px #ff0e88;
`;

const BrandHighlight = styled.span`
  font-weight: normal;
  text-shadow: 1px 1px 1px #ef00ff;
`;

const BrandTagLine = styled.div`
  font-size: 10px;
  color: white;
  background-color: black;
  margin: 0.5em;
  padding: 0.5em;
  position: relative;
`;

const WelcomeControls = styled.div`
  opacity: 1;
  display: flex;
  justify-content: center;
  z-index: 2;
  -webkit-app-region: no-drag;
`;

const ClientIdInputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 0.5rem;
  width: 85%;
  max-width: 280px;
  background: rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 0.5rem;
  border-radius: 4px;
  -webkit-app-region: no-drag;
`;

const ClientIdLabel = styled.label`
  color: #ccc;
  font-size: 9px;
  text-transform: uppercase;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
  -webkit-app-region: no-drag;
  cursor: text;
`;

const ClientIdInput = styled.input`
  background: #111;
  border: 1px solid #444;
  color: white;
  padding: 4px;
  font-size: 10px;
  width: 100%;
  text-align: center;
  border-radius: 2px;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  -webkit-app-region: no-drag;
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
  &:focus {
    border-color: #84bd00;
  }
`;

const HelpLink = styled.a`
  color: #84bd00;
  font-size: 9px;
  text-decoration: underline;
  margin-top: 4px;
  cursor: pointer;
  -webkit-app-region: no-drag;
  &:hover {
    color: #a4e010;
  }
`;

const RememberLoginLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #ccc;
  font-size: 10px;
  margin-top: 4px;
  cursor: pointer;
  -webkit-app-region: no-drag;
  user-select: none;
`;

const RememberLoginCheckbox = styled.input`
  cursor: pointer;
  -webkit-app-region: no-drag;
`;

const focusMainWindow = (): void => {
  ipcRenderer.send(IpcMessage.FocusMainWindow);
};

export const Welcome: FunctionComponent = () => {
  const { state, dispatch } = useSettings();
  const { spotifyClientId = '', rememberLogin = true } = state ?? {};
  const clientIdInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    focusMainWindow();
    clientIdInputRef.current?.focus();
  }, []);

  const handleClientIdChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    dispatch({
      type: SettingsActionType.UpdateSettings,
      payload: { spotifyClientId: e.target.value },
    });
  };

  const handleRememberLoginChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    dispatch({
      type: SettingsActionType.UpdateSettings,
      payload: { rememberLogin: e.target.checked },
    });
  };

  const handleInteractiveMouseDown = useCallback((event: React.MouseEvent): void => {
    event.stopPropagation();
    focusMainWindow();
  }, []);

  return (
    <div className="full">
      <Menu isWelcome visualizationType={VisualizationType.None} />
      <WelcomeContent className="welcome-content centered draggable">
        <Brand className="brand draggable">
          lo
          <BrandHighlight className="brand-highlight draggable">fi</BrandHighlight>
        </Brand>
        <BrandTagLine className="brand-tagline draggable">a tiny player</BrandTagLine>
      </WelcomeContent>
      <WelcomeControls
        className="centered controls welcome-controls no-drag"
        style={{ flexDirection: 'column', gap: '4px', alignItems: 'center' }}
        onMouseDown={handleInteractiveMouseDown}>
        <LoginButton />
        <RememberLoginLabel onMouseDown={handleInteractiveMouseDown}>
          <RememberLoginCheckbox
            type="checkbox"
            checked={rememberLogin}
            onChange={handleRememberLoginChange}
          />
          Remember login
        </RememberLoginLabel>
        <ClientIdInputWrapper onMouseDown={handleInteractiveMouseDown}>
          <ClientIdLabel htmlFor="welcome-spotify-client-id">Spotify Client ID</ClientIdLabel>
          <ClientIdInput
            id="welcome-spotify-client-id"
            ref={clientIdInputRef}
            type="text"
            placeholder="Optional client ID"
            value={spotifyClientId}
            onChange={handleClientIdChange}
            onFocus={focusMainWindow}
            onMouseDown={handleInteractiveMouseDown}
            autoFocus
          />
          <HelpLink href="https://developer.spotify.com/dashboard" target="auth" onMouseDown={handleInteractiveMouseDown}>
            Get Client ID (Redirect URI: http://127.0.0.1:41419)
          </HelpLink>
        </ClientIdInputWrapper>
      </WelcomeControls>
    </div>
  );
};
