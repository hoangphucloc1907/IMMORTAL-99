import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { ESCAPE_RING_OPACITY, PRESSURE_OPACITY, PressureGrid, pressureOpacity } from '../src/effects/PressureGrid';

describe('PressureGrid 3D Decal Effect (Group B - Tactical Visualizations)', () => {
  it('instantiates and manages decal meshes correctly', () => {
    const parent = new THREE.Group();
    const grid = new PressureGrid(parent);

    expect(grid.group.children.length).toBe(0);

    // Update with pressure data
    grid.update({
      kingSquare: 'b6',
      controlledSquares: [
        { square: 'a7', weight: 0.8, isKingAdjacent: true },
        { square: 'c7', weight: 0.6, isKingAdjacent: true },
      ],
      safeEscapeSquares: ['a5'],
    });

    expect(grid.group.children.length).toBe(3); // 2 pressure decals + 1 escape ring

    // Calling tick updates pulse
    grid.tick(0.016, true);
    expect(grid.group.children.length).toBe(3);

    // Calling clear removes all decal meshes
    grid.clear();
    expect(grid.group.children.length).toBe(0);
  });

  const data = {
    kingSquare: 'a4' as const,
    controlledSquares: [
      { square: 'a3' as const, weight: 0.65, isKingAdjacent: true }, // one attacker
      { square: 'b4' as const, weight: 1, isKingAdjacent: true }, // three or more
    ],
    safeEscapeSquares: [],
  };
  const opacities = (grid: PressureGrid) =>
    grid.group.children
      .filter((m) => m.name !== 'escape')
      .map((m) => ((m as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity);

  it('is a faint additive glow within the spec range 0.35–0.60 (§12b B5: readable, never a solid fill)', () => {
    const grid = new PressureGrid();
    grid.update(data);
    expect(opacities(grid)).toEqual([pressureOpacity(0.65), pressureOpacity(1)]);
    expect(pressureOpacity(0.65)).toBeCloseTo(PRESSURE_OPACITY.min);
    expect(pressureOpacity(1)).toBeCloseTo(PRESSURE_OPACITY.max);
    for (const m of grid.group.children) {
      expect(((m as THREE.Mesh).material as THREE.Material).blending).toBe(THREE.AdditiveBlending);
    }
    for (let i = 0; i < 200; i++) {
      grid.tick(0.05, true);
      for (const o of opacities(grid)) {
        expect(o).toBeGreaterThanOrEqual(PRESSURE_OPACITY.min);
        expect(o).toBeLessThanOrEqual(PRESSURE_OPACITY.max);
      }
    }
  });

  it('only pulses while animating; at rest (or under reduced motion) it sits exactly at its base opacity', () => {
    const grid = new PressureGrid();
    grid.update(data);
    const base = opacities(grid);
    grid.tick(0.3, true);
    expect(opacities(grid)).not.toEqual(base);
    grid.tick(0.016, false);
    expect(opacities(grid)).toEqual(base);
  });

  it('marks each real escape with a ring, and none once the net has closed', () => {
    const grid = new PressureGrid();
    const escapes = () => grid.group.children.filter((m) => m.name === 'escape');

    grid.update({ ...data, safeEscapeSquares: ['b5', 'a3'] });
    expect(escapes()).toHaveLength(2);
    for (const ring of escapes()) {
      const mat = (ring as THREE.Mesh).material as THREE.MeshBasicMaterial;
      expect(mat.opacity).toBe(ESCAPE_RING_OPACITY);
      expect(mat.blending).toBe(THREE.AdditiveBlending);
    }

    grid.update({ ...data, safeEscapeSquares: [] });
    expect(escapes()).toHaveLength(0);
    grid.clear();
    expect(grid.group.children).toHaveLength(0);
  });
});
