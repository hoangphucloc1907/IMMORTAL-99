import { REPLAY_STEPS } from '../game/replay';
import { ShotCue, ShotId } from './types';

export const HANDCRAFTED_CHOREOGRAPHY: Record<number, ShotCue[]> = {
  // Opening establishing
  1: [{ shot: 'ESTABLISHING', timing: 'pre', transition: 'dolly' }],

  // Queenside castlings: Reveal opposite sides
  21: [{ shot: 'REVEAL_PULL', timing: 'onLift', transition: 'dolly' }], // 11.O-O-O
  26: [{ shot: 'REVEAL_PULL', timing: 'onLift', transition: 'dolly' }], // 13...O-O-O

  // 20.Qf4+ Ka7: Black king retreats to sanctuary at a7
  39: [{ shot: 'OVER_SHOULDER', timing: 'pre', transition: 'cut' }],
  40: [{ shot: 'LOW_ANGLE', timing: 'onLand', transition: 'dolly' }],

  // 22.Nd5: The strike begins
  43: [{ shot: 'CLOSE_PIECE', timing: 'onLift', transition: 'dolly' }],

  // 24.Rxd4!! The Immortal Sacrifice
  47: [
    { shot: 'LOW_ANGLE', timing: 'pre', transition: 'cut' },
    // the pause pulls back to reveal the whole idea (SacrificeAnimation tweens into this shot)
    { shot: 'REVEAL_PULL', timing: 'post', transition: 'dolly' },
  ],
  48: [{ shot: 'LOW_ANGLE', timing: 'pre', transition: 'cut' }], // 24...cxd4

  // 25.Re7+ (Payoff): pull back so the e7 rook and the a7 king share the frame
  49: [{ shot: 'REVEAL_PULL', timing: 'pre', transition: 'dolly' }],

  // 31.Qxf6 (Whip to queen while hunting king)
  61: [{ shot: 'OVERVIEW', timing: 'onLift', transition: 'whip' }],

  // 34.Qa1+: through the hunted king's eyes, the queen closing in (C10)
  67: [{ shot: 'KING_POV', timing: 'onLand', transition: 'dolly' }],

  // 35...Kd1: The deepest point of the King Hunt
  70: [{ shot: 'TOP_DOWN', timing: 'onLand', transition: 'dolly' }],

  // 44.Qa7: Final move
  87: [{ shot: 'FINAL_PULLBACK', timing: 'onLand', transition: 'dolly' }],
};

export function getChoreographyForPly(ply: number): ShotCue[] {
  if (HANDCRAFTED_CHOREOGRAPHY[ply]) {
    return HANDCRAFTED_CHOREOGRAPHY[ply];
  }

  // Deterministic rule for other plies
  if (ply === 0) {
    return [{ shot: 'ESTABLISHING', timing: 'pre', transition: 'dolly' }];
  }

  // King hunt range default
  if (ply >= 49 && ply <= 70) {
    if (ply >= 61 && ply % 4 === 1) {
      return [{ shot: 'DUTCH_TILT', timing: 'pre', transition: 'cut' }];
    }
    // The camera hunts the king: TRACK_KING whenever the Black king itself runs,
    // otherwise frame the move that is being played
    return REPLAY_STEPS[ply - 1]?.pieceId === 'b-K-e8'
      ? [{ shot: 'TRACK_KING', timing: 'onLift', transition: 'dolly' }]
      : [{ shot: 'OVER_SHOULDER', timing: 'pre', transition: 'cut' }];
  }

  // Act V quiet endgame
  if (ply >= 71 && ply <= 86) {
    return [{ shot: 'OVERVIEW', timing: 'pre', transition: 'cut' }];
  }

  // Act I & II alternating shots
  const shot: ShotId = ply % 2 === 1 ? 'OVERVIEW' : 'OVER_SHOULDER';
  return [{ shot, timing: 'pre', transition: 'cut' }];
}

/** The shot the camera rests on once a ply has finished: always the ply's last cue. */
export function restingShot(ply: number): ShotId {
  const cues = getChoreographyForPly(ply);
  return cues[cues.length - 1].shot;
}
