export type HapticAction = 'move' | 'capture' | 'check' | 'sacrifice';

const HAPTIC_PATTERNS: Record<HapticAction, number | number[]> = {
  move: 15,
  capture: 35,
  check: [25, 30, 25],
  sacrifice: [40, 50, 40, 50, 80],
};

export function triggerHaptic(action: HapticAction, effectsLevel: 'full' | 'reduced' = 'full'): void {
  if (effectsLevel === 'reduced') return;
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;

  try {
    const pattern = HAPTIC_PATTERNS[action];
    navigator.vibrate(pattern);
  } catch {
    // Non-blocking fallback for restricted environments
  }
}
