import { Square, BoardSnapshot, PieceId, PieceSymbol } from './types';
import { INITIAL_PIECE_DEFS } from './boardState';

export interface PressureSquare {
  square: Square;
  weight: number; // 0..1
  isKingAdjacent: boolean;
}

export interface PressureMapData {
  kingSquare: Square;
  controlledSquares: PressureSquare[];
  safeEscapeSquares: Square[];
}

const PIECE_DEF_MAP = new Map<PieceId, { type: PieceSymbol; color: 'w' | 'b' }>();
for (const def of INITIAL_PIECE_DEFS) {
  PIECE_DEF_MAP.set(def.id, { type: def.type, color: def.color });
}

function isAttacking(
  pieceType: PieceSymbol,
  fromFile: number,
  fromRank: number,
  toFile: number,
  toRank: number,
  occupied: Set<string>,
): boolean {
  const df = toFile - fromFile;
  const dr = toRank - fromRank;

  switch (pieceType) {
    case 'p':
      // White pawns move +rank (from rank 1 to 7)
      return dr === 1 && Math.abs(df) === 1;

    case 'n':
      return (Math.abs(df) === 1 && Math.abs(dr) === 2) || (Math.abs(df) === 2 && Math.abs(dr) === 1);

    case 'b': {
      if (Math.abs(df) !== Math.abs(dr) || df === 0) return false;
      const stepF = df > 0 ? 1 : -1;
      const stepR = dr > 0 ? 1 : -1;
      let f = fromFile + stepF;
      let r = fromRank + stepR;
      while (f !== toFile && r !== toRank) {
        if (occupied.has(`${f},${r}`)) return false;
        f += stepF;
        r += stepR;
      }
      return true;
    }

    case 'r': {
      if ((df === 0 && dr === 0) || (df !== 0 && dr !== 0)) return false;
      const stepF = df === 0 ? 0 : df > 0 ? 1 : -1;
      const stepR = dr === 0 ? 0 : dr > 0 ? 1 : -1;
      let f = fromFile + stepF;
      let r = fromRank + stepR;
      while (f !== toFile || r !== toRank) {
        if (occupied.has(`${f},${r}`)) return false;
        f += stepF;
        r += stepR;
      }
      return true;
    }

    case 'q': {
      const isDiag = Math.abs(df) === Math.abs(dr) && df !== 0;
      const isStraight = (df === 0 && dr !== 0) || (df !== 0 && dr === 0);
      if (!isDiag && !isStraight) return false;

      const stepF = df === 0 ? 0 : df > 0 ? 1 : -1;
      const stepR = dr === 0 ? 0 : dr > 0 ? 1 : -1;
      let f = fromFile + stepF;
      let r = fromRank + stepR;
      while (f !== toFile || r !== toRank) {
        if (occupied.has(`${f},${r}`)) return false;
        f += stepF;
        r += stepR;
      }
      return true;
    }

    case 'k':
      return Math.abs(df) <= 1 && Math.abs(dr) <= 1 && !(df === 0 && dr === 0);

    default:
      return false;
  }
}

function squareToFileRank(sq: Square): { file: number; rank: number } {
  return {
    file: sq.charCodeAt(0) - 97,
    rank: parseInt(sq[1], 10) - 1,
  };
}

function fileRankToSquare(file: number, rank: number): Square {
  return `${String.fromCharCode(97 + file)}${rank + 1}` as Square;
}

export function computePressureMap(rawBoard: BoardSnapshot | { board: BoardSnapshot }): PressureMapData {
  const board = rawBoard && 'board' in rawBoard && rawBoard.board ? rawBoard.board : rawBoard || {};
  let kingSquare: Square = 'e8';
  const occupiedSquares = new Set<string>();
  const blackSquares = new Set<string>();
  const whitePieces: Array<{ type: PieceSymbol; file: number; rank: number }> = [];

  for (const [id, sq] of Object.entries(board)) {
    if (sq === 'captured') continue;
    const def = PIECE_DEF_MAP.get(id);
    if (!def) continue;

    const { file, rank } = squareToFileRank(sq);
    occupiedSquares.add(`${file},${rank}`);

    if (id === 'b-K-e8') {
      kingSquare = sq;
    } else if (def.color === 'w') {
      whitePieces.push({ type: def.type, file, rank });
    } else {
      blackSquares.add(`${file},${rank}`);
    }
  }

  const kPos = squareToFileRank(kingSquare);
  const controlledMap = new Map<Square, { weight: number; isKingAdjacent: boolean }>();
  const kingAdjacentSquares: Square[] = [];

  // Examine squares in radius 1..2 around Black King
  for (let df = -2; df <= 2; df++) {
    for (let dr = -2; dr <= 2; dr++) {
      if (df === 0 && dr === 0) continue;
      const f = kPos.file + df;
      const r = kPos.rank + dr;
      if (f < 0 || f > 7 || r < 0 || r > 7) continue;

      const targetSquare = fileRankToSquare(f, r);
      const isAdjacent = Math.abs(df) <= 1 && Math.abs(dr) <= 1;
      if (isAdjacent) {
        kingAdjacentSquares.push(targetSquare);
      }

      // Check how many White pieces attack this square
      let attackers = 0;
      for (const wp of whitePieces) {
        if (isAttacking(wp.type, wp.file, wp.rank, f, r, occupiedSquares)) {
          attackers++;
        }
      }

      if (attackers > 0) {
        const weight = Math.min(1.0, 0.4 + attackers * 0.25);
        controlledMap.set(targetSquare, { weight, isKingAdjacent: isAdjacent });
      }
    }
  }

  const controlledSquares: PressureSquare[] = Array.from(controlledMap.entries()).map(([square, data]) => ({
    square,
    weight: data.weight,
    isKingAdjacent: data.isKingAdjacent,
  }));

  // Escapes are the king's legal moves: not onto Black's own pieces, and not onto any square White attacks
  // once the king has left its square — a square behind the king on a checking line is no escape (x-ray).
  const withoutKing = new Set(occupiedSquares);
  withoutKing.delete(`${kPos.file},${kPos.rank}`);
  const safeEscapeSquares = kingAdjacentSquares.filter((sq) => {
    const { file, rank } = squareToFileRank(sq);
    if (blackSquares.has(`${file},${rank}`)) return false;
    // A White piece standing there can be taken only if no other White piece defends the square
    return !whitePieces.some(
      (wp) =>
        !(wp.file === file && wp.rank === rank) && isAttacking(wp.type, wp.file, wp.rank, file, rank, withoutKing),
    );
  });

  return {
    kingSquare,
    controlledSquares,
    safeEscapeSquares,
  };
}
