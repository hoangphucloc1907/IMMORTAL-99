import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { resolveShot } from '../src/experience/shots';
import { squareToCoords } from '../src/game/coordinates';
import { finalHoldSeconds } from '../src/animation/FinalAnimation';
import { KingTrailEffect } from '../src/effects/KingTrail';
import { advance, advanceUntil, createHarness, expectResting, Harness } from './helpers';

const QUEEN_TRAVEL = 2.4;

describe('M6 — king hunt and final', () => {
  let h: Harness;

  beforeEach(() => {
    h = createHarness();
  });

  afterEach(() => {
    h.director.dispose();
  });

  it('44.Qa7: the camera pulls back slowly over the whole hold, then rests on FINAL_PULLBACK', () => {
    const pullback = resolveShot('FINAL_PULLBACK', 87);
    const goal = new THREE.Vector3(...pullback.position);

    h.director.seek(86);
    h.director.next();
    advance(QUEEN_TRAVEL + 0.1);
    const early = h.cameraRig.targetPosition.distanceTo(goal);

    advance(finalHoldSeconds(1) / 2);
    const midway = h.cameraRig.targetPosition.distanceTo(goal);
    expect(midway).toBeGreaterThan(0.05); // still travelling halfway through the hold
    expect(midway).toBeLessThan(early);

    advanceUntil(() => !h.director.isBusy(), 30);
    expectResting(h, 87);
  });

  it('final position: a cold light stays on the trapped king (e1)', () => {
    h.director.seek(87);
    expect(h.registry.boardMarks.isKingHighlighted()).toBe(true);
    h.director.seek(86);
    expect(h.registry.boardMarks.isKingHighlighted()).toBe(false);
  });

  it('king trail: a ribbon whose newest segments are the strongest', () => {
    const trail = new KingTrailEffect();
    trail.setTrail(['a7', 'b6', 'a5', 'a4']);
    const mesh = trail.group.children[0] as THREE.Mesh;
    const color = mesh.geometry.getAttribute('color');
    expect(color.itemSize).toBe(4);
    const alphaOfSegment = (i: number) => color.getW(i * 4);
    expect(alphaOfSegment(0)).toBeLessThan(alphaOfSegment(1));
    expect(alphaOfSegment(1)).toBeLessThan(alphaOfSegment(2));

    // The ribbon lies along the route: its first vertices sit around a7
    const a7 = squareToCoords('a7');
    const position = mesh.geometry.getAttribute('position');
    expect(Math.abs(position.getX(0) - a7.x)).toBeLessThan(0.1);
    expect(Math.abs(position.getZ(0) - a7.z)).toBeLessThan(0.1);
  });
});
