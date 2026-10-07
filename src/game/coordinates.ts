import { Square } from './types';

export interface BoardCoord {
  x: number;
  z: number;
}

export function squareToCoords(square: Square): BoardCoord {
  const file = square.charCodeAt(0) - 97; // 'a' = 0 ... 'h' = 7
  const rank = parseInt(square[1], 10) - 1; // '1' = 0 ... '8' = 7

  const x = file - 3.5;
  const z = 3.5 - rank; // Rank 1 is +3.5 (White side), Rank 8 is -3.5 (Black side)

  return { x, z };
}

export function coordsToSquare(x: number, z: number): Square | null {
  const file = Math.round(x + 3.5);
  const rank = Math.round(3.5 - z);

  if (file < 0 || file > 7 || rank < 0 || rank > 7) {
    return null;
  }

  const fileChar = String.fromCharCode(97 + file);
  const rankChar = String(rank + 1);
  return `${fileChar}${rankChar}` as Square;
}
