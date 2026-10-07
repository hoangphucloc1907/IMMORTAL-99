import { describe, it, expect } from 'vitest';
import { validateChallengeMove, SACRIFICE_CHALLENGE_PLY, getChallengeDetails } from '../src/game/challenge';
import { Director } from '../src/animation/Director';
import { SceneRegistry } from '../src/animation/sceneRegistry';
import { CameraRig } from '../src/animation/cameraRig';
import { SoundBank } from '../src/audio/soundBank';
import { createReplayStore } from '../src/store/replayStore';
import { advanceUntil, createHarness, expectResting } from './helpers';
import { Chess } from 'chess.js';
import { REPLAY_STEPS } from '../src/game/replay';

describe('Find the Move Challenge (Group D - Item 11)', () => {
  it('validates 24.Rxd4 correctly at sacrifice ply', () => {
    expect(SACRIFICE_CHALLENGE_PLY).toBe(46);
    expect(validateChallengeMove('d1', 'd4')).toBe(true);
    expect(validateChallengeMove('d1', 'd2')).toBe(false);
    expect(validateChallengeMove('e1', 'e7')).toBe(false);
  });

  it('provides challenge details and hints', () => {
    const details = getChallengeDetails(46);
    expect(details).toBeDefined();
    expect(details?.correctSan).toBe('24. Rxd4!!');
    expect(details?.hint).toContain('sacrifice');
  });

  it('triggers challenge pause before ply 47 when enabled', () => {
    const registry = new SceneRegistry();
    const cameraRig = new CameraRig();
    const soundBank = new SoundBank();
    const store = createReplayStore();
    store.getState().setChallengeEnabled(true);
    const director = new Director(registry, cameraRig, soundBank, undefined, store);

    director.seek(46);
    director.play();
    expect(store.getState().challengeActive).toBe(true);
    expect(store.getState().playing).toBe(false);
  });

  it('offers only legal choices that do not give the answer away', () => {
    const details = getChallengeDetails(SACRIFICE_CHALLENGE_PLY)!;
    const legal = new Chess(REPLAY_STEPS[SACRIFICE_CHALLENGE_PLY - 1].fenAfter).moves();
    const sans = details.choices.map((c) => c.san);

    for (const san of sans) expect(legal, `${san} is legal before 24.Rxd4`).toContain(san);
    expect(new Set(sans).size).toBe(sans.length);
    expect(details.choices.filter((c) => c.correct).map((c) => c.san)).toEqual([
      REPLAY_STEPS[SACRIFICE_CHALLENGE_PLY].san,
    ]);
    for (const san of sans) expect(san, 'no !!/!/? glyphs in the choices').not.toMatch(/[!?]/);
    expect(details.choices[0].correct, 'answer is not the first choice').toBe(false);
    // Nor the real follow-up 25.Re7+ (the payoff)
    expect(sans).not.toContain(REPLAY_STEPS[SACRIFICE_CHALLENGE_PLY + 2].san.replace(/[+#]/g, ''));
  });

  it('answering plays on into the real 24.Rxd4 cinematic instead of jumping past it', () => {
    const h = createHarness();
    h.store.getState().setChallengeEnabled(true);
    h.director.seek(46);
    h.director.play();
    expect(h.store.getState().challengeActive).toBe(true);

    h.director.resumeAfterChallenge();
    expect(h.store.getState().challengeActive).toBe(false);
    expect(h.store.getState().playing).toBe(true);
    // The sacrifice is animated (not a seek): still on ply 46 with the ply-47 timeline running
    expect(h.director.getPly()).toBe(46);
    expect(h.director.isBusy()).toBe(true);

    advanceUntil(() => h.director.getPly() === 47);
    h.director.pause();
    expect(h.store.getState().challengeActive).toBe(false);
  });

  it('a seek closes an open challenge', () => {
    const h = createHarness();
    h.store.getState().setChallengeEnabled(true);
    h.director.seek(46);
    h.director.play();
    expect(h.store.getState().challengeActive).toBe(true);

    h.director.seek(30);
    expect(h.store.getState().challengeActive).toBe(false);
    expectResting(h, 30);
  });

  it('never pauses for the challenge when it is disabled (default)', () => {
    const h = createHarness();
    expect(h.store.getState().challengeEnabled).toBe(false);
    h.director.seek(46);
    h.director.play();
    expect(h.store.getState().challengeActive).toBe(false);
    expect(h.director.isBusy()).toBe(true);
    h.director.pause();
  });
});
