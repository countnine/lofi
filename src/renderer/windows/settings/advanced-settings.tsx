import React, { FunctionComponent } from 'react';
import { useFormContext } from 'react-hook-form';
import styled from 'styled-components';

import { DEFAULT_SETTINGS, Settings } from '../../../models/settings';
import { FieldSet, FormGroup, Label, Legend, RangeValue, Row, Slider, StyledCheckbox } from '../../components';
import { INPUT_COLOR } from '../../components/mantine.styled';

const TextInput = styled.input`
  background: #2b2b2b;
  border: 1px solid #444;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  width: 100%;
  margin-top: 4px;
  font-family: inherit;
  font-size: 12px;
  outline: none;
  box-sizing: border-box;
  &:focus {
    border-color: #be4bdb;
  }
`;

export const AdvancedSettings: FunctionComponent = () => {
  const { register, watch } = useFormContext<Settings>();

  const refreshTimeWatch = watch('trackInfoRefreshTimeInSeconds');

  return (
    <FormGroup>
      <FieldSet>
        <Legend>Advanced</Legend>
        <Row>
          <StyledCheckbox
            color={INPUT_COLOR}
            label="Use hardware acceleration (requires restart)"
            size="xs"
            {...register('isUsingHardwareAcceleration')}
          />
        </Row>
        <Row>
          <StyledCheckbox color={INPUT_COLOR} label="Enable dev tools" size="xs" {...register('isDebug')} />
        </Row>
        <Row>
          <StyledCheckbox
            color={INPUT_COLOR}
            label="Remember login on restart"
            size="xs"
            {...register('rememberLogin')}
          />
        </Row>
        <Row>
          <StyledCheckbox
            color={INPUT_COLOR}
            label="Close to tray (keep running in the background)"
            size="xs"
            {...register('isCloseToTray')}
          />
        </Row>
        <Row style={{ marginBottom: '1rem' }}>
          <Label>
            API Polling Interval (Seconds)
            <Slider
              type="range"
              min={1}
              max={10}
              step={1}
              defaultValue={DEFAULT_SETTINGS.trackInfoRefreshTimeInSeconds}
              {...register('trackInfoRefreshTimeInSeconds', { required: true, valueAsNumber: true })}
            />
            <RangeValue>{refreshTimeWatch}</RangeValue>
          </Label>
        </Row>
        <Row style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
          <Label htmlFor="spotifyClientId" style={{ width: '100%' }}>
            Spotify Client ID
          </Label>
          <TextInput
            id="spotifyClientId"
            type="text"
            placeholder="Optional (falls back to default)"
            {...register('spotifyClientId')}
          />
        </Row>
      </FieldSet>
    </FormGroup>
  );
};
