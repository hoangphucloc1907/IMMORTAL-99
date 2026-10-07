import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';
import { FULL_PGN } from '../src/game/pgn';
import { GAME_DATA, REPLAY_STEPS, SNAPSHOTS } from '../src/game/replay';
import { SACRIFICE_PLY, KING_HUNT_RANGE, FINAL_PLY } from '../src/game/moveClassifier';
import { INITIAL_PIECE_DEFS } from '../src/game/boardState';
import { squareToCoords, coordsToSquare } from '../src/game/coordinates';

describe('Chess Game Verification (Section 3 & 14)', () => {
  it('loads PGN and verifies exactly 87 ply (44 white, 43 black)', () => {
    const chess = new Chess();
    chess.loadPgn(FULL_PGN);
    const history = chess.history({ verbose: true });
    expect(history.length).toBe(87);
    expect(REPLAY_STEPS.length).toBe(87);

    const whiteMoves = REPLAY_STEPS.filter((s) => s.color === 'w');
    const blackMoves = REPLAY_STEPS.filter((s) => s.color === 'b');
    expect(whiteMoves.length).toBe(44);
    expect(blackMoves.length).toBe(43);
  });

  it('asserts SAN for each ply matches exact PGN moves', () => {
    const expectedSanList = [
      'e4',
      'd6',
      'd4',
      'Nf6',
      'Nc3',
      'g6',
      'Be3',
      'Bg7',
      'Qd2',
      'c6',
      'f3',
      'b5',
      'Nge2',
      'Nbd7',
      'Bh6',
      'Bxh6',
      'Qxh6',
      'Bb7',
      'a3',
      'e5',
      'O-O-O',
      'Qe7',
      'Kb1',
      'a6',
      'Nc1',
      'O-O-O',
      'Nb3',
      'exd4',
      'Rxd4',
      'c5',
      'Rd1',
      'Nb6',
      'g3',
      'Kb8',
      'Na5',
      'Ba8',
      'Bh3',
      'd5',
      'Qf4+',
      'Ka7',
      'Rhe1',
      'd4',
      'Nd5',
      'Nbxd5',
      'exd5',
      'Qd6',
      'Rxd4',
      'cxd4',
      'Re7+',
      'Kb6',
      'Qxd4+',
      'Kxa5',
      'b4+',
      'Ka4',
      'Qc3',
      'Qxd5',
      'Ra7',
      'Bb7',
      'Rxb7',
      'Qc4',
      'Qxf6',
      'Kxa3',
      'Qxa6+',
      'Kxb4',
      'c3+',
      'Kxc3',
      'Qa1+',
      'Kd2',
      'Qb2+',
      'Kd1',
      'Bf1',
      'Rd2',
      'Rd7',
      'Rxd7',
      'Bxc4',
      'bxc4',
      'Qxh8',
      'Rd3',
      'Qa8',
      'c3',
      'Qa4+',
      'Ke1',
      'f4',
      'f5',
      'Kc1',
      'Rd2',
      'Qa7',
    ];

    expect(REPLAY_STEPS.length).toBe(expectedSanList.length);
    for (let i = 0; i < expectedSanList.length; i++) {
      expect(REPLAY_STEPS[i].san).toBe(expectedSanList[i]);
      expect(REPLAY_STEPS[i].ply).toBe(i + 1);
    }
  });

  it('asserts no promotion and no en passant occurred in the game', () => {
    for (const step of REPLAY_STEPS) {
      expect(step.promotion).toBeUndefined();
    }

    const chess = new Chess();
    chess.loadPgn(FULL_PGN);
    for (const move of chess.history({ verbose: true })) {
      expect(move.flags, `${move.san} is en passant`).not.toContain('e');
      expect(move.flags, `${move.san} is a promotion`).not.toContain('p');
    }
  });

  it('records the checked king square for every check', () => {
    for (const step of REPLAY_STEPS) {
      if (!step.isCheck) {
        expect(step.checkSquare).toBeUndefined();
        continue;
      }
      const kingId = step.color === 'w' ? 'b-K-e8' : 'w-K-e1';
      expect(step.checkSquare, step.san).toBe(SNAPSHOTS[step.ply][kingId]);
    }
  });

  it('golden snapshot of the 87-ply tag table (any change must be deliberate)', () => {
    const table = REPLAY_STEPS.map((s) => `${s.ply} ${s.san}: ${s.types.join(',')}`);
    expect(table).toMatchSnapshot();
  });

  it('asserts final FEN matches expected snapshot', () => {
    // Final position after 44.Qa7
    expect(GAME_DATA.finalFen).toBe('8/Q6p/6p1/5p2/5P2/2p3P1/3r3P/2K1k3 b - - 3 44');
  });

  it('asserts Black King path (Section 3)', () => {
    // c8 (O-O-O, ply 26) -> b8 (17, ply 34) -> a7 (20, ply 40) -> b6 (25, ply 50)
    // -> a5 (26, ply 52) -> a4 (27, ply 54) -> a3 (31, ply 62) -> b4 (32, ply 64)
    // -> c3 (33, ply 66) -> d2 (34, ply 68) -> d1 (35, ply 70) -> e1 (41, ply 82)
    const kingKeypoints: Record<number, string> = {
      26: 'c8', // 13...O-O-O
      34: 'b8', // 17...Kb8
      40: 'a7', // 20...Ka7
      50: 'b6', // 25...Kb6
      52: 'a5', // 26...Kxa5
      54: 'a4', // 27...Ka4
      62: 'a3', // 31...Kxa3
      64: 'b4', // 32...Kxb4
      66: 'c3', // 33...Kxc3
      68: 'd2', // 34...Kd2
      70: 'd1', // 35...Kd1
      82: 'e1', // 41...Ke1
    };

    for (const [plyStr, expectedSquare] of Object.entries(kingKeypoints)) {
      const ply = parseInt(plyStr, 10);
      const snapshot = SNAPSHOTS[ply];
      expect(snapshot['b-K-e8']).toBe(expectedSquare);
    }
  });

  it('asserts piece identity stability and snapshot consistency', () => {
    expect(SNAPSHOTS.length).toBe(88); // ply 0 to 87
    expect(INITIAL_PIECE_DEFS.length).toBe(32);

    for (let ply = 0; ply <= 87; ply++) {
      const snap = SNAPSHOTS[ply];
      expect(Object.keys(snap).length).toBe(32);
    }
  });

  it('verifies moveClassifier authored and factual tags', () => {
    // 24.Rxd4!! (ply 47)
    const ply47 = REPLAY_STEPS[SACRIFICE_PLY - 1];
    expect(ply47.types).toContain('SACRIFICE');
    expect(ply47.types[0]).toBe('SACRIFICE');

    // 26.Qxd4+ (ply 51)
    const ply51 = REPLAY_STEPS[50]; // ply 51
    expect(ply51.san).toBe('Qxd4+');
    expect(ply51.types).toEqual(['KING_HUNT', 'CHECK', 'CAPTURE']);

    // King hunt range 49..70
    for (let ply = KING_HUNT_RANGE[0]; ply <= KING_HUNT_RANGE[1]; ply++) {
      const step = REPLAY_STEPS[ply - 1];
      expect(step.types).toContain('KING_HUNT');
    }

    // 44.Qa7 (ply 87)
    const ply87 = REPLAY_STEPS[FINAL_PLY - 1];
    expect(ply87.types).toContain('FINAL_MOVE');
    expect(ply87.types[0]).toBe('FINAL_MOVE');

    // Check no other ply outside overrides has SACRIFICE or FINAL_MOVE
    for (const step of REPLAY_STEPS) {
      if (step.ply !== SACRIFICE_PLY) {
        expect(step.types).not.toContain('SACRIFICE');
      }
      if (step.ply !== FINAL_PLY) {
        expect(step.types).not.toContain('FINAL_MOVE');
      }
      if (step.ply < KING_HUNT_RANGE[0] || step.ply > KING_HUNT_RANGE[1]) {
        expect(step.types).not.toContain('KING_HUNT');
      }
    }
  });

  it('verifies coordinates mapping', () => {
    expect(squareToCoords('a1')).toEqual({ x: -3.5, z: 3.5 });
    expect(squareToCoords('h8')).toEqual({ x: 3.5, z: -3.5 });
    expect(squareToCoords('e4')).toEqual({ x: 0.5, z: 0.5 });
    expect(coordsToSquare(-3.5, 3.5)).toBe('a1');
    expect(coordsToSquare(3.5, -3.5)).toBe('h8');
    expect(coordsToSquare(0.5, 0.5)).toBe('e4');
  });
});
