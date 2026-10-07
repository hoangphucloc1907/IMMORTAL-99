import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder as ThreeMeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { readFileSync, statSync } from 'node:fs';
import { bakeWorldGeometry } from '../src/scene/bakeGeometry';
import { resolve } from 'node:path';
import { NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const PIECES = resolve(__dirname, '../src/assets/models/pieces.glb');
const TEXTURES = resolve(__dirname, '../src/assets/textures');

/** The KTX2 header fields we care about (KTX 2.0 spec §3), read directly — no parser dependency. */
function ktx2Info(file: string) {
  const bytes = readFileSync(file);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x32, 0x30, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];
  const dfd = view.getUint32(48, true); // dfdByteOffset
  return {
    isKtx2: magic.every((b, i) => bytes[i] === b),
    width: view.getUint32(20, true),
    height: view.getUint32(24, true),
    levels: view.getUint32(40, true),
    supercompression: view.getUint32(44, true), // 1 = BasisLZ (ETC1S), 2 = Zstandard
    colorModel: bytes[dfd + 12], // 163 = ETC1S, 166 = UASTC
    transfer: bytes[dfd + 14], // 1 = linear, 2 = sRGB
    size: bytes.byteLength,
  };
}

describe('pieces.glb (scripts/buildAssets.mjs)', () => {
  it('stays inside its share of the 3D budget (§9)', () => {
    expect(statSync(PIECES).size).toBeLessThanOrEqual(3_000_000);
  });

  it('has one mesh per piece type, footprint inside a square, base on the board', async () => {
    await MeshoptDecoder.ready;
    const io = new NodeIO()
      .registerExtensions(ALL_EXTENSIONS)
      .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const doc = await io.read(PIECES);
    const nodes = new Map(
      doc
        .getRoot()
        .listNodes()
        .map((n) => [n.getName(), n]),
    );

    expect([...nodes.keys()].sort()).toEqual(['b', 'k', 'n', 'p', 'q', 'r']);

    for (const [type, node] of nodes) {
      const prims = node.getMesh()!.listPrimitives();
      expect(prims, type).toHaveLength(1);
      expect(prims[0].getAttribute('POSITION'), type).toBeTruthy();
      expect(prims[0].getAttribute('NORMAL'), type).toBeTruthy();
      expect(prims[0].getMaterial(), `${type}: no source material (§9: no transmission)`).toBeNull();

      const { min, max } = getBounds(node);
      expect(min[1], `${type} base`).toBeCloseTo(0, 3);
      expect(max[0] - min[0], `${type} width`).toBeLessThan(0.9);
      expect(max[2] - min[2], `${type} depth`).toBeLessThan(0.9);
      expect(Math.abs(min[0] + max[0]) / 2, `${type} centred x`).toBeLessThan(0.05);
    }

    const height = (type: string) => {
      const { min, max } = getBounds(nodes.get(type)!);
      return max[1] - min[1];
    };
    // Staunton hierarchy: pawn < rook < knight < bishop < queen < king
    expect(height('p')).toBeLessThan(height('r'));
    expect(height('b')).toBeLessThan(height('q'));
    expect(height('q')).toBeLessThan(height('k'));
  });

  // Same path as the app (scene/pieceGeometries.ts): three's GLTFLoader + Meshopt, then bake.
  // Meshopt quantization puts the real scale/offset on the node — dropping it sank the pieces.
  it('loaded through GLTFLoader, baked pieces stand on the board at their real size', async () => {
    await ThreeMeshoptDecoder.ready;
    const bytes = readFileSync(PIECES);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const gltf = await new GLTFLoader().setMeshoptDecoder(ThreeMeshoptDecoder).parseAsync(buffer, '');

    const expectedHeight = { p: 0.73, k: 1.67 };
    for (const [type, height] of Object.entries(expectedHeight)) {
      const mesh = gltf.scene.getObjectByName(type)!.getObjectByProperty('isMesh', true) as THREE.Mesh;
      const box = bakeWorldGeometry(mesh).boundingBox!;
      expect(box.min.y, `${type} base`).toBeCloseTo(0, 2);
      expect(box.max.y - box.min.y, `${type} height`).toBeCloseTo(height, 1);
      expect(box.max.x - box.min.x, `${type} width`).toBeLessThan(0.9);
    }
  });
});

describe('board stone textures (scripts/buildStoneTextures.mjs)', () => {
  const ETC1S = 163;
  const UASTC = 166;
  const files = ['dark', 'light'].flatMap((stone) =>
    ['color', 'normal', 'roughness'].map((map) => ({
      stone,
      map,
      path: resolve(TEXTURES, `stone-${stone}-${map}.ktx2`),
    })),
  );

  it('fits next to pieces.glb inside the 3D budget (§9: 4–6 MB)', () => {
    const textures = files.reduce((sum, f) => sum + statSync(f.path).size, 0);
    expect(textures).toBeLessThanOrEqual(3_000_000);
    expect(textures + statSync(PIECES).size).toBeLessThanOrEqual(6_000_000);
  });

  it('colour is 2K ETC1S sRGB; normal is 1K UASTC + Zstd; roughness is 1K ETC1S linear; all mipmapped', () => {
    for (const { stone, map, path } of files) {
      const info = ktx2Info(path);
      const label = `${stone}-${map}`;
      expect(info.isKtx2, label).toBe(true);
      const size = map === 'color' ? 2048 : 1024;
      expect([info.width, info.height], label).toEqual([size, size]);
      expect(info.levels, `${label} mip chain`).toBe(Math.log2(size) + 1);

      if (map === 'normal') {
        expect(info.colorModel, label).toBe(UASTC);
        expect(info.supercompression, label).toBe(2);
      } else {
        expect(info.colorModel, label).toBe(ETC1S);
        expect(info.supercompression, label).toBe(1);
      }
      expect(info.transfer, `${label} transfer function`).toBe(map === 'color' ? 2 : 1);
    }
  });
});
