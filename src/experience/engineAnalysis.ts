import data from './annotations.eval.json';

/** Engine evaluation of the position after a ply, White's point of view. */
export interface EngineEval {
  ply: number;
  depth: number;
  cp?: number;
  mate?: number;
}

/**
 * An engine line for a Black king move the game did not play (§A2, "Engine + Study mode").
 * Starts from the position before `branchPly`; ships only once `approved` by the project owner.
 */
export interface EngineLine {
  id: string;
  branchPly: number;
  instead: string; // SAN of the move actually played at branchPly
  moves: string[]; // SAN, first move is the alternative king move
  depth: number;
  cp?: number;
  mate?: number;
  approved: boolean;
}

export const ENGINE_SOURCE: string = data.source;
export const GHOST_DEPTH: number = data.ghostDepth;
const EVALS = data.plies as EngineEval[];
export const ENGINE_LINES = data.ghosts as EngineLine[];

export function engineEval(ply: number): EngineEval | undefined {
  return EVALS[ply];
}

/** "+1.23", "−0.40", "#3" (White mates in 3), "#−2" (Black mates in 2). */
export function formatEval(score: { cp?: number; mate?: number }): string {
  if (score.mate !== undefined) return score.mate > 0 ? `#${score.mate}` : `#−${-score.mate}`;
  if (score.cp === undefined) return '—';
  const pawns = score.cp / 100;
  return `${pawns >= 0 ? '+' : '−'}${Math.abs(pawns).toFixed(2)}`;
}

/** Lines branching at `ply`. Unreviewed lines are only listed when `includeUnapproved` (dev review). */
export function engineLinesAt(ply: number, includeUnapproved: boolean): EngineLine[] {
  return ENGINE_LINES.filter((line) => line.branchPly === ply && (line.approved || includeUnapproved));
}

export function engineLine(id: string): EngineLine | undefined {
  return ENGINE_LINES.find((line) => line.id === id);
}
