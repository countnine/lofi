import { DEFAULT_SETTINGS, VisualizationType } from '../../models/settings';
import { SettingsActionType, useSettingsReducer } from './settings.reducer';

const base = DEFAULT_SETTINGS;

describe('useSettingsReducer', () => {
  it('returns the same state for an unknown action', () => {
    const next = useSettingsReducer(base, { type: 'nope' } as any);
    expect(next).toBe(base);
  });

  it('SetVisualization sets visualizationId', () => {
    const next = useSettingsReducer(base, { type: SettingsActionType.SetVisualization, payload: 3 });
    expect(next.visualizationId).toBe(3);
    expect(base.visualizationId).toBe(DEFAULT_SETTINGS.visualizationId); // no mutation
  });

  it('SetVisualizationType sets visualizationType', () => {
    const next = useSettingsReducer(base, {
      type: SettingsActionType.SetVisualizationType,
      payload: VisualizationType.Big,
    });
    expect(next.visualizationType).toBe(VisualizationType.Big);
  });

  it('SetWindowPos sets x and y', () => {
    const next = useSettingsReducer(base, { type: SettingsActionType.SetWindowPos, payload: { x: 12, y: 34 } });
    expect(next.x).toBe(12);
    expect(next.y).toBe(34);
  });

  it('SetSize sets size', () => {
    const next = useSettingsReducer(base, { type: SettingsActionType.SetSize, payload: 200 });
    expect(next.size).toBe(200);
  });

  it('SetIsOnLeft sets isOnLeft', () => {
    const next = useSettingsReducer(base, { type: SettingsActionType.SetIsOnLeft, payload: true });
    expect(next.isOnLeft).toBe(true);
  });

  it('SetTokens copies access_token/refresh_token onto state', () => {
    const next = useSettingsReducer(base, {
      type: SettingsActionType.SetTokens,
      payload: { access_token: 'a-tok', refresh_token: 'r-tok' },
    });
    expect(next.accessToken).toBe('a-tok');
    expect(next.refreshToken).toBe('r-tok');
  });

  it('ResetTokens clears tokens to empty strings', () => {
    const withTokens = { ...base, accessToken: 'a', refreshToken: 'r' };
    const next = useSettingsReducer(withTokens, { type: SettingsActionType.ResetTokens });
    expect(next.accessToken).toBe('');
    expect(next.refreshToken).toBe('');
  });

  it('UpdateSettings shallow-merges the payload', () => {
    const next = useSettingsReducer(base, {
      type: SettingsActionType.UpdateSettings,
      payload: { size: 250, isOnLeft: true },
    });
    expect(next.size).toBe(250);
    expect(next.isOnLeft).toBe(true);
    expect(next.visualizationId).toBe(base.visualizationId);
  });
});
