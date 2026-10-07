import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { REPLAY_STEPS } from '../src/game/replay';
import { squareToCoords } from '../src/game/coordinates';
import { Square } from '../src/game/types';
import { ACTS } from '../src/experience/acts';
import { resolveShot } from '../src/experience/shots';
import { trayPosition } from '../src/experience/capturedTray';
import { globalClock } from '../src/animation/clock';
import { baseMoveLandTime } from '../src/animation/MoveTimeline';
import { advance, advanceUntil, createHarness, expectResting, Harness } from './helpers';

type RestingFn = (ply: number, snapCamera: boolean, audioFade?: number) => void;

/** Records where the animation itself left the pieces, just before the Director's end-of-ply snap. */
function interceptPlyEnd(h: Harness, check: (ply: number) => void): void {
  const director = h.director as unknown as { applyRestingState: RestingFn };
  const original = director.applyRestingState.bind(h.director);
  director.applyRestingState = (ply, snapCamera, audioFade) => {
    if (!snapCamera) check(ply); // the end-of-ply call (seek snaps the camera)
    original(ply, snapCamera, audioFade);
  };
}

function expectLanded(h: Harness, ply: number): void {
  const step = REPLAY_STEPS[ply - 1];
  const at = (id: string, x: number, z: number) => {
    const piece = h.registry.getPiece(id)!;
    expect(piece.position.x, `${step.san}: ${id}.x`).toBeCloseTo(x, 2);
    expect(piece.position.z, `${step.san}: ${id}.z`).toBeCloseTo(z, 2);
    expect(piece.position.y, `${step.san}: ${id}.y`).toBeCloseTo(0, 2);
  };
  const to = squareToCoords(step.to);
  at(step.pieceId, to.x, to.z);
  if (step.capturedId) {
    const tray = trayPosition(step.capturedId, ply);
    at(step.capturedId, tray.x, tray.z);
  }
  if (step.rookMove) {
    const rookTo = squareToCoords(step.rookMove.to);
    at(step.rookMove.id, rookTo.x, rookTo.z);
  }
}

