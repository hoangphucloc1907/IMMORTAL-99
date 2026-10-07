import * as THREE from 'three';
import { BoardCoord } from '../game/coordinates';

export class ParticlesEffect {
  public group: THREE.Group;
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private positions: Float32Array;
  private velocities: Float32Array;
  private activeCount = 0;
  private maxParticles = 24;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'ParticlesEffect';

    this.positions = new Float32Array(this.maxParticles * 3);
    this.velocities = new Float32Array(this.maxParticles * 3);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.material = new THREE.PointsMaterial({
      color: 0xcccccc,
      size: 0.04,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.group.add(this.points);
    this.group.visible = false;
  }

  public burst(pos: BoardCoord, isMobile = false): void {
    this.activeCount = isMobile ? 8 : 24;
    for (let i = 0; i < this.activeCount; i++) {
      const idx = i * 3;
      // Start near impact point
      this.positions[idx] = pos.x + (Math.random() - 0.5) * 0.2;
      this.positions[idx + 1] = 0.05 + Math.random() * 0.1;
      this.positions[idx + 2] = pos.z + (Math.random() - 0.5) * 0.2;

      // Gentle upward and outward drift
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.2 + Math.random() * 0.3;
      this.velocities[idx] = Math.cos(angle) * speed;
      this.velocities[idx + 1] = 0.3 + Math.random() * 0.4;
      this.velocities[idx + 2] = Math.sin(angle) * speed;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.material.opacity = 0.6;
    this.group.visible = true;
  }

  public setProgress(progress: number): void {
    const p = Math.max(0, Math.min(1, progress));
    for (let i = 0; i < this.activeCount; i++) {
      const idx = i * 3;
      this.positions[idx] += this.velocities[idx] * 0.016;
      this.positions[idx + 1] += this.velocities[idx + 1] * 0.016;
      this.positions[idx + 2] += this.velocities[idx + 2] * 0.016;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.material.opacity = (1 - p) * 0.6;

    if (p >= 1) {
      this.clear();
    }
  }

  public clear(): void {
    this.material.opacity = 0;
    this.group.visible = false;
    this.activeCount = 0;
  }
}
