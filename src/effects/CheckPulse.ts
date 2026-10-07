import * as THREE from 'three';
import { BoardCoord } from '../game/coordinates';

export class CheckPulseEffect {
  public group: THREE.Group;
  private ringMesh: THREE.Mesh;
  private ringMaterial: THREE.MeshBasicMaterial;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'CheckPulseEffect';

    const geometry = new THREE.RingGeometry(0.2, 0.48, 32);
    geometry.rotateX(-Math.PI / 2);

    this.ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x8b1e22, // Deep oxblood red per Section 10
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.ringMesh = new THREE.Mesh(geometry, this.ringMaterial);
    this.ringMesh.position.y = 0.025;
    this.group.add(this.ringMesh);
    this.group.visible = false;
  }

  public show(pos: BoardCoord, intensity = 0.5): void {
    this.group.position.set(pos.x, 0, pos.z);
    this.ringMaterial.opacity = 0.4 + intensity * 0.4;
    this.ringMesh.scale.set(1, 1, 1);
    this.group.visible = true;
  }

  public setProgress(progress: number): void {
    // 2-pulse wave: sin(progress * 2 * PI)
    const p = Math.max(0, Math.min(1, progress));
    const pulseFactor = Math.abs(Math.sin(p * Math.PI * 2));
    this.ringMesh.scale.set(0.9 + pulseFactor * 0.35, 1, 0.9 + pulseFactor * 0.35);
    this.ringMaterial.opacity = (1 - p) * 0.6 * pulseFactor;
    if (p >= 1) {
      this.clear();
    }
  }

  public clear(): void {
    this.ringMaterial.opacity = 0;
    this.group.visible = false;
  }
}
