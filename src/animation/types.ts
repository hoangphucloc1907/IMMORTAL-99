import type { Breakpoint } from '../experience/types';
import type { SceneRegistry } from './sceneRegistry';
import type { CameraRig } from './cameraRig';
import type { SoundBank } from '../audio/soundBank';
import type { AudioEngine } from '../audio/engine';
import type { ReplayStore } from '../store/replayStore';

export interface DirectorCommands {
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  replayCurrent: () => void;
  seek: (ply: number, opts?: { cameraBlend?: number; audioFade?: number }) => void;
  setSpeed: (speed: number) => void;
  setMode: (mode: 'cinematic' | 'study') => void;
  playEngineLine: (id: string) => void;
  /** Close the "Find the move" challenge and play on into the real move (its full cinematic). */
  resumeAfterChallenge: () => void;
  /** PNG data URL of the current view as rendered (post-processing included), or null without a scene. */
  capturePhoto: () => Promise<string | null>;
}

/** Runtime objects every timeline builder may touch. */
export interface BuildDeps {
  registry: SceneRegistry;
  soundBank: SoundBank;
  audioEngine: AudioEngine;
  cameraRig: CameraRig;
  store: ReplayStore;
}

/** Settings captured when a ply's timeline is built. */
export interface StepOptions {
  cinematic: boolean;
  speed: number;
  effectsLevel: 'full' | 'reduced';
  reducedMotion: boolean;
  breakpoint: Breakpoint;
}
