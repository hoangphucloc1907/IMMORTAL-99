import { MoveType } from './types';

export const SACRIFICE_PLY = 47; // 24.Rxd4!!
export const KING_HUNT_RANGE = [49, 70] as const; // 25.Re7+ … 35...Kd1
export const FINAL_PLY = 87; // 44.Qa7

export const CINEMATIC_OVERRIDES: Record<number, MoveType[]> = {
  43: ['MAJOR_ATTACK'], // 22.Nd5
  47: ['SACRIFICE'],
  73: ['MAJOR_ATTACK'], // 37.Rd7
  77: ['MAJOR_ATTACK'], // 39.Qxh8
  87: ['FINAL_MOVE'],
};

const TYPE_PRIORITY: Record<MoveType, number> = {
  FINAL_MOVE: 8,
  SACRIFICE: 7,
  KING_HUNT: 6,
  MAJOR_ATTACK: 5,
  CHECK: 4,
  CAPTURE: 3,
  CASTLING: 2,
  NORMAL: 1,
};

export interface MoveContext {
  ply: number;
  san: string;
  captured?: boolean;
  isCastle?: boolean;
}

export function classifyMove(ctx: MoveContext): MoveType[] {
  const tags = new Set<MoveType>();

  // 1. Authored overrides
  if (CINEMATIC_OVERRIDES[ctx.ply]) {
    for (const tag of CINEMATIC_OVERRIDES[ctx.ply]) {
      tags.add(tag);
    }
  }

  // 2. Authored range: KING_HUNT
  if (ctx.ply >= KING_HUNT_RANGE[0] && ctx.ply <= KING_HUNT_RANGE[1]) {
    tags.add('KING_HUNT');
  }

  // 3. Factual: CHECK
  if (ctx.san.includes('+') || ctx.san.includes('#')) {
    tags.add('CHECK');
  }

  // 4. Factual: CAPTURE
  if (ctx.captured) {
    tags.add('CAPTURE');
  }

  // 5. Factual: CASTLING
  if (ctx.isCastle) {
    tags.add('CASTLING');
  }

  // If no tag, assign NORMAL
  if (tags.size === 0) {
    tags.add('NORMAL');
  }

  // Sort by priority descending
  return Array.from(tags).sort((a, b) => TYPE_PRIORITY[b] - TYPE_PRIORITY[a]);
}
