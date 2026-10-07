import { Color, PieceId, PieceInstance, PieceSymbol, Square, BoardSnapshot } from './types';

export const INITIAL_PIECE_DEFS: Array<{
  id: PieceId;
  color: Color;
  type: PieceSymbol;
  startSquare: Square;
}> = [
  // White Pieces
  { id: 'w-R-a1', color: 'w', type: 'r', startSquare: 'a1' },
  { id: 'w-N-b1', color: 'w', type: 'n', startSquare: 'b1' },
  { id: 'w-B-c1', color: 'w', type: 'b', startSquare: 'c1' },
  { id: 'w-Q-d1', color: 'w', type: 'q', startSquare: 'd1' },
  { id: 'w-K-e1', color: 'w', type: 'k', startSquare: 'e1' },
  { id: 'w-B-f1', color: 'w', type: 'b', startSquare: 'f1' },
  { id: 'w-N-g1', color: 'w', type: 'n', startSquare: 'g1' },
  { id: 'w-R-h1', color: 'w', type: 'r', startSquare: 'h1' },
  { id: 'w-P-a2', color: 'w', type: 'p', startSquare: 'a2' },
  { id: 'w-P-b2', color: 'w', type: 'p', startSquare: 'b2' },
  { id: 'w-P-c2', color: 'w', type: 'p', startSquare: 'c2' },
  { id: 'w-P-d2', color: 'w', type: 'p', startSquare: 'd2' },
  { id: 'w-P-e2', color: 'w', type: 'p', startSquare: 'e2' },
  { id: 'w-P-f2', color: 'w', type: 'p', startSquare: 'f2' },
  { id: 'w-P-g2', color: 'w', type: 'p', startSquare: 'g2' },
  { id: 'w-P-h2', color: 'w', type: 'p', startSquare: 'h2' },

  // Black Pieces
  { id: 'b-R-a8', color: 'b', type: 'r', startSquare: 'a8' },
  { id: 'b-N-b8', color: 'b', type: 'n', startSquare: 'b8' },
  { id: 'b-B-c8', color: 'b', type: 'b', startSquare: 'c8' },
  { id: 'b-Q-d8', color: 'b', type: 'q', startSquare: 'd8' },
  { id: 'b-K-e8', color: 'b', type: 'k', startSquare: 'e8' },
  { id: 'b-B-f8', color: 'b', type: 'b', startSquare: 'f8' },
  { id: 'b-N-g8', color: 'b', type: 'n', startSquare: 'g8' },
  { id: 'b-R-h8', color: 'b', type: 'r', startSquare: 'h8' },
  { id: 'b-P-a7', color: 'b', type: 'p', startSquare: 'a7' },
  { id: 'b-P-b7', color: 'b', type: 'p', startSquare: 'b7' },
  { id: 'b-P-c7', color: 'b', type: 'p', startSquare: 'c7' },
  { id: 'b-P-d7', color: 'b', type: 'p', startSquare: 'd7' },
  { id: 'b-P-e7', color: 'b', type: 'p', startSquare: 'e7' },
  { id: 'b-P-f7', color: 'b', type: 'p', startSquare: 'f7' },
  { id: 'b-P-g7', color: 'b', type: 'p', startSquare: 'g7' },
  { id: 'b-P-h7', color: 'b', type: 'p', startSquare: 'h7' },
];

export function createInitialPieces(): PieceInstance[] {
  return INITIAL_PIECE_DEFS.map((def) => ({
    ...def,
    currentSquare: def.startSquare,
  }));
}

export function createInitialSnapshot(): BoardSnapshot {
  const snapshot: Partial<BoardSnapshot> = {};
  for (const def of INITIAL_PIECE_DEFS) {
    snapshot[def.id] = def.startSquare;
  }
  return snapshot as BoardSnapshot;
}
