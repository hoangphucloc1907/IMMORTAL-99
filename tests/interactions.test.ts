import { describe, it, expect, vi } from 'vitest';
import { parseInitialUrl, buildShareUrl } from '../src/app/deepLink';
import { triggerHaptic } from '../src/audio/haptics';
import { validateChallengeMove, SACRIFICE_CHALLENGE_PLY } from '../src/game/challenge';
import { globalReplayStore } from '../src/store/replayStore';

describe('Interactions & Sharing Full Integration (Group D)', () => {
  it('parses deep links and builds shareable URLs', () => {
    const urlState = parseInitialUrl('?ply=55&mode=study');
    expect(urlState.ply).toBe(55);
    expect(urlState.mode).toBe('study');

    const shareUrl = buildShareUrl(urlState.ply, urlState.mode, 'https://chess.immortal99.com');
    expect(shareUrl).toBe('https://chess.immortal99.com?ply=55&mode=study');
  });

  it('triggers mobile haptics safely across events and respects reduced-effects', () => {
    const vibrateMock = vi.fn();
    const originalNavigator = global.navigator;
    Object.defineProperty(global, 'navigator', {
      value: { vibrate: vibrateMock },
      configurable: true,
      writable: true,
    });

    triggerHaptic('move', 'full');
    expect(vibrateMock).toHaveBeenCalledWith(15);

    triggerHaptic('capture', 'full');
    expect(vibrateMock).toHaveBeenCalledWith(35);

    triggerHaptic('check', 'full');
    expect(vibrateMock).toHaveBeenCalledWith([25, 30, 25]);

    triggerHaptic('sacrifice', 'full');
    expect(vibrateMock).toHaveBeenCalledWith([40, 50, 40, 50, 80]);

    vibrateMock.mockClear();
    triggerHaptic('sacrifice', 'reduced');
    expect(vibrateMock).not.toHaveBeenCalled();

    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('validates challenge moves and toggles challenge active state', () => {
    expect(SACRIFICE_CHALLENGE_PLY).toBe(46);
    expect(validateChallengeMove('d1', 'd4')).toBe(true);
    expect(validateChallengeMove('d1', 'c1')).toBe(false);

    const store = globalReplayStore;
    store.getState().setChallengeActive(true);
    expect(store.getState().challengeActive).toBe(true);

    store.getState().setChallengeActive(false);
    expect(store.getState().challengeActive).toBe(false);
  });

  it('controls Photo Mode state and UI suppression', () => {
    const store = globalReplayStore;
    store.getState().setPhotoMode(true);
    expect(store.getState().isPhotoMode).toBe(true);

    store.getState().setPhotoMode(false);
    expect(store.getState().isPhotoMode).toBe(false);
  });
});
