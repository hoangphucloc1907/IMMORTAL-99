import * as THREE from 'three';
import { Square } from '../game/types';
import { squareToCoords } from '../game/coordinates';

const TRAIL_Y = 0.035;
const WIDTH = 0.14;
const COLOR = new THREE.Color(0xc89b52); // muted gold/bronze (§10)
const OLDEST_ALPHA = 0.1;
const NEWEST_ALPHA = 0.55;

/**
 * The Black king's route a7 → b6 → … → d1 as a flat ribbon on the board (WebGL lines are always
 * 1px). Older segments fade out, so the latest steps of the escape read strongest.
 */
export class KingTrailEffect {
  public group: THREE.Group;
  private mesh: THREE.Mesh;
  private geometry: THREE.BufferGeometry;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'KingTrailEffect';

    this.geometry = new THREE.BufferGeometry();
    const material = new THREE.MeshBasicMaterial({
      vertexColors: true, // RGBA: per-segment fade
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.group.add(this.mesh);
    this.group.visible = false;
  }

  public setTrail(squares: Square[]): void {
    if (!squares || squares.length < 2) {
      this.clear();
      return;
    }

    const points = squares.map((sq) => squareToCoords(sq));
    const segments = points.length - 1;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < segments; i++) {
      const a = points[i];
      const b = points[i + 1];
      const length = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      // Half-width offset, perpendicular to the segment on the board plane
      const nx = (-(b.z - a.z) / length) * (WIDTH / 2);
      const nz = ((b.x - a.x) / length) * (WIDTH / 2);
      const alpha = OLDEST_ALPHA + ((NEWEST_ALPHA - OLDEST_ALPHA) * (i + 1)) / segments;

      const base = positions.length / 3;
      positions.push(
        a.x + nx,
        TRAIL_Y,
        a.z + nz,
        a.x - nx,
        TRAIL_Y,
        a.z - nz,
        b.x + nx,
        TRAIL_Y,
        b.z + nz,
        b.x - nx,
        TRAIL_Y,
        b.z - nz,
      );
      for (let v = 0; v < 4; v++) colors.push(COLOR.r, COLOR.g, COLOR.b, alpha);
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }

    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
    this.geometry.setIndex(indices);
    this.geometry.computeBoundingSphere();
    this.group.visible = true;
  }

  public clear(): void {
    this.group.visible = false;
  }
}
