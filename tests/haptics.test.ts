import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { triggerHaptic } from '../src/audio/haptics';
import { SoundBank } from '../src/audio/soundBank';

describe('Mobile Haptics Engine (Group D - Item 13)', () => {
  const originalNavigator = global.navigator;
  let vibrateMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vibrateMock = vi.fn();
    Object.defineProperty(global, 'navigator', {
      value: { vibrate: vibrateMock },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it('triggers move, capture, check, and sacrifice vibration patterns', () => {
    triggerHaptic('move', 'full');
    expect(vibrateMock).toHaveBeenCalledWith(15);

    triggerHaptic('capture', 'full');
    expect(vibrateMock).toHaveBeenCalledWith(35);

    triggerHaptic('check', 'full');
    expect(vibrateMock).toHaveBeenCalledWith([25, 30, 25]);

    triggerHaptic('sacrifice', 'full');
    expect(vibrateMock).toHaveBeenCalledWith([40, 50, 40, 50, 80]);
  });

  it('bypasses vibration when effectsLevel is reduced', () => {
    triggerHaptic('sacrifice', 'reduced');
    expect(vibrateMock).not.toHaveBeenCalled();
  });
  // The real call path: the sound bank vibrates with the board sounds, and reduced effects silences it
  it('the sound bank respects the haptics level the app sets from the store', () => {
    const bank = new SoundBank();
    bank.playMove();
    bank.playCheck();
    expect(vibrateMock).toHaveBeenCalledTimes(2);

    vibrateMock.mockClear();
    bank.setHapticsLevel('reduced');
    bank.playMove();
    bank.playCapture();
    bank.playCheck();
    bank.playSacrifice();
    expect(vibrateMock).not.toHaveBeenCalled();
  });
});
