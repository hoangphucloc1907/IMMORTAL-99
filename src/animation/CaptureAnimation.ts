import gsap from 'gsap';
import { ReplayStep } from '../game/types';
import { squareToCoords } from '../game/coordinates';
import { SACRIFICE_PLY } from '../game/moveClassifier';
import { trayPosition } from '../experience/capturedTray';
import { isBulletTimePly, buildBulletTimeCamera } from './bulletTime';
import { BuildDeps, StepOptions } from './types';

const CAPTURE_DURATION = 0.9;
export const CAPTURE_HIT_TIME = CAPTURE_DURATION * 0.85;

// 24...cxd4: Topalov takes the rook. A heavy beat carried by sound alone — no dust, no shake.
const SACRIFICE_ACCEPTED_PLY = SACRIFICE_PLY + 1;

export function buildCaptureAnimation(step: ReplayStep, deps: BuildDeps, opts: StepOptions): gsap.core.Timeline {
  const { registry, soundBank, cameraRig } = deps;
  const tl = gsap.timeline();
  const movingPiece = registry.getPiece(step.pieceId);
  const capturedPiece = step.capturedId ? registry.getPiece(step.capturedId) : undefined;
  if (!movingPiece) return tl;

  const toCoords = squareToCoords(step.to);
  const heavy = step.ply === SACRIFICE_ACCEPTED_PLY;
  const allowDust = opts.effectsLevel === 'full' && !heavy;
  // Section 7: shake only for captures inside the hunt / major attacks, never at the sacrifice
  const allowShake =
    allowDust && !opts.reducedMotion && (step.types.includes('KING_HUNT') || step.types.includes('MAJOR_ATTACK'));

  // 1. Attacker travels with a slight arc
  tl.to(movingPiece.position, { x: toCoords.x, z: toCoords.z, duration: CAPTURE_DURATION, ease: 'power2.inOut' }, 0);
  tl.to(
    movingPiece.position,
    { y: 0.3, duration: CAPTURE_DURATION * 0.5, ease: 'power1.out', yoyo: true, repeat: 1 },
    0,
  );

  if (!capturedPiece || !step.capturedId) return tl;
  const capturedId = step.capturedId;

  // 2. Micro reaction of the captured piece just before contact
  tl.to(capturedPiece.rotation, { z: (4 * Math.PI) / 180, duration: 0.1, ease: 'power1.out' }, CAPTURE_HIT_TIME - 0.05);

  // 3. Impact: weighted sound, a little stone dust
  tl.call(
    () => {
      if (heavy) soundBank.playSacrifice();
      else soundBank.playCapture();
      if (allowDust) registry.particles.burst(toCoords, opts.breakpoint === 'mobile');
      if (allowShake) cameraRig.triggerShake(0.006, 0.15);
    },
    [],
    CAPTURE_HIT_TIME,
  );

  // Bullet-Time camera arc (26.Qxd4+ only, see bulletTime.ts)
  if (isBulletTimePly(step.ply)) {
    tl.add(buildBulletTimeCamera(cameraRig, toCoords, 0.7, opts), Math.max(0, CAPTURE_HIT_TIME - 0.2));
  }

  // 4. Subtle dissolve, then the piece reappears quietly in the captured-material tray
  tl.to(
    {},
    {
      duration: 0.5,
      onUpdate: function () {
        registry.disintegrate.applyToMesh(capturedPiece, this.progress());
        if (allowDust) registry.particles.setProgress(this.progress());
      },
      onComplete: () => {
        const tray = trayPosition(capturedId, step.ply);
        capturedPiece.position.set(tray.x, 0, tray.z);
        capturedPiece.rotation.set(0, 0, 0);
        registry.disintegrate.reset(capturedPiece);
      },
    },
    CAPTURE_HIT_TIME,
  );

  return tl;
}
