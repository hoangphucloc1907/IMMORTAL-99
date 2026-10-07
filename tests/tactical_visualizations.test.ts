import { describe, it, expect } from 'vitest';
import { Director } from '../src/animation/Director';
import { SceneRegistry } from '../src/animation/sceneRegistry';
import { SoundBank } from '../src/audio/soundBank';
import { globalReplayStore } from '../src/store/replayStore';
import { CameraRig } from '../src/animation/cameraRig';
import { generateEvalCurvePath } from '../src/ui/Scrubber';
import { isBulletTimePly } from '../src/animation/bulletTime';

describe('Tactical Visualizations Full Integration (Group B)', () => {
  it('manages PressureGrid visibility deterministically during seek', () => {
    const registry = new SceneRegistry();
    const cameraRig = new CameraRig();
    const soundBank = new SoundBank();
    const director = new Director(registry, cameraRig, soundBank);

    // Opening ply 10 (Act I)
    director.seek(10);
    expect(registry.pressureGrid.group.children.length).toBe(0);

    // Seek to King Hunt ply 55 (Act IV)
    globalReplayStore.getState().setEffectsLevel('full');
    director.seek(55);
    expect(registry.pressureGrid.group.children.length).toBeGreaterThan(0);

    // Seek to endgame ply 80 (Act V)
    director.seek(80);
    expect(registry.pressureGrid.group.children.length).toBe(0);

    // Seek back to King Hunt ply 50
    director.seek(50);
    expect(registry.pressureGrid.group.children.length).toBeGreaterThan(0);

    // Seek to 0
    director.seek(0);
    expect(registry.pressureGrid.group.children.length).toBe(0);
  });

  it('respects reduced-effects setting by deactivating PressureGrid', () => {
    const registry = new SceneRegistry();
    const cameraRig = new CameraRig();
    const soundBank = new SoundBank();
    const director = new Director(registry, cameraRig, soundBank);

    globalReplayStore.getState().setEffectsLevel('reduced');
    director.seek(55);
    expect(registry.pressureGrid.group.children.length).toBe(0);

    // Reset back to full
    globalReplayStore.getState().setEffectsLevel('full');
  });

  it('verifies bullet time plies and scrubber eval crest sync', () => {
    // 26.Qxd4+ only: 24.Rxd4 keeps the approved Sacrifice sequence, 31.Qxf6 its whip-pan
    expect(isBulletTimePly(47)).toBe(false);
    expect(isBulletTimePly(51)).toBe(true);
    expect(isBulletTimePly(61)).toBe(false);

    const { sacrificePos } = generateEvalCurvePath(1000, 24);
    // Ply 47 represents 24.Rxd4!!
    expect(sacrificePos.x).toBeCloseTo((47 / 87) * 1000, 1);
  });
});
