import * as THREE from 'three';
import { PieceSymbol } from '../game/types';
import { bakeWorldGeometry } from './bakeGeometry';
import piecesUrl from '../assets/models/pieces.glb?url';

export type PieceGeometries = Record<PieceSymbol, THREE.BufferGeometry>;

const PIECE_TYPES: PieceSymbol[] = ['p', 'n', 'b', 'r', 'q', 'k'];

let pending: Promise<PieceGeometries> | null = null;

/**
 * Loads the Staunton set baked by scripts/buildAssets.mjs (one mesh per piece type, Meshopt
 * compressed, decoder bundled — nothing fetched from a third-party CDN). Loaded once and shared.
 * The loader and decoder are their own chunk (§9 entry budget); placeholders cover the wait.
 */
export function loadPieceGeometries(): Promise<PieceGeometries> {
  if (!pending) {
    pending = Promise.all([
      import('three/examples/jsm/loaders/GLTFLoader.js'),
      import('three/examples/jsm/libs/meshopt_decoder.module.js'),
    ])
      .then(([{ GLTFLoader }, { MeshoptDecoder }]) =>
        new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(piecesUrl),
      )
      .then((gltf) => {
        const geometries = {} as PieceGeometries;
        for (const type of PIECE_TYPES) {
          const mesh = gltf.scene.getObjectByName(type)?.getObjectByProperty('isMesh', true) as THREE.Mesh | undefined;
          if (!mesh) throw new Error(`pieces.glb has no mesh for piece type "${type}"`);
          geometries[type] = bakeWorldGeometry(mesh);
        }
        return geometries;
      });
  }
  return pending;
}
