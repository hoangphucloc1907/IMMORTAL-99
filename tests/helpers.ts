import * as THREE from 'three';
import { expect } from 'vitest';
import { Director } from '../src/animation/Director';
import { SceneRegistry } from '../src/animation/sceneRegistry';
import { CameraRig } from '../src/animation/cameraRig';
import { globalClock } from '../src/animation/clock';
import { SoundBank } from '../src/audio/soundBank';
import { AudioEngine } from '../src/audio/engine';
import { createReplayStore, ReplayStore } from '../src/store/replayStore';
import { INITIAL_PIECE_DEFS } from '../src/game/boardState';
import { squareToCoords } from '../src/game/coordinates';
import { PieceId, Square } from '../src/game/types';
import { getExperienceState } from '../src/experience/experienceState';
import { adaptShotForMotion, resolveShot } from '../src/experience/shots';
import { trayPosition } from '../src/experience/capturedTray';
import { LIGHTING_PRESETS } from '../src/experience/atmosphere';

export interface Harness {
  director: Director;
  registry: SceneRegistry;
  cameraRig: CameraRig;
  store: ReplayStore;
}

/** A Director on a real (headless) three.js scene graph: 32 pieces, lights and fog. */
export function createHarness(): Harness {
  const registry = new SceneRegistry();
  const cameraRig = new CameraRig();
  const audioEngine = new AudioEngine();
  const store = createReplayStore();

  for (const def of INITIAL_PIECE_DEFS) {
    const piece = new THREE.Group();
    piece.name = def.id;
    piece.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.5), new THREE.MeshStandardMaterial()));
    const start = squareToCoords(def.startSquare);
    piece.position.set(start.x, 0, start.z);
    registry.registerPiece(def.id, piece);
  }

  registry.registerLights({
    ambient: new THREE.AmbientLight(),
    key: new THREE.DirectionalLight(),
    rim: new THREE.DirectionalLight(),
    fill: new THREE.DirectionalLight(),
    spot: new THREE.SpotLight(),
  });
  registry.registerFog(new THREE.FogExp2(0x000000, 0.02));

  const director = new Director(registry, cameraRig, new SoundBank(audioEngine), audioEngine, store);
  return { director, registry, cameraRig, store };
}

const FRAME_MS = 1000 / 60;

/** Advance the shared animation clock frame by frame. */
export function advance(seconds: number): void {
  const frames = Math.round((seconds * 1000) / FRAME_MS);
  for (let i = 0; i < frames; i++) globalClock.tick(FRAME_MS);
}

/** Advance until `done()` holds; returns the simulated seconds that elapsed. */
export function advanceUntil(done: () => boolean, maxSeconds = 300): number {
  let elapsed = 0;
  while (!done()) {
    globalClock.tick(FRAME_MS);
    elapsed += FRAME_MS / 1000;
    if (elapsed > maxSeconds) throw new Error(`condition not reached within ${maxSeconds}s`);
  }
  return elapsed;
}

/** The scene, camera target, atmosphere and store all match resolveExperienceState(ply). */
export function expectResting(h: Harness, ply: number): void {
  const { director, registry, cameraRig, store } = h;
  const settings = store.getState();
  const state = getExperienceState(ply, settings.mode);

  expect(director.getPly()).toBe(ply);
  expect(settings.ply).toBe(ply);
  expect(settings.activeAct).toBe(state.act);

  for (const [id, square] of Object.entries(state.pieces)) {
    const piece = registry.getPiece(id as PieceId)!;
    const expected = square === 'captured' ? trayPosition(id, ply) : squareToCoords(square as Square);
    expect(piece.position.x, `${id}.x at ply ${ply}`).toBeCloseTo(expected.x, 3);
    expect(piece.position.y, `${id}.y at ply ${ply}`).toBeCloseTo(0, 3);
    expect(piece.position.z, `${id}.z at ply ${ply}`).toBeCloseTo(expected.z, 3);
    expect(piece.rotation.z, `${id} tilt at ply ${ply}`).toBeCloseTo(0, 3);
    expect(piece.visible, `${id} visible at ply ${ply}`).toBe(true);
  }

  if (state.shot) {
    const shotId = adaptShotForMotion(state.shot, settings.reducedMotion);
    const shot = resolveShot(shotId, ply, settings.breakpoint);
    expect(cameraRig.targetPosition.x).toBeCloseTo(shot.position[0], 3);
    expect(cameraRig.targetPosition.y).toBeCloseTo(shot.position[1], 3);
    expect(cameraRig.targetPosition.z).toBeCloseTo(shot.position[2], 3);
    expect(cameraRig.targetFov).toBeCloseTo(shot.fov, 3);
  }

  // Transients never leak past a ply boundary
  expect(registry.activeTransientFxCount(), `transient FX at ply ${ply}`).toBe(0);
  expect(settings.actTitleCard).toBeNull();
  expect(settings.overlay).toBe(state.overlay);

  // Atmosphere and persistent FX
  expect(registry.appliedLighting).toBe(state.atmosphere.lighting);
  expect(registry.lights.ambient!.intensity).toBeCloseTo(LIGHTING_PRESETS[state.atmosphere.lighting].ambient, 4);
  expect(registry.fog!.density).toBeCloseTo(state.atmosphere.fog, 5);
  expect(settings.vignette).toBeCloseTo(state.post.vignette, 5);
  expect(registry.kingTrail.group.visible).toBe(state.persistentFx.kingTrail.length >= 2);
  expect(registry.boardMarks.isKingHighlighted(), `king highlight at ply ${ply}`).toBe(
    !!state.persistentFx.kingHighlight,
  );
}
