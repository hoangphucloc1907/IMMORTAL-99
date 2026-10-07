import * as THREE from 'three';
import { BoardCoord } from '../game/coordinates';

const LINE_Y = 0.06;

/** Faint lines of force drawn during the pause after 24.Rxd4 — they hint, they never reveal moves. */
export class ForceLinesEffect {
  public group: THREE.Group;
  private segments: THREE.LineSegments;
  private material: THREE.LineBasicMaterial;
  private lines: Array<[BoardCoord, BoardCoord]> = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'ForceLinesEffect';

    this.material = new THREE.LineBasicMaterial({
      color: 0xc8b48a,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this.segments = new THREE.LineSegments(new THREE.BufferGeometry(), this.material);
    this.group.add(this.segments);
    this.group.visible = false;
  }

  public show(lines: Array<[BoardCoord, BoardCoord]>): void {
    this.lines = lines;
    this.segments.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(lines.length * 6), 3));
    this.setDrawProgress(0);
    this.material.opacity = 0;
    this.group.visible = true;
  }

  /** Each line grows from its origin toward its end (0 → 1). */
  public setDrawProgress(progress: number): void {
    const p = Math.max(0, Math.min(1, progress));
    const position = this.segments.geometry.getAttribute('position') as THREE.BufferAttribute;
    this.lines.forEach(([from, to], i) => {
      position.setXYZ(i * 2, from.x, LINE_Y, from.z);
      position.setXYZ(i * 2 + 1, from.x + (to.x - from.x) * p, LINE_Y, from.z + (to.z - from.z) * p);
    });
    position.needsUpdate = true;
  }

  public setOpacity(opacity: number): void {
    this.material.opacity = Math.max(0, Math.min(1, opacity));
  }

  public clear(): void {
    this.material.opacity = 0;
    this.group.visible = false;
  }
}
