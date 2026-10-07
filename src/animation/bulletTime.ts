import gsap from 'gsap';
import { BoardCoord } from '../game/coordinates';
import { CameraRig } from './cameraRig';
import { StepOptions } from './types';

// Only 26.Qxd4+ (review 07/10/2026): 24.Rxd4 keeps the M4-approved Sacrifice sequence (low angle, slow
// approach, reveal) and 31.Qxf6 keeps its authored whip-pan from the black king to the white queen (E2).
export const BULLET_TIME_PLIES = new Set<number>([51]);

export function isBulletTimePly(ply: number): boolean {
  return BULLET_TIME_PLIES.has(ply);
}

/**
 * Bullet-Time camera arc (Group B, Item 7): orbits the camera 90° in azimuth around the impact square at a
 * lowered elevation. The arc starts from wherever the camera is when it begins (not when the timeline was
 * built), so there is no jump. Bypassed in reduced-motion or reduced-effects mode.
 */
export function buildBulletTimeCamera(
  cameraRig: CameraRig,
  targetCoords: BoardCoord,
  duration: number,
  opts: StepOptions,
): gsap.core.Timeline {
  const tl = gsap.timeline();

  if (opts.reducedMotion || opts.effectsLevel === 'reduced' || !opts.cinematic) {
    return tl;
  }

  const orbit = { t: 0, angle: 0, radius: 4.2, elevation: 2.6 };
  let startAngle = 0;

  tl.to(
    orbit,
    {
      t: 1,
      duration,
      ease: 'power2.inOut',
      onStart: () => {
        const dx = cameraRig.targetPosition.x - targetCoords.x;
        const dz = cameraRig.targetPosition.z - targetCoords.z;
        startAngle = Math.atan2(dx, dz) || -Math.PI / 4;
      },
      onUpdate: () => {
        orbit.angle = startAngle + (Math.PI / 2) * orbit.t; // 90 degree orbit
        cameraRig.targetPosition.x = targetCoords.x + orbit.radius * Math.sin(orbit.angle);
        cameraRig.targetPosition.y = orbit.elevation;
        cameraRig.targetPosition.z = targetCoords.z + orbit.radius * Math.cos(orbit.angle);
        cameraRig.targetLookAt.set(targetCoords.x, 0.15, targetCoords.z);
      },
    },
    0,
  );

  return tl;
}
