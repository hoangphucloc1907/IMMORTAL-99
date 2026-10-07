import * as THREE from 'three';
import { Square } from '../game/types';
import { squareToCoords } from '../game/coordinates';
import { PressureMapData } from '../game/pressureMap';

const SURFACE_Y = 0.023; // slightly above boardMarks (0.022) to prevent z-fighting

// Spec (tactical-visualizations §2.2) and plan §12b B5: a faint copper-red glow, opacity 0.35–0.60, added on
// top of the stone (additive) so light and dark squares stay readable underneath — never a solid fill.
export const PRESSURE_OPACITY = { min: 0.35, max: 0.6 };
const PULSE_AMPLITUDE = 0.06;
// The king's remaining escapes: a thin, cool ivory ring each — the net closing is the rings running out
export const ESCAPE_RING_OPACITY = 0.4;
const PULSE_SPEED = 4; // rad/s

/** One attacker → min, three or more → max (computePressureMap weights: 0.65, 0.9, 1). */
export function pressureOpacity(weight: number): number {
  const t = Math.max(0, Math.min(1, (weight - 0.65) / 0.35));
  return PRESSURE_OPACITY.min + t * (PRESSURE_OPACITY.max - PRESSURE_OPACITY.min);
}

export class PressureGrid {
  public group: THREE.Group;
  private quadGeometry: THREE.PlaneGeometry;
  private ringGeometry: THREE.RingGeometry;
  private meshes: THREE.Mesh[] = [];
  private rings: THREE.Mesh[] = [];
  private time = 0;
  private baseOpacities: number[] = [];

  constructor(parent?: THREE.Group) {
    this.group = new THREE.Group();
    this.group.name = 'PressureGridEffect';

    this.quadGeometry = new THREE.PlaneGeometry(0.94, 0.94);
    this.quadGeometry.rotateX(-Math.PI / 2);

    this.ringGeometry = new THREE.RingGeometry(0.38, 0.44, 32);
    this.ringGeometry.rotateX(-Math.PI / 2);

    if (parent) {
      parent.add(this.group);
    }
  }

  public update(data: PressureMapData): void {
    this.clear();
    if (data.controlledSquares.length === 0 && data.safeEscapeSquares.length === 0) {
      return;
    }

    this.group.visible = true;

    for (const square of data.safeEscapeSquares) {
      const coords = squareToCoords(square);
      const ring = new THREE.Mesh(
        this.ringGeometry,
        new THREE.MeshBasicMaterial({
          color: 0xe8dcc4,
          transparent: true,
          opacity: ESCAPE_RING_OPACITY,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      ring.name = 'escape';
      ring.position.set(coords.x, SURFACE_Y + 0.001, coords.z);
      this.group.add(ring);
      this.rings.push(ring);
    }

    for (const item of data.controlledSquares) {
      const coords = squareToCoords(item.square as Square);
      const baseOpacity = pressureOpacity(item.weight);

      // Copper-red glow, added to the stone underneath
      const mat = new THREE.MeshBasicMaterial({
        color: 0xd9532f,
        transparent: true,
        opacity: baseOpacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(this.quadGeometry, mat);
      mesh.position.set(coords.x, SURFACE_Y, coords.z);
      this.group.add(mesh);
      this.meshes.push(mesh);
      this.baseOpacities.push(baseOpacity);
    }
  }

  /**
   * A gentle pulse only while the game is playing and motion is allowed; otherwise the decals sit at their
   * base opacity, so a resting ply always looks the same (no frozen mid-pulse frame).
   */
  public tick(delta: number, animate: boolean): void {
    if (!this.group.visible || this.meshes.length === 0) return;
    this.time = animate ? this.time + delta : 0;
    const offset = animate ? PULSE_AMPLITUDE * Math.sin(this.time * PULSE_SPEED) : 0;

    for (let i = 0; i < this.meshes.length; i++) {
      const mat = this.meshes[i].material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(PRESSURE_OPACITY.min, Math.min(PRESSURE_OPACITY.max, this.baseOpacities[i] + offset));
    }
  }

  public clear(): void {
    for (const mesh of [...this.meshes, ...this.rings]) {
      this.group.remove(mesh);
      (mesh.material as THREE.Material).dispose();
    }
    this.meshes = [];
    this.rings = [];
    this.baseOpacities = [];
    this.time = 0;
    this.group.visible = false;
  }
}
