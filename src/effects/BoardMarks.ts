import * as THREE from 'three';
import { BoardCoord } from '../game/coordinates';

const SURFACE_Y = 0.022; // just above the square tops

/** Persistent marks derived from the ply: last-move squares and a static check ring. */
export class BoardMarksEffect {
  public group: THREE.Group;
  private fromMesh: THREE.Mesh;
  private toMesh: THREE.Mesh;
  private checkMesh: THREE.Mesh;
  private kingMesh: THREE.Mesh;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'BoardMarksEffect';

    const squareGeometry = new THREE.PlaneGeometry(0.96, 0.96);
    squareGeometry.rotateX(-Math.PI / 2);
    const moveMaterial = new THREE.MeshBasicMaterial({
      color: 0xdfcfb2,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
    });
    this.fromMesh = new THREE.Mesh(squareGeometry, moveMaterial);
    this.toMesh = new THREE.Mesh(squareGeometry, moveMaterial);

    const ringGeometry = new THREE.RingGeometry(0.36, 0.44, 40);
    ringGeometry.rotateX(-Math.PI / 2);
    this.checkMesh = new THREE.Mesh(
      ringGeometry,
      new THREE.MeshBasicMaterial({ color: 0x8b1e22, transparent: true, opacity: 0.5, depthWrite: false }),
    );

    const glowGeometry = new THREE.CircleGeometry(0.5, 48);
    glowGeometry.rotateX(-Math.PI / 2);
    this.kingMesh = new THREE.Mesh(
      glowGeometry,
      new THREE.MeshBasicMaterial({ color: 0x8fb3d9, transparent: true, opacity: 0.28, depthWrite: false }),
    );

    for (const mesh of [this.fromMesh, this.toMesh, this.checkMesh, this.kingMesh]) {
      mesh.position.y = SURFACE_Y;
      mesh.visible = false;
      this.group.add(mesh);
    }
  }

  public setLastMove(move?: [BoardCoord, BoardCoord]): void {
    this.fromMesh.visible = this.toMesh.visible = !!move;
    if (!move) return;
    this.fromMesh.position.set(move[0].x, SURFACE_Y, move[0].z);
    this.toMesh.position.set(move[1].x, SURFACE_Y, move[1].z);
  }

  public setCheck(pos?: BoardCoord): void {
    this.checkMesh.visible = !!pos;
    if (pos) this.checkMesh.position.set(pos.x, SURFACE_Y, pos.z);
  }

  /** Cold, quiet light under the trapped king in the final position. */
  public setKingHighlight(pos?: BoardCoord): void {
    this.kingMesh.visible = !!pos;
    if (pos) this.kingMesh.position.set(pos.x, SURFACE_Y, pos.z);
  }

  public isKingHighlighted(): boolean {
    return this.kingMesh.visible;
  }

  public clear(): void {
    this.setLastMove(undefined);
    this.setCheck(undefined);
    this.setKingHighlight(undefined);
  }
}
