import { PieceId, Square } from '../game/types';

export type ActId = 'ACT_I' | 'ACT_II' | 'ACT_III' | 'ACT_IV' | 'ACT_V';

export type LightingPresetId = 'ACT_I' | 'ACT_II' | 'ACT_III' | 'ACT_IV' | 'ACT_V' | 'STUDY';

export type ShotId =
  | 'ESTABLISHING'
  | 'OVERVIEW'
  | 'OVER_SHOULDER'
  | 'CLOSE_PIECE'
  | 'LOW_ANGLE'
  | 'TRACK_KING'
  | 'REVEAL_PULL'
  | 'DUTCH_TILT'
  | 'TOP_DOWN'
  | 'KING_POV'
  | 'FINAL_PULLBACK';

export type Breakpoint = 'desktop' | 'tablet' | 'mobile';

export interface ShotDef {
  id: ShotId;
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  focusDistance?: number;
  dof?: boolean;
  duration?: number;
  ease?: string;
  shake?: number;
  roll?: number; // camera roll in degrees (Dutch tilt)
}

export type ShotTiming = 'pre' | 'onLift' | 'onLand' | 'post';
export type ShotTransition = 'cut' | 'dolly' | 'whip' | 'rack-focus';

export interface ShotCue {
  shot: ShotId;
  timing: ShotTiming;
  transition: ShotTransition;
  customShot?: ShotDef;
}

export interface ActDefinition {
  id: ActId;
  romanNumeral: string;
  title: string;
  subtitle: string;
  plyRange: [number, number];
  budgetSeconds: number;
  lightingPreset: LightingPresetId;
  fogDensity: number;
  openingShot: ShotId;
}

export type OverlayId = string;

export interface PersistentFx {
  kingTrail: Square[];
  checkMarker?: Square;
  lastMove?: [Square, Square];
  kingHighlight?: Square; // 44.Qa7: a cold light stays on the trapped Black king
}

export interface AtmosphereState {
  lighting: LightingPresetId;
  fog: number;
}

export interface PostProcessingState {
  vignette: number;
  bloom: number;
  dof: boolean;
}

export interface ExperienceState {
  ply: number;
  mode: 'cinematic' | 'study';
  fen: string;
  pieces: Record<PieceId, Square | 'captured'>;
  captured: { w: PieceId[]; b: PieceId[] };
  act: ActId;
  shot: ShotId | null;
  tension: number;
  atmosphere: AtmosphereState;
  post: PostProcessingState;
  persistentFx: PersistentFx;
  overlay: OverlayId | null;
}
