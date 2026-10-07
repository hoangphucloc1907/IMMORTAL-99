import { globalDirector } from '../animation/Director';
import { globalSceneRegistry } from '../animation/sceneRegistry';
import { globalCameraRig } from '../animation/cameraRig';
import { globalReplayStore } from '../store/replayStore';
import { globalClock } from '../animation/clock';

export interface SceneProbeData {
  ply: number;
  playing: boolean;
  busy: boolean;
  mode: string;
  camera: {
    targetPosition: [number, number, number];
    targetFov: number;
  };
  lighting: string | null;
  fogDensity: number | null;
  overlay: string | null;
  actTitleCard: string | null;
  activeTransientFxCount: number;
  piecePositions: Record<string, [number, number, number]>;
  pieceRotationsZ: Record<string, number>;
  pieceVisibility: Record<string, boolean>;
  ambientIntensity: number | null;
  vignette: number;
  kingTrailVisible: boolean;
  kingHighlight: boolean;
  reducedMotion: boolean;
  effectsLevel: string;
  breakpoint: string;
  speed: number;
  muted: boolean;
  activeAct: string | null;
  storePly: number;
}

export function probeScene(): SceneProbeData {
  const piecePositions: Record<string, [number, number, number]> = {};
  const pieceRotationsZ: Record<string, number> = {};
  const pieceVisibility: Record<string, boolean> = {};

  for (const [id, obj] of globalSceneRegistry.getAllPieces().entries()) {
    piecePositions[id] = [obj.position.x, obj.position.y, obj.position.z];
    pieceRotationsZ[id] = obj.rotation.z;
    pieceVisibility[id] = obj.visible;
  }
  const store = globalReplayStore.getState();

  return {
    ply: globalDirector.getPly(),
    playing: globalDirector.getIsPlaying(),
    busy: globalDirector.isBusy(),
    mode: store.mode,
    camera: {
      targetPosition: [
        globalCameraRig.targetPosition.x,
        globalCameraRig.targetPosition.y,
        globalCameraRig.targetPosition.z,
      ],
      targetFov: globalCameraRig.targetFov,
    },
    lighting: globalSceneRegistry.appliedLighting,
    fogDensity: globalSceneRegistry.fog?.density ?? null,
    overlay: store.overlay,
    actTitleCard: store.actTitleCard,
    activeTransientFxCount: globalSceneRegistry.activeTransientFxCount(),
    piecePositions,
    pieceRotationsZ,
    pieceVisibility,
    ambientIntensity: globalSceneRegistry.lights.ambient?.intensity ?? null,
    vignette: store.vignette,
    kingTrailVisible: globalSceneRegistry.kingTrail.group.visible,
    kingHighlight: globalSceneRegistry.boardMarks.isKingHighlighted(),
    reducedMotion: store.reducedMotion,
    effectsLevel: store.effectsLevel,
    breakpoint: store.breakpoint,
    speed: store.speed,
    muted: store.muted,
    activeAct: store.activeAct,
    storePly: store.ply,
  };
}

// ?test=1: Playwright drives time explicitly through tick(ms)
if (new URLSearchParams(window.location.search).has('test')) {
  globalClock.setManualMode(true);
}

(window as unknown as { __immortal: Record<string, unknown> }).__immortal = {
  probe: probeScene,
  tick: (ms: number) => {
    globalClock.tick(ms);
    globalSceneRegistry.requestFrame();
  },
  director: globalDirector,
  store: globalReplayStore,
};
