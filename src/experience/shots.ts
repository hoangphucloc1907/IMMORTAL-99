import { REPLAY_STEPS, SNAPSHOTS } from '../game/replay';
import { squareToCoords } from '../game/coordinates';
import { Square } from '../game/types';
import { Breakpoint, ShotDef, ShotId } from './types';

export const BASE_SHOTS: Record<ShotId, ShotDef> = {
  ESTABLISHING: {
    id: 'ESTABLISHING',
    position: [0, 10.5, 11.7],
    target: [0, 0, 1.2],
    fov: 40,
    dof: false,
    duration: 3.5,
    ease: 'power2.out',
  },
  OVERVIEW: {
    id: 'OVERVIEW',
    position: [0, 7.8, 8.4],
    target: [0, 0, 1.2],
    fov: 44,
    dof: false,
    duration: 1.2,
    ease: 'power2.out',
  },
  OVER_SHOULDER: {
    id: 'OVER_SHOULDER',
    position: [0.5, 4.2, 5.5],
    target: [0, 0.2, -0.8],
    fov: 38,
    dof: true,
    focusDistance: 5.5,
    duration: 1.0,
    ease: 'power2.out',
  },
  CLOSE_PIECE: {
    id: 'CLOSE_PIECE',
    position: [-1.0, 2.6, 3.2],
    target: [-0.5, 0.5, 0.5],
    fov: 32,
    dof: true,
    focusDistance: 3.5,
    duration: 1.4,
    ease: 'power2.inOut',
  },
  LOW_ANGLE: {
    id: 'LOW_ANGLE',
    position: [-0.5, 1.4, 4.2],
    target: [-0.5, 0.6, 0.5],
    fov: 35,
    dof: true,
    focusDistance: 4.0,
    duration: 1.8,
    ease: 'power2.out',
  },
  TRACK_KING: {
    id: 'TRACK_KING',
    position: [-2.8, 3.8, 0.5],
    target: [-2.5, 0.6, -2.5],
    fov: 36,
    dof: true,
    focusDistance: 4.5,
    duration: 1.2,
    ease: 'power1.out',
  },
  REVEAL_PULL: {
    id: 'REVEAL_PULL',
    position: [-2.4, 8.16, 9.0],
    target: [0, 0, 1.2],
    fov: 45,
    dof: false,
    duration: 2.2,
    ease: 'power2.out',
  },
  DUTCH_TILT: {
    id: 'DUTCH_TILT',
    position: [2.5, 3.5, 3.2],
    target: [0.5, 0.6, -1.0],
    fov: 38,
    roll: 5, // degrees — late king hunt only (E1)
    dof: true,
    focusDistance: 4.2,
    duration: 1.5,
    ease: 'power2.inOut',
  },
  TOP_DOWN: {
    id: 'TOP_DOWN',
    position: [0, 12.1, 0.81],
    target: [0, 0, 0.8],
    fov: 46,
    dof: false,
    duration: 2.5,
    ease: 'power2.inOut',
  },
  KING_POV: {
    id: 'KING_POV',
    position: [0, 1.6, 0],
    target: [0, 0.5, 2],
    fov: 52,
    dof: true,
    duration: 1.2,
    ease: 'power2.out',
  },
  FINAL_PULLBACK: {
    id: 'FINAL_PULLBACK',
    position: [0, 9.2, 10.4],
    target: [0, 0, 1.2],
    fov: 42,
    dof: false,
    duration: 4.0,
    ease: 'power2.inOut',
  },
};

// Wide shots keep the whole board inside the safe area (above the control bar). On narrower
// screens the camera backs away along its view line; factors computed by fitting all 64 squares
// (tests/framing.test.ts guards the result).
const WIDE_REACH: Partial<Record<ShotId, Record<Breakpoint, number>>> = {
  ESTABLISHING: { desktop: 1, tablet: 1.05, mobile: 1.45 },
  OVERVIEW: { desktop: 1, tablet: 1.05, mobile: 1.8 },
  REVEAL_PULL: { desktop: 1, tablet: 1.05, mobile: 1.75 },
  TOP_DOWN: { desktop: 1, tablet: 1.05, mobile: 1.75 },
  FINAL_PULLBACK: { desktop: 1, tablet: 1.05, mobile: 1.55 },
};

export function getShot(id: ShotId, breakpoint: Breakpoint = 'desktop'): ShotDef {
  const base = BASE_SHOTS[id];
  if (breakpoint === 'desktop') {
    return base;
  }

  const isMobile = breakpoint === 'mobile';
  const fov = Math.min(65, base.fov * (isMobile ? 1.25 : 1.1));
  const reach = WIDE_REACH[id]?.[breakpoint] ?? 1;
  const position = base.position.map((v, i) => base.target[i] + (v - base.target[i]) * reach) as [
    number,
    number,
    number,
  ];

  return { ...base, position, fov, dof: isMobile ? false : base.dof };
}

