import * as THREE from 'three';
import { BoardCoord } from '../game/coordinates';
import { Color, PieceSymbol } from '../game/types';

export type PieceGeometrySet = Partial<Record<PieceSymbol, THREE.BufferGeometry>>;

const POOL_SIZE = 32;
const FALLBACK = new THREE.CylinderGeometry(0.25, 0.3, 0.8, 16).translate(0, 0.4, 0);

/**
 * "Kasparov's Vision" in Study mode (§A2): translucent pieces that play an engine line from a real
 * position while the real pieces are dimmed. Pure three.js; the Director drives every move.
 */
export class GhostBoardEffect {
  public group: THREE.Group;
  private meshes: THREE.Mesh[] = [];
  private bySquare = new Map<string, THREE.Mesh>();
  private geometries: PieceGeometrySet = {};
  private materials: Record<Color, THREE.MeshStandardMaterial>;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'GhostBoardEffect';
    const ghost = (color: number) =>
      new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false, roughness: 0.4 });
    this.materials = { w: ghost(0xe8edf5), b: ghost(0x3a4150) };

    for (let i = 0; i < POOL_SIZE; i++) {
      const mesh = new THREE.Mesh(FALLBACK, this.materials.w);
      mesh.visible = false;
      this.meshes.push(mesh);
      this.group.add(mesh);
    }
    this.group.visible = false;
  }

  /** The scene shares the loaded piece geometries (placeholder cylinders until then). */
  public setGeometries(geometries: PieceGeometrySet): void {
    this.geometries = geometries;
  }

  /** Lay out a whole position: pieces given as square → piece. */
  public show(pieces: Array<{ square: string; at: BoardCoord; type: PieceSymbol; color: Color }>): void {
    this.bySquare.clear();
    this.meshes.forEach((mesh, i) => {
      const piece = pieces[i];
      mesh.visible = !!piece;
      if (!piece) return;
      mesh.geometry = this.geometries[piece.type] ?? FALLBACK;
      mesh.material = this.materials[piece.color];
      mesh.rotation.set(0, piece.color === 'b' ? Math.PI : 0, 0);
      mesh.position.set(piece.at.x, 0, piece.at.z);
      this.bySquare.set(piece.square, mesh);
    });
    this.group.visible = true;
  }

  /** The ghost piece standing on `square` (to tween), if any. */
  public pieceAt(square: string): THREE.Object3D | undefined {
    return this.bySquare.get(square);
  }

  /** Bookkeeping after a move: the piece now lives on `to`; whatever stood there is removed. */
  public relocate(from: string, to: string): void {
    const moving = this.bySquare.get(from);
    const taken = this.bySquare.get(to);
    if (taken && taken !== moving) taken.visible = false;
    this.bySquare.delete(from);
    if (moving) this.bySquare.set(to, moving);
  }

  public remove(square: string): void {
    const mesh = this.bySquare.get(square);
    if (mesh) mesh.visible = false;
    this.bySquare.delete(square);
  }

  public isActive(): boolean {
    return this.group.visible;
  }

  public clear(): void {
    this.group.visible = false;
    this.bySquare.clear();
    for (const mesh of this.meshes) mesh.visible = false;
  }
}
