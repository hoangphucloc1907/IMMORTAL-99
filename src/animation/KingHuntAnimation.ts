import gsap from 'gsap';
import { ReplayStep } from '../game/types';
import { getPacing } from '../experience/pacing';
import { baseMoveLandTime, buildBaseMove } from './MoveTimeline';
import { buildCheckAnimation } from './CheckAnimation';
import { BuildDeps, StepOptions } from './types';

/**
 * Plies 49–70. The attack accelerates: White's checks keep a constant beat while each
 * Black king move gets shorter (pacing.ts: 1.4s → 0.9s). Camera cues come from the
 * choreography table, applied by the Director like every other ply.
 */
export function buildKingHuntAnimation(step: ReplayStep, deps: BuildDeps, opts: StepOptions): gsap.core.Timeline {
  const tl = gsap.timeline();

  const base = buildBaseMove(step, deps, opts);
  if (step.color === 'b' && base.duration() > 0) {
    base.duration(getPacing('KING_HUNT', 'ACT_IV', step.ply).moveDuration);
  }
  tl.add(base, 0);

  if (step.isCheck && step.checkSquare) {
    // the warning lands with the piece, never before it (checking moves are White's, never re-paced)
    tl.add(buildCheckAnimation(step, step.checkSquare, deps, { showLabel: opts.cinematic }), baseMoveLandTime(step));
  }

  return tl;
}
