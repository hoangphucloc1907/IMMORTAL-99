import gsap from 'gsap';
import { ReplayStep } from '../game/types';
import { squareToCoords } from '../game/coordinates';
import { buildCaptureAnimation, CAPTURE_HIT_TIME } from './CaptureAnimation';
import { BuildDeps, StepOptions } from './types';

const LIFT_DURATION = 0.15;
const TRAVEL_DURATION = 0.35;
const LAND_DURATION = 0.15;
export const MOVE_DURATION = LIFT_DURATION + TRAVEL_DURATION + LAND_DURATION; // 0.65s

export function buildMoveTimeline(step: ReplayStep, deps: BuildDeps, opts: StepOptions): gsap.core.Timeline {
  const { registry, soundBank } = deps;
  const tl = gsap.timeline();
  const movingPiece = registry.getPiece(step.pieceId);
  if (!movingPiece) return tl;

  const toCoords = squareToCoords(step.to);
  const landStart = LIFT_DURATION + TRAVEL_DURATION;
  // Deterministic ±8° turn per ply, so every viewing of the game is identical
  const rotateAngle = ((((step.ply * 37) % 17) - 8) * Math.PI) / 180;

  // 1. Lift
  tl.to(movingPiece.position, { y: 0.28, duration: LIFT_DURATION, ease: 'power1.out' }, 0);
  tl.to(movingPiece.rotation, { y: rotateAngle, duration: LIFT_DURATION, ease: 'power1.out' }, 0);

  // 2. Horizontal travel to target
  tl.to(movingPiece.position, { x: toCoords.x, z: toCoords.z, duration: landStart, ease: 'power2.inOut' }, 0);

  // 3. Soft landing
  tl.to(
    movingPiece.position,
    {
      y: 0,
      duration: LAND_DURATION,
      ease: 'power2.out',
      onComplete: () => {
        soundBank.playMove();
        if (opts.effectsLevel === 'full') {
          registry.impact.trigger(toCoords);
        }
      },
    },
    landStart,
  );
  tl.to(movingPiece.rotation, { y: 0, duration: LAND_DURATION, ease: 'power2.out' }, landStart);

  // Very light board response at the landing square
  if (opts.effectsLevel === 'full') {
    tl.to(
      {},
      {
        duration: 0.3,
        onUpdate: function () {
          registry.impact.setProgress(this.progress());
        },
      },
      MOVE_DURATION,
    );
  }

  // Castling: the rook travels alongside the king
  if (step.castle && step.rookMove) {
    const rookPiece = registry.getPiece(step.rookMove.id);
    if (rookPiece) {
      const rookTo = squareToCoords(step.rookMove.to);
      tl.to(rookPiece.position, { x: rookTo.x, z: rookTo.z, duration: MOVE_DURATION * 0.9, ease: 'power2.inOut' }, 0.1);
    }
  }

  return tl;
}

/** Plain move or capture: the shared base every step timeline builds on. */
export function buildBaseMove(step: ReplayStep, deps: BuildDeps, opts: StepOptions): gsap.core.Timeline {
  return step.capturedId ? buildCaptureAnimation(step, deps, opts) : buildMoveTimeline(step, deps, opts);
}

/** When the moving piece touches its destination square (for onLand camera cues). */
export function baseMoveLandTime(step: ReplayStep): number {
  return step.capturedId ? CAPTURE_HIT_TIME : MOVE_DURATION;
}
