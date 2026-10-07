import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { createPieceMaterial } from '../src/scene/materials';
import { hasWebGL2 } from '../src/app/environment';

describe('M8 — piece materials', () => {
  it('never use transmission (§9), at any quality', () => {
    for (const quality of ['high', 'low'] as const) {
      for (const color of ['w', 'b'] as const) {
        const material = createPieceMaterial(color, quality) as THREE.MeshPhysicalMaterial;
        expect(material.transmission ?? 0, `${color}/${quality}`).toBe(0);
      }
    }
  });

  it('high quality: physical ivory with sheen, obsidian with a full clearcoat; low quality: standard', () => {
    const ivory = createPieceMaterial('w', 'high') as THREE.MeshPhysicalMaterial;
    const obsidian = createPieceMaterial('b', 'high') as THREE.MeshPhysicalMaterial;
    expect(ivory.isMeshPhysicalMaterial).toBe(true);
    expect(ivory.sheen).toBeGreaterThan(0);
    expect(obsidian.clearcoat).toBe(1);
    expect(obsidian.roughness).toBeLessThan(ivory.roughness);

    const mobile = createPieceMaterial('w', 'low');
    expect((mobile as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial).toBeFalsy();
  });

  it('each piece gets its own material (the capture dissolve fades one piece only)', () => {
    expect(createPieceMaterial('w', 'high')).not.toBe(createPieceMaterial('w', 'high'));
  });
});

describe('M10 — WebGL2 detection', () => {
  it('fails safe without a DOM (the fallback page is shown instead of crashing)', () => {
    expect(hasWebGL2()).toBe(false);
  });
});
