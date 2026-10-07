import { Square } from './types';

export const SACRIFICE_CHALLENGE_PLY = 46;

export interface ChallengeDetails {
  ply: number;
  prompt: string;
  correctFrom: Square;
  correctTo: Square;
  correctSan: string;
  hint: string;
  /**
   * Shown as "24. <san>": legal moves in the position, no annotation glyphs, and the answer not first —
   * the choices must not give it away. None may be the following real move either.
   */
  choices: { san: string; correct: boolean }[];
}

export const CHALLENGES: Record<number, ChallengeDetails> = {
  46: {
    ply: 46,
    prompt: 'What did Garry Kasparov unleash here?',
    correctFrom: 'd1',
    correctTo: 'd4',
    correctSan: '24. Rxd4!!',
    hint: 'Look for an audacious, radical sacrifice to blast open the Black king.',
    choices: [
      { san: 'Qxd4', correct: false }, // the natural recapture
      { san: 'Nb3', correct: false },
      { san: 'Rxd4', correct: true },
      { san: 'Qe3', correct: false },
    ],
  },
};

export function getChallengeDetails(ply: number): ChallengeDetails | undefined {
  return CHALLENGES[ply];
}

export function validateChallengeMove(from: Square, to: Square, ply: number = SACRIFICE_CHALLENGE_PLY): boolean {
  const challenge = CHALLENGES[ply];
  if (!challenge) return false;
  return challenge.correctFrom === from && challenge.correctTo === to;
}
