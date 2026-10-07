import { describe, it, expect } from 'vitest';
import { CameraRig } from '../src/animation/cameraRig';
import { isBulletTimePly, buildBulletTimeCamera } from '../src/animation/bulletTime';

describe('Bullet Time Cinematics (Group B - Tactical Visualizations)', () => {
  it('only 26.Qxd4+ is a bullet-time moment', () => {
    expect(isBulletTimePly(51)).toBe(true); // 26.Qxd4+ (Queen recapture & check)
    expect(isBulletTimePly(47)).toBe(false); // 24.Rxd4!! keeps the approved Sacrifice sequence
    expect(isBulletTimePly(61)).toBe(false); // 31.Qxf6 keeps its whip-pan
    expect(isBulletTimePly(48)).toBe(false);
    expect(isBulletTimePly(50)).toBe(false);
    expect(isBulletTimePly(1)).toBe(false);
  });

  it('builds orbital camera arc for full cinematic effects', () => {
    const rig = new CameraRig();
    const tl = buildBulletTimeCamera(rig, { x: 0, z: 0 }, 1.0, {
      cinematic: true,
      reducedMotion: false,
      effectsLevel: 'full',
      breakpoint: 'desktop',
      speed: 1.0,
    });

    expect(tl.getChildren().length).toBeGreaterThan(0);
  });

  it('bypasses camera orbit when reduced motion or reduced effects is enabled', () => {
    const rig = new CameraRig();
    const tlMotion = buildBulletTimeCamera(rig, { x: 0, z: 0 }, 1.0, {
      cinematic: true,
      reducedMotion: true,
      effectsLevel: 'full',
      breakpoint: 'desktop',
      speed: 1.0,
    });
    expect(tlMotion.getChildren().length).toBe(0);

    const tlEffects = buildBulletTimeCamera(rig, { x: 0, z: 0 }, 1.0, {
      cinematic: true,
      reducedMotion: false,
      effectsLevel: 'reduced',
      breakpoint: 'desktop',
      speed: 1.0,
    });
    expect(tlEffects.getChildren().length).toBe(0);
  });

  it('starts the arc from where the camera is when it begins, not where it was when built', () => {
    const rig = new CameraRig();
    rig.targetPosition.set(0, 8, 9); // when the move's timeline is built
    const tl = buildBulletTimeCamera(rig, { x: 0, z: 0 }, 1.0, {
      cinematic: true,
      reducedMotion: false,
      effectsLevel: 'full',
      breakpoint: 'desktop',
      speed: 1.0,
    });
    tl.pause(0);
    rig.targetPosition.set(4, 3, 0); // where the move's camera work has taken it by impact
    tl.progress(0.001);
    expect(rig.targetPosition.x).toBeGreaterThan(4);
    expect(Math.abs(rig.targetPosition.z)).toBeLessThan(0.2);
    tl.progress(1);
    // A quarter turn on: from +x round to -z
    expect(Math.abs(rig.targetPosition.x)).toBeLessThan(0.05);
    expect(rig.targetPosition.z).toBeLessThan(-4);
  });
});
