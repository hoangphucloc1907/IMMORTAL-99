import gsap from 'gsap';
import * as THREE from 'three';
import { ShotDef } from '../experience/types';
import { CameraRig } from './cameraRig';

/**
 * A slow, authored camera move: the rig's targets glide to `shot` over `duration` (the rig's
 * damping then smooths the motion). Used where a move must take a precise, long time — the reveal
 * after 24.Rxd4, the final pull-back after 44.Qa7 — instead of the default damping chase.
 * Inside a Director timeline, so seek reverts it like any other tween.
 */
export function buildCameraMove(
  rig: CameraRig,
  shot: ShotDef,
  duration: number,
  ease = 'sine.inOut',
): gsap.core.Timeline {
  const tl = gsap.timeline();
  const [px, py, pz] = shot.position;
  const [lx, ly, lz] = shot.target;
  tl.to(rig.targetPosition, { x: px, y: py, z: pz, duration, ease }, 0);
  tl.to(rig.targetLookAt, { x: lx, y: ly, z: lz, duration, ease }, 0);
  tl.to(
    rig,
    {
      targetFov: shot.fov,
      targetRoll: THREE.MathUtils.degToRad(shot.roll ?? 0),
      targetDof: shot.dof ? 1 : 0,
      duration,
      ease,
    },
    0,
  );
  return tl;
}
