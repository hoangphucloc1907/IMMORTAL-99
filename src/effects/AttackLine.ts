import * as THREE from 'three';
import { BoardCoord } from '../game/coordinates';

export class AttackLineEffect {
  public group: THREE.Group;
  private line: THREE.Line;
  private material: THREE.LineBasicMaterial;
  private geometry: THREE.BufferGeometry;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'AttackLineEffect';

    const points = [new THREE.Vector3(0, 0.1, 0), new THREE.Vector3(0, 0.1, 0)];
    this.geometry = new THREE.BufferGeometry().setFromPoints(points);

    this.material = new THREE.LineBasicMaterial({
      color: 0x9e2a2b, // Subtle crimson
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    this.line = new THREE.Line(this.geometry, this.material);
    this.group.add(this.line);
    this.group.visible = false;
  }

  public setEndpoints(from: BoardCoord, to: BoardCoord): void {
    const positions = new Float32Array([from.x, 0.15, from.z, to.x, 0.15, to.z]);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.attributes.position.needsUpdate = true;
    this.material.opacity = 0.55;
    this.group.visible = true;
  }

  public setProgress(progress: number): void {
    const p = Math.max(0, Math.min(1, progress));
    this.material.opacity = (1 - p) * 0.55;
    if (p >= 1) {
      this.clear();
    }
  }

  public clear(): void {
    this.material.opacity = 0;
    this.group.visible = false;
  }
}
