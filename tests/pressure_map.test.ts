import { describe, it, expect } from 'vitest';
import { Chess, Square as CSquare } from 'chess.js';
import { REPLAY_STEPS, SNAPSHOTS } from '../src/game/replay';
import { computePressureMap } from '../src/game/pressureMap';

describe('Pressure Map Logic (Group B - Tactical Visualizations)', () => {
  it('computes pressure data for Black King during King Hunt (ply 49..70)', () => {
    // At ply 49 (25.Re7+), Black King is on a7, checked by Re7
    const snapshot49 = SNAPSHOTS[49];
    const pressure49 = computePressureMap(snapshot49);
    expect(pressure49.kingSquare).toBe('a7');
    expect(pressure49.controlledSquares.length).toBeGreaterThan(0);
    // At ply 50 (25...Kb6), Black King moves to b6
    const snapshot50 = SNAPSHOTS[50];
    const pressure50 = computePressureMap(snapshot50);
    expect(pressure50.kingSquare).toBe('b6');
    expect(pressure50.controlledSquares.length).toBeGreaterThan(0);
  });

  it('demonstrates that escape squares contract as Black King is driven deep (ply 49 to 70)', () => {
    // Check at ply 49 vs ply 69 (35.Qb2+)
    const snapshot49 = SNAPSHOTS[49];
    const snapshot69 = SNAPSHOTS[69];

    const pressure49 = computePressureMap(snapshot49);
    const pressure69 = computePressureMap(snapshot69);

    expect(pressure49.kingSquare).toBe('a7');
    expect(pressure69.kingSquare).toBe('d2');
    expect(pressure69.controlledSquares.length).toBeGreaterThan(0);
  });

  // chess.js is the reference: the net must be the real one, every ply of the hunt
  it('matches chess.js on every hunt ply: controlled squares and the king’s real escapes', () => {
    for (let ply = 49; ply <= 70; ply++) {
      const fen = REPLAY_STEPS[ply - 1].fenAfter;
      const chess = new Chess(fen);
      const pressure = computePressureMap(SNAPSHOTS[ply]);
      const king = pressure.kingSquare;

      const kf = king.charCodeAt(0) - 97;
      const kr = Number(king[1]) - 1;
      const attacked: string[] = [];
      for (let df = -2; df <= 2; df++) {
        for (let dr = -2; dr <= 2; dr++) {
          const f = kf + df;
          const r = kr + dr;
          if ((!df && !dr) || f < 0 || f > 7 || r < 0 || r > 7) continue;
          const sq = `${String.fromCharCode(97 + f)}${r + 1}` as CSquare;
          if (chess.isAttacked(sq, 'w')) attacked.push(sq);
        }
      }
      expect(pressure.controlledSquares.map((c) => c.square).sort(), `controlled at ply ${ply}`).toEqual(
        attacked.sort(),
      );

      // The king's legal moves with Black to move (on White's turn too: where could it go?)
      const [board, , castling] = fen.split(' ');
      const blackToMove = new Chess(`${board} b ${castling} - 0 1`);
      const legal = blackToMove.moves({ square: king as CSquare, verbose: true }).map((m) => m.to);
      expect([...pressure.safeEscapeSquares].sort(), `escapes at ply ${ply}`).toEqual(legal.sort());
    }
  });
});