/** Reduced-motion profile: no Dutch tilt (the whip transition is already eased by the rig). */
export function adaptShotForMotion(id: ShotId, reducedMotion: boolean): ShotId {
  return reducedMotion && id === 'DUTCH_TILT' ? 'OVER_SHOULDER' : id;
}

/** Centre of a set of squares and how far the camera should back away to hold them all. */
function frame(squares: Square[]): { center: { x: number; z: number }; span: number } {
  const points = squares.map((sq) => squareToCoords(sq));
  const xs = points.map((p) => p.x);
  const zs = points.map((p) => p.z);
  const center = { x: (Math.min(...xs) + Math.max(...xs)) / 2, z: (Math.min(...zs) + Math.max(...zs)) / 2 };
  const extent = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs));
  return { center, span: 1 + extent * 0.22 };
}

const BREAKPOINT_REACH: Record<Breakpoint, number> = { desktop: 1, tablet: 1.15, mobile: 1.3 };

/**
 * Piece-relative framing (E1: "OVER_SHOULDER(pieceId)", "CLOSE_PIECE(id)", "LOW_ANGLE(square)").
 * Offsets are expressed from the mover's side of the board (`side` = +1 for White, -1 for Black),
 * and stretched on smaller screens so the destination stays in frame.
 */
function anchored(
  shot: ShotDef,
  anchor: { x: number; z: number },
  offset: [number, number, number],
  look: { x: number; y: number; z: number },
  breakpoint: Breakpoint,
): ShotDef {
  const reach = BREAKPOINT_REACH[breakpoint];
  return {
    ...shot,
    position: [anchor.x + offset[0] * reach, offset[1] * reach, anchor.z + offset[2] * reach],
    target: [look.x, look.y, look.z],
  };
}

/**
 * Concrete shot for a ply, resolved from the ply's move (or the Black king for TRACK_KING), so
 * playback cues and seek resolve to the same camera. Wide shots (OVERVIEW, TOP_DOWN…) are fixed.
 */
export function resolveShot(id: ShotId, ply: number, breakpoint: Breakpoint = 'desktop'): ShotDef {
  const shot = getShot(id, breakpoint);
  const clamped = Math.max(0, Math.min(SNAPSHOTS.length - 1, ply));

  const step = clamped > 0 ? REPLAY_STEPS[clamped - 1] : null;

  if (id === 'TRACK_KING') {
    const kingSquare = SNAPSHOTS[clamped]['b-K-e8'];
    if (kingSquare === 'captured') return shot;
    // While the king itself moves, keep both squares of its step in frame
    const kingMove = step && step.pieceId === 'b-K-e8' ? [step.from, step.to] : [kingSquare as Square];
    const { center, span } = frame(kingMove);
    return anchored(
      shot,
      center,
      [1.2 * span, 3.8 * span, 3.4 * span],
      { x: center.x, y: 0.5, z: center.z },
      breakpoint,
    );
  }

  if (!step) return shot;
  const side = step.color === 'w' ? 1 : -1;
  const from = squareToCoords(step.from);
  const to = squareToCoords(step.to);
  // Frame everything the moment is about: origin, destination and, for a check, the king
  const { center: mid, span } = frame(step.checkSquare ? [step.from, step.to, step.checkSquare] : [step.from, step.to]);
  const look = (y: number) => ({ x: mid.x, y, z: mid.z });

  switch (id) {
    case 'OVER_SHOULDER': // above and behind the move, from the mover's side
      return anchored(shot, mid, [0.9 * span, 4.2 * span, side * 4.8 * span], look(0.3), breakpoint);
    case 'CLOSE_PIECE':
      return anchored(shot, mid, [-1.1 * span, 2.8 * span, side * 3.4 * span], look(0.45), breakpoint);
    case 'LOW_ANGLE': // low behind the origin, the piece in the foreground, the path ahead
      return anchored(shot, from, [0.5, 1.9 * span, side * 2.9 * span], { x: to.x, y: 0.35, z: to.z }, breakpoint);
    case 'KING_POV': {
      // Just behind the hunted king's shoulder, looking down the line at the piece giving check
      if (!step.checkSquare) return shot;
      const king = squareToCoords(step.checkSquare);
      const away = Math.hypot(king.x - to.x, king.z - to.z) || 1;
      const dir = { x: (king.x - to.x) / away, z: (king.z - to.z) / away };
      const reach = BREAKPOINT_REACH[breakpoint];
      return {
        ...shot,
        position: [king.x + dir.x * 1.7 * reach, 1.55 * reach, king.z + dir.z * 1.7 * reach],
        target: [(king.x + to.x) / 2, 0.45, (king.z + to.z) / 2],
      };
    }
    case 'DUTCH_TILT':
      return anchored(shot, mid, [side * 2.3 * span, 3.9 * span, side * 4.2 * span], look(0.35), breakpoint);
    default:
      return shot;
  }
}