describe('Playback on the animation clock (§7 invariant)', () => {
  let h: Harness;

  beforeEach(() => {
    h = createHarness();
  });

  afterEach(() => {
    h.director.dispose();
  });

  it.each(['cinematic', 'study'] as const)(
    'every one of the 87 animations lands its pieces on the right squares (%s)',
    (mode) => {
      h.director.setMode(mode);
      h.director.setSpeed(2);
      interceptPlyEnd(h, (ply) => expectLanded(h, ply));

      for (let ply = 1; ply <= REPLAY_STEPS.length; ply++) {
        h.director.seek(ply - 1);
        h.director.next();
        advanceUntil(() => !h.director.isBusy(), 30);
        expectResting(h, ply);
      }
    },
  );

  it('plays the whole game at 1x: resting state after every ply, act budgets kept, ending shown', () => {
    const start = globalClock.getTime();
    const completedAt: number[] = [];
    const unsubscribe = h.store.subscribe((s, prev) => {
      if (s.ply === prev.ply) return;
      expectResting(h, s.ply);
      completedAt[s.ply] = globalClock.getTime() - start;
    });

    h.director.seek(0);
    h.director.play();
    advanceUntil(() => h.store.getState().showEnding && !h.director.isBusy(), 400);
    unsubscribe();

    expect(h.director.getPly()).toBe(87);
    expect(h.store.getState().playing).toBe(false);

    let previousEnd = 0;
    for (const act of ACTS) {
      const end = completedAt[act.plyRange[1]];
      expect(end - previousEnd, `${act.id} duration`).toBeLessThanOrEqual(act.budgetSeconds);
      previousEnd = end;
    }
    expect(previousEnd).toBeLessThanOrEqual(210); // ≤ 3.5 minutes
  });

  it('pause → play resumes the same move instead of restarting it', () => {
    // Reference: uninterrupted duration of 24.Rxd4
    h.director.seek(46);
    h.director.next();
    const uninterrupted = advanceUntil(() => !h.director.isBusy(), 30);

    const overlays: string[] = [];
    const unsubscribe = h.store.subscribe((s, prev) => {
      if (s.overlay && s.overlay !== prev.overlay) overlays.push(s.overlay);
    });

    h.director.seek(46);
    h.director.play();
    advance(1.0);
    h.director.pause();

    const rook = h.registry.getPiece('w-R-a1')!;
    const frozenAt = rook.position.clone();
    advance(3.0);
    expect(rook.position.equals(frozenAt)).toBe(true);
    expect(h.director.getPly()).toBe(46);

    h.director.play();
    const remaining = advanceUntil(() => h.director.getPly() === 47, 30);
    h.director.pause();
    unsubscribe();

    expect(remaining).toBeCloseTo(uninterrupted - 1.0, 1);
    expect(overlays.filter((o) => o === '24. Rxd4!!')).toHaveLength(1);
  });

  it('seek during playback stops playback', () => {
    h.director.seek(10);
    h.director.play();
    advance(0.3);
    h.director.seek(30);

    expect(h.store.getState().playing).toBe(false);
    expect(h.director.isBusy()).toBe(false);
    advance(5);
    expectResting(h, 30);
  });

  it('next() during playback finishes the current move and keeps playing', () => {
    h.director.seek(10);
    h.director.play();
    advance(0.2);
    h.director.next();

    expectResting(h, 11);
    expect(h.store.getState().playing).toBe(true);
    advanceUntil(() => h.director.getPly() === 12, 10);
    h.director.pause();
  });

  it.each([
    [39, 'b8'], // 20.Qf4+
    [49, 'a7'], // 25.Re7+
    [53, 'a5'], // 27.b4+
    [69, 'd2'], // 35.Qb2+ (after 34...Kd2)
  ])('the check lands with the piece and pulses on the checked king (ply %i → %s)', (ply, kingSquare) => {
    const step = REPLAY_STEPS[ply - 1];
    expect(step.checkSquare).toBe(kingSquare);

    h.director.seek(ply - 1);
    h.director.next();

    // Never before the checking piece reaches its square (sound and pulse would precede the move)
    advance(baseMoveLandTime(step) - 0.1);
    expect(h.registry.checkPulse.group.visible).toBe(false);
    advance(0.2);

    const expected = squareToCoords(kingSquare as Square);
    expect(h.registry.checkPulse.group.visible).toBe(true);
    expect(h.registry.checkPulse.group.position.x).toBeCloseTo(expected.x, 3);
    expect(h.registry.checkPulse.group.position.z).toBeCloseTo(expected.z, 3);
  });

  it('study mode: plain moves, no overlays, title cards or camera work', () => {
    h.director.setMode('study');
    h.director.seek(44);
    const cameraBefore = h.cameraRig.targetPosition.clone();
    const texts: string[] = [];
    const unsubscribe = h.store.subscribe((s) => {
      if (s.overlay) texts.push(s.overlay);
      if (s.actTitleCard) texts.push(s.actTitleCard);
    });

    h.director.play();
    advanceUntil(() => h.director.getPly() === 52, 30);
    h.director.pause();
    unsubscribe();

    expect(texts).toEqual([]);
    expect(h.cameraRig.targetPosition.equals(cameraBefore)).toBe(true);
  });

  it('reduced motion: no Dutch tilt and no camera shake during the hunt', () => {
    h.store.getState().setReducedMotion(true);
    let shakes = 0;
    const originalShake = h.cameraRig.triggerShake.bind(h.cameraRig);
    h.cameraRig.triggerShake = (intensity, duration) => {
      shakes++;
      originalShake(intensity, duration);
    };
    const tilt = resolveShot('DUTCH_TILT', 65);

    h.director.seek(58);
    h.director.play();
    let sawTilt = false;
    advanceUntil(() => {
      if (h.cameraRig.targetPosition.x === tilt.position[0] && h.cameraRig.targetPosition.z === tilt.position[2]) {
        sawTilt = true;
      }
      return h.director.getPly() === 70;
    }, 60);
    h.director.pause();

    expect(sawTilt).toBe(false);
    expect(shakes).toBe(0);
  });
});
