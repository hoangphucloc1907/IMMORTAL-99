import gsap from 'gsap';
import { ReplayStep } from '../game/types';
import { BoardCoord, squareToCoords } from '../game/coordinates';
import { resolveShot } from '../experience/shots';
import { trayPosition } from '../experience/capturedTray';
import { DRAMATIC_HOLD_SACRIFICE } from '../experience/pacing';
import { buildSlowApproach } from './slowMotion';
import { buildCameraMove } from './cameraMoves';
import { BuildDeps, StepOptions } from './types';

// M4 review: the first cut felt slow — pre-roll 3.0s → 2.2s, pause 2.5s → 2.0s (floor stays 1.5s)
const OVERLAY_START = 0.2;
const OVERLAY_END = 1.1;
const TITLE_START = 1.2; // the title card replaces the overlay — never both on screen
const TITLE_END = 2.1;
const ROOK_START = 2.2;
const ROOK_TRAVEL = 1.6;
const DISSOLVE = 0.6;
const PAUSE_BASE = 1.6; // 2nd review: 2.0s still felt long — the reveal below now fills it
const REVEAL_LEAD = 0.3; // the reveal begins while the pawn is still dissolving

// Lines of force revealed during the pause: the open e-file for the second rook and the
// d4–a7 diagonal toward the king. A hint at the idea, never the moves themselves.
const FORCE_LINES: Array<[BoardCoord, BoardCoord]> = [
  [squareToCoords('e1'), squareToCoords('e7')],
  [squareToCoords('d4'), squareToCoords('a7')],
];

/** Real seconds of the dramatic pause after impact at a given speed (floor ≥ 1.5s). */
export function sacrificeHoldSeconds(speed: number): number {
  return Math.max(PAUSE_BASE, DRAMATIC_HOLD_SACRIFICE * speed) / speed;
}

/**
 * 24.Rxd4!! — carried by silence, pacing, light and camera focus, not destruction.
 * Lighting (Act III preset: dark periphery + spot on the d-file) is eased in by the Director.
 */
export function buildSacrificeAnimation(step: ReplayStep, deps: BuildDeps, opts: StepOptions): gsap.core.Timeline {
  const { registry, soundBank, cameraRig, store } = deps;
  const tl = gsap.timeline();
  const rook = registry.getPiece(step.pieceId);
  const pawn = step.capturedId ? registry.getPiece(step.capturedId) : undefined;
  if (!rook) return tl;

  // 1. Pre-roll: silence, camera low behind the rook (d4 stays in frame)
  tl.call(
    () => {
      cameraRig.applyShot(resolveShot('LOW_ANGLE', step.ply, opts.breakpoint), !opts.reducedMotion);
    },
    [],
    0,
  );

  // 2. "24. Rxd4!!" → then the Act III title card, strictly one after the other
  tl.call(() => store.getState().setOverlay('24. Rxd4!!'), [], OVERLAY_START);
  tl.call(() => store.getState().setOverlay(null), [], OVERLAY_END);
  tl.call(() => store.getState().setActTitleCard('III · THE SACRIFICE'), [], TITLE_START);
  tl.call(() => store.getState().setActTitleCard(null), [], TITLE_END);

  // 3. The rook d1 → d4, slowing right before contact
  tl.add(
    buildSlowApproach(rook, squareToCoords(step.to), {
      duration: ROOK_TRAVEL,
      lift: 0.22,
      reducedMotion: opts.reducedMotion,
    }),
    ROOK_START,
  );

  const impact = ROOK_START + ROOK_TRAVEL;
  tl.call(() => soundBank.playSacrifice(), [], impact);

  // 4. The d4 pawn dissolves quietly — no particles, no shake
  if (pawn && step.capturedId) {
    const capturedId = step.capturedId;
    tl.to(
      {},
      {
        duration: DISSOLVE,
        onUpdate: function () {
          registry.disintegrate.applyToMesh(pawn, this.progress());
        },
        onComplete: () => {
          const tray = trayPosition(capturedId, step.ply);
          pawn.position.set(tray.x, 0, tray.z);
          registry.disintegrate.reset(pawn);
        },
      },
      impact,
    );
  }

  // 5. The pause is a reveal, not a wait (M4 review: an empty hold felt slow). Starting while the
  //    pawn dissolves: the camera pulls back from the low angle to show the whole idea, the lines
  //    of force draw themselves toward e7 and a7, and two low heartbeats mark the silence.
  const pauseStart = impact + DISSOLVE;
  const pause = Math.max(PAUSE_BASE, DRAMATIC_HOLD_SACRIFICE * opts.speed);
  const end = pauseStart + pause;
  const revealStart = impact + REVEAL_LEAD;
  const reveal = resolveShot('REVEAL_PULL', step.ply, opts.breakpoint); // resting shot of ply 47

  tl.add(buildCameraMove(cameraRig, reveal, end - revealStart), revealStart);

  const draw = Math.min(0.9, (end - revealStart) * 0.5);
  const fadeOut = Math.min(0.4, pause / 4);
  tl.call(() => registry.forceLines.show(FORCE_LINES), [], revealStart);
  tl.to(
    {},
    {
      duration: draw,
      ease: 'power2.out',
      onUpdate: function () {
        registry.forceLines.setDrawProgress(this.ratio);
        registry.forceLines.setOpacity(0.4 * this.ratio);
      },
    },
    revealStart,
  );
  tl.to(
    {},
    {
      duration: fadeOut,
      onUpdate: function () {
        registry.forceLines.setOpacity(0.4 * (1 - this.progress()));
      },
      onComplete: () => registry.forceLines.clear(),
    },
    end - fadeOut,
  );

  tl.call(() => soundBank.playHeartbeat(0.7), [], revealStart + 0.2);
  tl.call(() => soundBank.playHeartbeat(0.5), [], revealStart + 0.75);

  tl.to({}, { duration: pause }, pauseStart);

  return tl;
}
