import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { advance, createHarness, expectResting, Harness } from './helpers';

describe('Director — seek is deterministic state reconstruction (§7, §14)', () => {
  let h: Harness;

  beforeEach(() => {
    h = createHarness();
  });

  afterEach(() => {
    h.director.dispose();
  });

  it('fixed seek sequence 47 → 60 → 12 → 70 → 33 → 87 → 0', () => {
    for (const ply of [47, 60, 12, 70, 33, 87, 0]) {
      h.director.seek(ply);
      expectResting(h, ply);
    }
  });

  it('random sequence (200 steps): seeks mid-animation, during act transitions, across modes and speeds', () => {
    let seed = 42;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    for (let i = 0; i < 200; i++) {
      // Get some animation running first, sometimes deep into it
      const action = random();
      if (action < 0.3) h.director.play();
      else if (action < 0.5) h.director.next();
      else if (action < 0.6) h.director.setSpeed([0.5, 1, 1.5, 2][Math.floor(random() * 4)]);
      advance(random() * 3);

      if (random() < 0.15) {
        h.director.setMode(h.store.getState().mode === 'cinematic' ? 'study' : 'cinematic');
      }

      const ply = Math.floor(random() * 88);
      h.director.seek(ply);
      expectResting(h, ply);
      expect(h.store.getState().playing).toBe(false);
      expect(h.director.isBusy()).toBe(false);
    }
  });

  it('prev() and next() are deterministic', () => {
    h.director.seek(47);
    h.director.prev();
    expectResting(h, 46);
    h.director.prev();
    expectResting(h, 45);

    // next() starts the move; a second next() completes it instantly
    h.director.next();
    expect(h.director.isBusy()).toBe(true);
    h.director.next();
    expect(h.director.isBusy()).toBe(false);
    expectResting(h, 46);
  });
});
