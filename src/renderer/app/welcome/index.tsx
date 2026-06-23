import React, { FunctionComponent } from 'react';
import styled from 'styled-components';

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
  opacity: 0;
  display: flex;
  justify-content: center;
  z-index: 2;
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
`;

const ClientIdLabel = styled.label`
  color: #ccc;
  font-size: 9px;
  text-transform: uppercase;
  margin-bottom: 4px;
  letter-spacing: 0.5px;
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
  &:hover {
    color: #a4e010;
  }
`;

export const Welcome: FunctionComponent = () => {
  const { state, dispatch } = useSettings();
  const spotifyClientId = state?.spotifyClientId ?? '';

  const handleClientIdChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value;
    dispatch({
      type: SettingsActionType.UpdateSettings,
      payload: { spotifyClientId: val },
    });
  };

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
        className="centered controls draggable"
        style={{ flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
        <LoginButton />
        <ClientIdInputWrapper>
          <ClientIdLabel>Spotify Client ID</ClientIdLabel>
          <ClientIdInput
            type="text"
            placeholder="Optional client ID"
            value={spotifyClientId}
            onChange={handleClientIdChange}
          />
          <HelpLink href="https://developer.spotify.com/dashboard" target="auth">
            Get Client ID (Redirect URI: http://127.0.0.1:41419)
          </HelpLink>
        </ClientIdInputWrapper>
      </WelcomeControls>
    </div>
  );
};
