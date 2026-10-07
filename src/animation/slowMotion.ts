import gsap from 'gsap';
import * as THREE from 'three';
import { BoardCoord } from '../game/coordinates';

const APPROACH_SHARE = 0.85; // fraction of the path covered at normal speed

/**
 * Dramatic slow motion (E3) for a single piece: normal speed for most of the path, then the
 * last 15% stretched out so the moment of contact is seen in slow motion. Deterministic —
 * built as two tweens instead of ramping a timeline's timeScale, so durations stay fixed.
 * Reduced motion: one plain eased move of the same length.
 */
export function buildSlowApproach(
  piece: THREE.Object3D,
  to: BoardCoord,
  opts: { duration: number; lift: number; reducedMotion: boolean },
): gsap.core.Timeline {
  const tl = gsap.timeline();
  const { duration, lift } = opts;

  if (opts.reducedMotion) {
    tl.to(piece.position, { x: to.x, z: to.z, duration, ease: 'power1.inOut' }, 0);
    return tl;
  }

  const from = { x: piece.position.x, z: piece.position.z };
  const near = {
    x: from.x + (to.x - from.x) * APPROACH_SHARE,
    z: from.z + (to.z - from.z) * APPROACH_SHARE,
  };
  const approach = duration * 0.45;
  const slow = duration - approach;

  tl.to(piece.position, { x: near.x, z: near.z, y: lift, duration: approach, ease: 'power1.inOut' }, 0);
  tl.to(piece.position, { x: to.x, z: to.z, y: 0, duration: slow, ease: 'power3.out' }, approach);

  return tl;
}
