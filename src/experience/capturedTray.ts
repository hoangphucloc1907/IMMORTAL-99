import { CAPTURED_AT_PLY } from '../game/replay';
import { PieceId } from '../game/types';

export interface TrayPosition {
  x: number;
  z: number;
}

/**
 * Where a captured piece rests beside the board, in capture order — a quiet record of the
 * game state, not a trophy shelf. White's losses line up on the +x side, Black's on -x.
 */
export function trayPosition(id: PieceId, ply: number): TrayPosition {
  const color = id.startsWith('w') ? 'w' : 'b';
  const captured = CAPTURED_AT_PLY[Math.max(0, Math.min(CAPTURED_AT_PLY.length - 1, ply))][color];
  const index = Math.max(0, captured.indexOf(id));
  const side = color === 'w' ? 1 : -1;
  const column = Math.floor(index / 8);
  const row = index % 8;
  return { x: side * (4.85 + column * 0.6), z: side * (3.15 - row * 0.9) };
}
