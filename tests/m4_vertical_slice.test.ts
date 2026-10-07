import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { REPLAY_STEPS } from '../src/game/replay';
import { squareToCoords } from '../src/game/coordinates';
import { TENSION } from '../src/experience/tension';
import { LIGHTING_PRESETS } from '../src/experience/atmosphere';
import { CHECK_LABEL_PLIES } from '../src/animation/CheckAnimation';
import { sacrificeHoldSeconds } from '../src/animation/SacrificeAnimation';
import { finalHoldSeconds } from '../src/animation/FinalAnimation';
import { advance, advanceUntil, createHarness, expectResting, Harness } from './helpers';

describe('Milestone 4 — Vertical Slice: The Sacrifice (acceptance gate)', () => {
  let h: Harness;

  beforeEach(() => {
    h = createHarness();
  });

  afterEach(() => {
    h.director.dispose();
  });

  it('1. the four plies of the slice: 23...Qd6 → 24.Rxd4!! → 24...cxd4 → 25.Re7+', () => {
    const [qd6, rxd4, cxd4, re7] = REPLAY_STEPS.slice(45, 49);

    expect(qd6.san).toBe('Qd6');
    expect(rxd4.san).toBe('Rxd4');
    expect(rxd4.types[0]).toBe('SACRIFICE');
    expect([rxd4.from, rxd4.to]).toEqual(['d1', 'd4']);
    expect(rxd4.pieceId).toBe('w-R-a1'); // the queenside rook, on d1 since 11.O-O-O
    expect(cxd4.san).toBe('cxd4');
    expect(cxd4.capturedId).toBe('w-R-a1');
    expect(re7.san).toBe('Re7+');
    expect(re7.types).toEqual(['KING_HUNT', 'CHECK']);
    expect(re7.checkSquare).toBe('a7');
    expect(CHECK_LABEL_PLIES).toContain(49);
  });

  it('2. tension curve: build-up, silence on the sacrifice, payoff', () => {
    expect(TENSION[46]).toBeGreaterThan(0.8);
    expect(TENSION[47]).toBeLessThan(0.1);
    expect(TENSION[49]).toBeGreaterThan(0.6);
  });

  it('3. dramatic holds keep their floor at every speed (measured on the clock)', () => {
    for (const speed of [0.5, 1, 1.5, 2]) {
      expect(sacrificeHoldSeconds(speed)).toBeGreaterThanOrEqual(1.5);
      expect(finalHoldSeconds(speed)).toBeGreaterThanOrEqual(3.0);
    }

    // At 2x the whole of 24.Rxd4 still runs: (2.2 pre-roll + 1.6 rook + 0.6 dissolve) / 2 + 1.5 hold
    h.director.setSpeed(2);
    h.director.seek(46);
    h.director.next();
    const elapsed = advanceUntil(() => !h.director.isBusy(), 30);
    expect(elapsed).toBeCloseTo((2.2 + 1.6 + 0.6) / 2 + sacrificeHoldSeconds(2), 1);
  });

  it('4. played continuously, the text never overlaps and arrives in story order', () => {
    const texts: string[] = [];
    const unsubscribe = h.store.subscribe((s, prev) => {
      expect(s.overlay && s.actTitleCard, 'overlay and title card on screen together').toBeFalsy();
      if (s.overlay && s.overlay !== prev.overlay) texts.push(s.overlay);
      if (s.actTitleCard && s.actTitleCard !== prev.actTitleCard) texts.push(s.actTitleCard);
    });

    h.director.seek(46);
    h.director.play();
    advanceUntil(() => h.director.getPly() === 50, 60);
    h.director.pause();
    unsubscribe();

    expect(texts).toEqual(['24. Rxd4!!', 'III · THE SACRIFICE', 'CHECK', 'IV · THE HUNT']);
  });

  it('5. light: darkness and a spot on the d-file for the sacrifice, re-opening on 25.Re7+', () => {
    h.director.seek(46);
    h.director.play();
    advance(2.0); // inside the pre-roll of 24.Rxd4
    expect(h.registry.appliedLighting).toBe('ACT_III');
    expect(h.registry.lights.ambient!.intensity).toBeCloseTo(LIGHTING_PRESETS.ACT_III.ambient, 3);
    expect(h.registry.lights.spot!.intensity).toBeCloseTo(LIGHTING_PRESETS.ACT_III.spot, 3);

    advanceUntil(() => h.director.getPly() === 49, 60);
    h.director.pause();
    expect(h.registry.appliedLighting).toBe('ACT_IV');
    expect(h.registry.lights.spot!.intensity).toBeCloseTo(0, 3);
  });

  it('6. the pause shows the lines of force, and the payoff check pulses on a7', () => {
    h.director.seek(46);
    h.director.next();
    advance(4.4 + 0.8); // impact (3.8) + dissolve, then into the pause
    expect(h.registry.forceLines.group.visible).toBe(true);
    advanceUntil(() => !h.director.isBusy(), 30);
    expect(h.registry.forceLines.group.visible).toBe(false);

    h.director.seek(48);
    h.director.next();
    advance(1.0); // the rook has landed on e7
    const a7 = squareToCoords('a7');
    expect(h.registry.checkPulse.group.visible).toBe(true);
    expect(h.registry.checkPulse.group.position.x).toBeCloseTo(a7.x, 3);
    expect(h.registry.checkPulse.group.position.z).toBeCloseTo(a7.z, 3);
  });

  it('7. scrubbing into and out of the slice — including mid-animation — stays exact', () => {
    for (const ply of [40, 47, 48, 49, 30]) {
      h.director.seek(ply);
      expectResting(h, ply);
    }

    // Interrupt 24.Rxd4 while the rook is travelling, then while 25.Re7+ is checking
    h.director.seek(46);
    h.director.play();
    advance(3.6);
    h.director.seek(49);
    expectResting(h, 49);

    h.director.seek(48);
    h.director.next();
    advance(0.8);
    h.director.seek(47);
    expectResting(h, 47);
  });
});
