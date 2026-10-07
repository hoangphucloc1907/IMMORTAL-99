import gsap from 'gsap';
import { ReplayStep } from '../game/types';
import { squareToCoords } from '../game/coordinates';
import { resolveShot } from '../experience/shots';
import { DRAMATIC_HOLD_FINAL } from '../experience/pacing';
import { buildSlowApproach } from './slowMotion';
import { buildCameraMove } from './cameraMoves';
import { BuildDeps, StepOptions } from './types';

const QUEEN_TRAVEL = 2.4;
const HOLD_BASE = 4.0;
const TEXT_GAP = 2.0;

/** Real seconds the final position stays untouched before any text (≥ 3s at every speed). */
export function finalHoldSeconds(speed: number): number {
  return Math.max(HOLD_BASE, DRAMATIC_HOLD_FINAL * speed) / speed;
}

/** 44.Qa7 — the queen settles, all motion stops, the camera pulls back, then the text. */
export function buildFinalAnimation(step: ReplayStep, deps: BuildDeps, opts: StepOptions): gsap.core.Timeline {
  const { registry, soundBank, cameraRig, store } = deps;
  const tl = gsap.timeline();
  const queen = registry.getPiece(step.pieceId);
  if (!queen) return tl;

  tl.add(
    buildSlowApproach(queen, squareToCoords(step.to), {
      duration: QUEEN_TRAVEL,
      lift: 0.2,
      reducedMotion: opts.reducedMotion,
    }),
    0,
  );

  // Weighted landing — sound only. Nothing on the board moves after this.
  tl.call(
    () => {
      soundBank.playMove();
      registry.clearAllTransientFx();
    },
    [],
    QUEEN_TRAVEL,
  );

  // The camera alone keeps moving: a slow pull-back over the whole hold (§7: 4s at 1x)
  const hold = Math.max(HOLD_BASE, DRAMATIC_HOLD_FINAL * opts.speed);
  tl.add(buildCameraMove(cameraRig, resolveShot('FINAL_PULLBACK', step.ply, opts.breakpoint), hold), QUEEN_TRAVEL);
  const textTime = QUEEN_TRAVEL + hold;
  tl.to({}, { duration: hold }, QUEEN_TRAVEL);

  tl.call(() => store.getState().setOverlay('BLACK RESIGNS'), [], textTime);
  tl.call(
    () => {
      store.getState().setOverlay('44. Qa7 — 1–0');
      store.getState().setShowEnding(true);
    },
    [],
    textTime + TEXT_GAP,
  );

  return tl;
}
