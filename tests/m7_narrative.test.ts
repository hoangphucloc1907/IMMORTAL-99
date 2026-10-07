import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Chess } from 'chess.js';
import * as THREE from 'three';
import { REPLAY_STEPS } from '../src/game/replay';
import { squareToCoords } from '../src/game/coordinates';
import { ANNOTATIONS } from '../src/experience/annotations';
import { describeMove } from '../src/experience/moveText';
import { ENGINE_LINES, GHOST_DEPTH, engineEval, engineLinesAt, formatEval } from '../src/experience/engineAnalysis';
import { resolveShot } from '../src/experience/shots';
import { advance, advanceUntil, createHarness, expectResting, Harness } from './helpers';

const WIN_CP = 300;

describe('M7 — narrative text', () => {
  it('describes any ply from the game data itself', () => {
    expect(describeMove(REPLAY_STEPS[20])).toBe('White castles queenside.'); // 11.O-O-O
    expect(describeMove(REPLAY_STEPS[46])).toBe("White's rook takes the pawn on d4."); // 24.Rxd4
    expect(describeMove(REPLAY_STEPS[48])).toBe("White's rook moves from e1 to e7. Check to the king on a7."); // 25.Re7+
    expect(describeMove(REPLAY_STEPS[51])).toBe("Black's king takes the knight on a5."); // 26...Kxa5
  });

  it('every one of the 87 plies has an explanation in Study mode', () => {
    for (const step of REPLAY_STEPS) {
      const text = ANNOTATIONS[step.ply]?.explanation ?? describeMove(step);
      expect(text.length, `ply ${step.ply}`).toBeGreaterThan(10);
    }
  });

  it('formats engine scores', () => {
    expect(formatEval({ cp: 123 })).toBe('+1.23');
    expect(formatEval({ cp: -40 })).toBe('−0.40');
    expect(formatEval({ mate: 3 })).toBe('#3');
    expect(formatEval({ mate: -2 })).toBe('#−2');
  });
});

describe('M7 — engine analysis data (scripts/genEval.mjs)', () => {
  it('has an evaluation for every position 0..87', () => {
    for (let ply = 0; ply <= 87; ply++) {
      const e = engineEval(ply);
      expect(e?.ply, `ply ${ply}`).toBe(ply);
      expect(e!.cp !== undefined || e!.mate !== undefined, `ply ${ply} score`).toBe(true);
    }
  });

  it('every engine line is legal, a king alternative, never the move played, and clearly winning for White', () => {
    for (const line of ENGINE_LINES) {
      const played = REPLAY_STEPS[line.branchPly - 1];
      expect(played.color, line.id).toBe('b');
      expect(played.piece, line.id).toBe('k');
      expect(line.instead, line.id).toBe(played.san);
      expect(line.moves[0], `${line.id} must not spoil the real move`).not.toBe(played.san);

      const board = new Chess(played.fenBefore);
      const first = board.move(line.moves[0]);
      expect(first.piece, `${line.id} first move is a king move`).toBe('k');
      for (const san of line.moves.slice(1)) {
        expect(() => board.move(san), `${line.id}: ${san}`).not.toThrow();
      }

      const winning = (line.mate !== undefined && line.mate > 0) || (line.cp !== undefined && line.cp >= WIN_CP);
      expect(winning, `${line.id} is winning for White`).toBe(true);
    }
  });

  it('only approved lines reach production, and only at full depth', () => {
    for (const line of ENGINE_LINES.filter((l) => l.approved)) {
      expect(line.depth, line.id).toBeGreaterThanOrEqual(Math.max(30, GHOST_DEPTH));
    }
    for (const line of ENGINE_LINES.filter((l) => !l.approved)) {
      expect(engineLinesAt(line.branchPly, false)).not.toContain(line);
    }
  });
});

describe('M7 — Kasparov’s Vision in Study mode', () => {
  let h: Harness;

  beforeEach(() => {
    h = createHarness();
  });

  afterEach(() => {
    h.director.dispose();
  });

  const anyLine = ENGINE_LINES[0];

  it.runIf(!!anyLine)('plays an engine line with ghosts over the dimmed board, then returns to the game', () => {
    const line = anyLine!;
    h.director.setMode('study');
    h.director.seek(line.branchPly);

    h.director.playEngineLine(line.id);
    expect(h.registry.ghostBoard.isActive()).toBe(true);
    expect(h.store.getState().ghostLineId).toBe(line.id);
    const king = h.registry.getPiece('b-K-e8')!;
    const material = (king.children[0] as THREE.Mesh).material as THREE.Material;
    expect(material.opacity).toBeLessThan(0.5); // real pieces dimmed

    // The first ghost move: the Black king goes to its alternative square
    const board = new Chess(REPLAY_STEPS[line.branchPly - 1].fenBefore);
    const first = board.move(line.moves[0]);
    advance(0.6 + 0.6);
    const target = squareToCoords(first.to);
    const ghostOnTarget = h.registry.ghostBoard.group.children.some(
      (mesh) =>
        mesh.visible && Math.abs(mesh.position.x - target.x) < 0.01 && Math.abs(mesh.position.z - target.z) < 0.01,
    );
    expect(ghostOnTarget, `a ghost stands on ${first.to}`).toBe(true);

    advanceUntil(() => !h.director.isBusy(), 60);
    expect(h.registry.ghostBoard.isActive()).toBe(false);
    expect(h.store.getState().ghostLineId).toBeNull();
    expectResting(h, line.branchPly);
  });

  it.runIf(!!anyLine)('seek or play during an engine line returns to the real game', () => {
    const line = anyLine!;
    h.director.setMode('study');
    h.director.seek(line.branchPly);
    h.director.playEngineLine(line.id);
    advance(1.0);

    h.director.seek(30);
    expect(h.registry.ghostBoard.isActive()).toBe(false);
    expectResting(h, 30);

    h.director.seek(line.branchPly);
    h.director.playEngineLine(line.id);
    advance(1.0);
    h.director.next();
    expect(h.registry.ghostBoard.isActive()).toBe(false);
    advanceUntil(() => !h.director.isBusy(), 30);
    expectResting(h, line.branchPly + 1);
  });
});

describe('M7 — the hunted king’s point of view (34.Qa1+)', () => {
  it('sits just behind the king on c3, looking toward the queen on a1', () => {
    const pov = resolveShot('KING_POV', 67);
    const king = squareToCoords('c3');
    const queen = squareToCoords('a1');
    const camera = new THREE.Vector3(...pov.position);
    expect(Math.hypot(camera.x - king.x, camera.z - king.z)).toBeLessThan(2);
    // Farther from the queen than the king is: we look past the king's shoulder
    expect(Math.hypot(camera.x - queen.x, camera.z - queen.z)).toBeGreaterThan(
      Math.hypot(king.x - queen.x, king.z - queen.z),
    );
  });
});
