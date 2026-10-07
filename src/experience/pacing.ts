import { MoveType } from '../game/types';
import { ActId } from './types';

export const DRAMATIC_HOLD_SACRIFICE = 1.5; // floor in seconds at any speed
export const DRAMATIC_HOLD_FINAL = 3.0; // floor in seconds at any speed

export interface PacingConfig {
  moveDuration: number;
  restDuration: number;
  totalDuration: number;
}

export function getRestDurationForAct(act: ActId): number {
  switch (act) {
    case 'ACT_I':
      return 0.35;
    case 'ACT_II':
      return 0.55;
    case 'ACT_III':
      return 0.9;
    case 'ACT_IV':
      return 0.4;
    case 'ACT_V':
      return 0.6;
    default:
      return 0.4;
  }
}

export function getPacing(primaryType: MoveType, act: ActId, ply: number): PacingConfig {
  let moveDuration = 0.65;

  switch (primaryType) {
    case 'NORMAL':
    case 'CASTLING':
      moveDuration = 0.65;
      break;
    case 'CAPTURE':
      moveDuration = 0.9;
      break;
    case 'CHECK':
      moveDuration = 1.4;
      break;
    case 'SACRIFICE':
      moveDuration = 2.5; // with sequence around 9s
      break;
    case 'KING_HUNT':
      if (ply % 2 === 1) {
        // White attacking move (check/assault)
        moveDuration = 1.6;
      } else {
        // Black king fleeing move: accelerates from 1.4s down to 0.9s
        const progress = (ply - 50) / 20; // 0..1 in king hunt
        moveDuration = Math.max(0.9, 1.4 - progress * 0.5);
      }
      break;
    case 'MAJOR_ATTACK':
      moveDuration = 1.2;
      break;
    case 'FINAL_MOVE':
      moveDuration = 3.5;
      break;
  }

  const restDuration = getRestDurationForAct(act);

  return {
    moveDuration,
    restDuration,
    totalDuration: moveDuration + restDuration,
  };
}
