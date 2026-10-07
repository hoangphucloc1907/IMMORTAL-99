import * as THREE from 'three';
import { BoardCoord } from '../game/coordinates';

export class ImpactEffect {
  public group: THREE.Group;
  private mesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'ImpactEffect';

    const geometry = new THREE.RingGeometry(0.05, 0.45, 32);
    geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.MeshBasicMaterial({
      color: 0xdfcfb2, // Ivory accent
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.position.y = 0.02; // slightly above board surface
    this.group.add(this.mesh);
    this.group.visible = false;
  }

  public trigger(pos: BoardCoord): void {
    this.group.position.set(pos.x, 0, pos.z);
    this.mesh.scale.set(0.2, 0.2, 0.2);
    this.material.opacity = 0.5;
    this.group.visible = true;
  }

  public setProgress(progress: number): void {
    // 0 -> 1
    const p = Math.max(0, Math.min(1, progress));
    const scale = 0.2 + p * 0.9;
    this.mesh.scale.set(scale, scale, scale);
    this.material.opacity = (1 - p) * 0.5;
    if (p >= 1) {
      this.clear();
    }
  }

  public clear(): void {
    this.material.opacity = 0;
    this.group.visible = false;
  }
}
