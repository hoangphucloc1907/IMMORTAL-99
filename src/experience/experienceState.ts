import { REPLAY_STEPS, SNAPSHOTS, CAPTURED_AT_PLY } from '../game/replay';
import { FINAL_PLY, KING_HUNT_RANGE } from '../game/moveClassifier';
import { Square } from '../game/types';
import { getActForPly } from './acts';
import { LIGHTING_PRESETS } from './atmosphere';
import { restingShot } from './choreography';
import { getTension } from './tension';
import { ExperienceState, PersistentFx } from './types';

// The Black king's route during the hunt, derived from the snapshots: a7 → b6 → … → d1
function computeKingTrail(ply: number): Square[] {
  const [huntStart, huntEnd] = KING_HUNT_RANGE;
  if (ply < huntStart || ply > huntEnd) {
    return [];
  }

  const trail: Square[] = [];
  for (let p = huntStart - 1; p <= ply; p++) {
    const square = SNAPSHOTS[p]['b-K-e8'] as Square;
    if (trail[trail.length - 1] !== square) trail.push(square);
  }
  return trail;
}

export function resolveExperienceState(ply: number, mode: 'cinematic' | 'study'): ExperienceState {
  const boundedPly = Math.max(0, Math.min(87, ply));
  const act = getActForPly(boundedPly);
  const tension = getTension(boundedPly);
  const step = boundedPly > 0 ? REPLAY_STEPS[boundedPly - 1] : null;

  const fen = step ? step.fenAfter : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const pieces = SNAPSHOTS[boundedPly];
  const captured = CAPTURED_AT_PLY[boundedPly];

  const shot = mode === 'cinematic' ? restingShot(boundedPly) : null;

  const persistentFx: PersistentFx = {
    kingTrail: computeKingTrail(boundedPly),
    checkMarker: step?.checkSquare,
    lastMove: step ? [step.from, step.to] : undefined,
    kingHighlight: boundedPly === FINAL_PLY ? (pieces['b-K-e8'] as Square) : undefined,
  };

  const overlay = mode === 'cinematic' && boundedPly === 87 ? '44. Qa7 — 1–0' : null;

  const lighting = mode === 'study' ? 'STUDY' : act.lightingPreset;
  const fog = mode === 'study' ? 0.015 : act.fogDensity * (1 + tension * 0.4);

  const vignette = Math.min(0.9, LIGHTING_PRESETS[lighting].vignette + (mode === 'study' ? 0 : tension * 0.2));
  const bloom = mode === 'study' ? 0.1 : 0.2 + tension * 0.3;
  const dof = mode === 'cinematic' && (shot === 'CLOSE_PIECE' || shot === 'OVER_SHOULDER' || shot === 'DUTCH_TILT');

  return {
    ply: boundedPly,
    mode,
    fen,
    pieces,
    captured,
    act: act.id,
    shot,
    tension,
    atmosphere: {
      lighting,
      fog,
    },
    post: {
      vignette,
      bloom,
      dof,
    },
    persistentFx,
    overlay,
  };
}

// Precompute states for fast O(1) deterministic access
const PRECOMPUTED_CINEMATIC: ExperienceState[] = [];
const PRECOMPUTED_STUDY: ExperienceState[] = [];

for (let i = 0; i <= 87; i++) {
  PRECOMPUTED_CINEMATIC.push(resolveExperienceState(i, 'cinematic'));
  PRECOMPUTED_STUDY.push(resolveExperienceState(i, 'study'));
}

export function getExperienceState(ply: number, mode: 'cinematic' | 'study'): ExperienceState {
  const bounded = Math.max(0, Math.min(87, ply));
  return mode === 'cinematic' ? PRECOMPUTED_CINEMATIC[bounded] : PRECOMPUTED_STUDY[bounded];
}
