import gsap from 'gsap';
import { ReplayStep, Square } from '../game/types';
import { squareToCoords } from '../game/coordinates';
import { getTension } from '../experience/tension';
import { BuildDeps } from './types';

// Only the first three checks carry the word "CHECK"; later checks rely on pulse + sound
export const CHECK_LABEL_PLIES = [39, 49, 51]; // 20.Qf4+, 25.Re7+, 26.Qxd4+
const CHECK_DURATION = 1.4;

export function buildCheckAnimation(
  step: ReplayStep,
  kingSquare: Square,
  deps: BuildDeps,
  opts: { showLabel: boolean },
): gsap.core.Timeline {
  const { registry, soundBank, store } = deps;
  const tl = gsap.timeline();
  const tension = getTension(step.ply);
  const kingCoords = squareToCoords(kingSquare);
  const attackerCoords = squareToCoords(step.to);
  const showLabel = opts.showLabel && CHECK_LABEL_PLIES.includes(step.ply);

  // 1. Sound, pulse on the checked king, thin attack line
  tl.call(
    () => {
      soundBank.playCheck(tension);
      registry.checkPulse.show(kingCoords, tension);
      registry.attackLine.setEndpoints(attackerCoords, kingCoords);
      if (showLabel) store.getState().setOverlay('CHECK');
    },
    [],
    0,
  );

  // 2. Pulse and line fade
  tl.to(
    {},
    {
      duration: CHECK_DURATION,
      onUpdate: function () {
        registry.checkPulse.setProgress(this.progress());
        registry.attackLine.setProgress(this.progress());
      },
      onComplete: () => {
        if (showLabel) store.getState().setOverlay(null);
      },
    },
    0,
  );

  return tl;
}
