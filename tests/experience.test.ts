import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { ACTS, getActForPly } from '../src/experience/acts';
import { TENSION, getTension } from '../src/experience/tension';
import { resolveExperienceState, getExperienceState } from '../src/experience/experienceState';
import { DRAMATIC_HOLD_SACRIFICE, DRAMATIC_HOLD_FINAL } from '../src/experience/pacing';
import { restingShot, getChoreographyForPly } from '../src/experience/choreography';
import { BASE_SHOTS, getShot, resolveShot } from '../src/experience/shots';
import { ANNOTATIONS, GHOST_VARIATIONS } from '../src/experience/annotations';
import { REPLAY_STEPS } from '../src/game/replay';
import { squareToCoords } from '../src/game/coordinates';

describe('Experience Layer Verification (Section 7 & 14)', () => {
  it('verifies 5 Acts cover plies 0..87 with no gaps or overlaps', () => {
    expect(ACTS.length).toBe(5);

    // Verify ply 0 is in Act I
    expect(getActForPly(0).id).toBe('ACT_I');

    for (let ply = 0; ply <= 87; ply++) {
      const act = getActForPly(ply);
      expect(act).toBeDefined();
      expect(ply).toBeGreaterThanOrEqual(act.plyRange[0]);
      expect(ply).toBeLessThanOrEqual(act.plyRange[1]);
    }

    // Verify boundaries
    expect(ACTS[0].plyRange).toEqual([0, 24]);
    expect(ACTS[1].plyRange).toEqual([25, 46]);
    expect(ACTS[2].plyRange).toEqual([47, 48]);
    expect(ACTS[3].plyRange).toEqual([49, 70]);
    expect(ACTS[4].plyRange).toEqual([71, 87]);
  });

  it('verifies tension curve has exactly 88 values all within [0, 1]', () => {
    expect(TENSION.length).toBe(88);
    for (let i = 0; i < TENSION.length; i++) {
      const val = TENSION[i];
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }

    // Ply 47 (sacrifice) has a dramatic silence drop
    expect(getTension(47)).toBeLessThan(0.2);
    // Late king hunt reaches near peak
    expect(getTension(69)).toBe(1.0);
    // Final move settles to silence
    expect(getTension(87)).toBeLessThan(0.05);
  });

  it('verifies resolveExperienceState is pure, idempotent, and matches requirements', () => {
    for (let ply = 0; ply <= 87; ply++) {
      const cinematicState = resolveExperienceState(ply, 'cinematic');
      const studyState = resolveExperienceState(ply, 'study');

      // Idempotence
      expect(cinematicState).toEqual(resolveExperienceState(ply, 'cinematic'));
      expect(studyState).toEqual(resolveExperienceState(ply, 'study'));
      expect(getExperienceState(ply, 'cinematic')).toEqual(cinematicState);
      expect(getExperienceState(ply, 'study')).toEqual(studyState);

      // Shot is null in study mode
      expect(studyState.shot).toBeNull();
      // Shot is defined in cinematic mode
      expect(cinematicState.shot).toBeDefined();
      expect(BASE_SHOTS[cinematicState.shot!]).toBeDefined();

      // King trail only exists within 49..70
      if (ply >= 49 && ply <= 70) {
        expect(cinematicState.persistentFx.kingTrail.length).toBeGreaterThan(0);
      } else {
        expect(cinematicState.persistentFx.kingTrail.length).toBe(0);
      }

      // Overlay is null except at ply 87 in cinematic mode
      if (ply === 87) {
        expect(cinematicState.overlay).toBe('44. Qa7 — 1–0');
        expect(studyState.overlay).toBeNull();
      } else {
        expect(cinematicState.overlay).toBeNull();
        expect(studyState.overlay).toBeNull();
      }
    }
  });

  it('verifies choreography and restingShot consistency', () => {
    expect(restingShot(0)).toBe('ESTABLISHING');
    expect(restingShot(47)).toBe('REVEAL_PULL');
    expect(restingShot(48)).toBe('LOW_ANGLE');
    expect(restingShot(70)).toBe('TOP_DOWN');
    expect(restingShot(87)).toBe('FINAL_PULLBACK');

    for (let ply = 1; ply <= 87; ply++) {
      const cues = getChoreographyForPly(ply);
      expect(cues.length).toBeGreaterThan(0);
      for (const cue of cues) {
        expect(BASE_SHOTS[cue.shot]).toBeDefined();
      }
    }
  });

  it('verifies dramatic holds floor values', () => {
    expect(DRAMATIC_HOLD_SACRIFICE).toBeGreaterThanOrEqual(1.5);
    expect(DRAMATIC_HOLD_FINAL).toBeGreaterThanOrEqual(3.0);
  });

  // Act runtime budgets are measured on real timelines in playback.test.ts

  it('restingShot is always the last choreography cue of the ply', () => {
    for (let ply = 0; ply <= 87; ply++) {
      const cues = getChoreographyForPly(ply);
      expect(restingShot(ply)).toBe(cues[cues.length - 1].shot);
    }
  });

  it('TRACK_KING follows the Black king, holding both squares of its step while it runs', () => {
    // King moves: aim between origin and destination
    for (const [ply, from, to] of [
      [50, 'a7', 'b6'],
      [62, 'a4', 'a3'],
      [70, 'd2', 'd1'],
    ] as const) {
      const shot = resolveShot('TRACK_KING', ply);
      const a = squareToCoords(from);
      const b = squareToCoords(to);
      expect(shot.target[0]).toBeCloseTo((a.x + b.x) / 2, 5);
      expect(shot.target[2]).toBeCloseTo((a.z + b.z) / 2, 5);
    }
    // Another piece moves (55. Qc3, king on a4): aim at the king
    const shot = resolveShot('TRACK_KING', 55);
    const king = squareToCoords('a4');
    expect(shot.target[0]).toBeCloseTo(king.x, 5);
    expect(shot.target[2]).toBeCloseTo(king.z, 5);
  });

  it('annotations: keys are real plies, no hand-written evaluations', () => {
    for (const [plyKey, annotation] of Object.entries(ANNOTATIONS)) {
      const ply = Number(plyKey);
      expect(ply).toBeGreaterThanOrEqual(1);
      expect(ply).toBeLessThanOrEqual(87);
      // Evaluations only arrive from scripts/genEval.ts
      expect(annotation.eval, `ply ${ply}`).toBeUndefined();
      // A caption that quotes a move must quote the move actually played at that ply
      const quoted = annotation.caption?.match(/^\d+\.(?:\.\.)? ?([^\s!?—]+)/)?.[1];
      if (quoted) expect(quoted, `ply ${ply}`).toBe(REPLAY_STEPS[ply - 1].san);
    }
  });

  it('ghost variations are legal from their origin and never reveal the next real move', () => {
    for (const ghost of GHOST_VARIATIONS) {
      const chess = new Chess(REPLAY_STEPS[ghost.plyOrigin - 1].fenAfter);
      for (const san of ghost.moves) {
        expect(() => chess.move(san), `${ghost.id}: ${san}`).not.toThrow();
      }
      expect(ghost.moves[0]).not.toBe(REPLAY_STEPS[ghost.plyOrigin]?.san);
    }
  });

  it('verifies mobile breakpoint shot scaling', () => {
    const desktopShot = getShot('OVERVIEW', 'desktop');
    const mobileShot = getShot('OVERVIEW', 'mobile');

    expect(mobileShot.position[1]).toBeGreaterThan(desktopShot.position[1]);
    expect(mobileShot.fov).toBeGreaterThan(desktopShot.fov);
    expect(mobileShot.dof).toBe(false);
  });
});
