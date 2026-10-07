import { PieceSymbol, ReplayStep } from '../game/types';

const NAMES: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
};

/**
 * A factual sentence for any ply, generated from the game data itself — so the Study panel has an
 * explanation for all 87 plies and none of it can contradict the score (§Content track).
 */
export function describeMove(step: ReplayStep): string {
  const side = step.color === 'w' ? 'White' : 'Black';
  const piece = NAMES[step.piece];

  let sentence: string;
  if (step.castle) {
    sentence = `${side} castles ${step.castle === 'q' ? 'queenside' : 'kingside'}.`;
  } else if (step.captured) {
    sentence = `${side}'s ${piece} takes the ${NAMES[step.captured]} on ${step.to}.`;
  } else {
    sentence = `${side}'s ${piece} moves from ${step.from} to ${step.to}.`;
  }

  if (step.isMate) return `${sentence} Checkmate.`;
  if (step.isCheck && step.checkSquare) return `${sentence} Check to the king on ${step.checkSquare}.`;
  return sentence;
}
