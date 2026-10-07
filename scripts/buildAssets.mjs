// Builds src/assets/models/pieces.glb from Khronos "A Beautiful Game" (CC-BY 4.0, see CREDITS.md).
//
// Usage: node scripts/buildAssets.mjs <path/to/ABeautifulGame.glb>
//
// For each piece type the white instance is baked into a standalone mesh:
//   - centred on its footprint, base at y = 0, 1 board square = 1 unit (× PIECE_SCALE / SOURCE_SQUARE)
//   - rotated 180° so White faces -z (our board: White on +z, Black on -z)
//   - original materials / textures dropped (transmission is not allowed, §9) — the app supplies
//     its own ivory / obsidian materials
//   - welded, simplified (meshoptimizer) and Meshopt-compressed
// The Chessboard mesh is not used: the board stays the procedural black-stone board until M8.

import { statSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO, getBounds } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { joinPrimitives, meshopt, prune, simplify, transformPrimitive, weld } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

const SOURCE_SQUARE = 0.0625; // metres per square in the source model
const PIECE_SCALE = 11 / 16; // pieces slightly smaller than a 1:1 square fit (king ≈ 1.67 units tall)
const SIMPLIFY = { ratio: 0.25, error: 0.0005 };
const MAX_OUTPUT_BYTES = 3_000_000; // pieces share the 4–6 MB 3D budget with board + HDRI (§9)

// Our piece symbol → source node(s) of the white instance
const SOURCES = {
  p: ['Pawn_Body_W1', 'Pawn_Top_W1'],
  r: ['Castle_W1'],
  n: ['Knight_W1'],
  b: ['Bishop_W1'],
  q: ['Queen_W'],
  k: ['King_W'],
};

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const input = process.argv[2];
if (!input) {
  console.error('usage: node scripts/buildAssets.mjs <ABeautifulGame.glb>');
  process.exit(1);
}
const output = resolve(root, 'src/assets/models/pieces.glb');

// Column-major 4×4 helpers
const multiply = (a, b) => {
  const out = new Array(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) out[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return out;
};
const translation = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const scale = (s) => [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1];
const ROTATE_Y_180 = [-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1];

const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const source = await io.read(input);
const byName = new Map(
  source
    .getRoot()
    .listNodes()
    .map((n) => [n.getName(), n]),
);

const out = new Document();
out.createBuffer();
const scene = out.createScene('Pieces');

for (const [type, names] of Object.entries(SOURCES)) {
  const nodes = names.map((name) => {
    const node = byName.get(name);
    if (!node) throw new Error(`source node ${name} not found`);
    return node;
  });

  // Footprint of the whole piece (body + children) in world space
  const bounds = getBounds(nodes[0]);
  const cx = (bounds.min[0] + bounds.max[0]) / 2;
  const cz = (bounds.min[2] + bounds.max[2]) / 2;
  const toLocal = multiply(
    scale(PIECE_SCALE / SOURCE_SQUARE),
    multiply(ROTATE_Y_180, translation(-cx, -bounds.min[1], -cz)),
  );

  const prims = [];
  for (const node of nodes) {
    const matrix = multiply(toLocal, node.getWorldMatrix());
    for (const sourcePrim of node.getMesh().listPrimitives()) {
      // Copy only positions, normals and indices into the output document
      const position = sourcePrim.getAttribute('POSITION');
      const normal = sourcePrim.getAttribute('NORMAL');
      const indices = sourcePrim.getIndices();
      const prim = out
        .createPrimitive()
        .setAttribute('POSITION', out.createAccessor().setType('VEC3').setArray(position.getArray().slice()))
        .setAttribute('NORMAL', out.createAccessor().setType('VEC3').setArray(normal.getArray().slice()));
      if (indices) prim.setIndices(out.createAccessor().setType('SCALAR').setArray(indices.getArray().slice()));
      transformPrimitive(prim, matrix);
      prims.push(prim);
    }
  }

  const merged = prims.length > 1 ? joinPrimitives(prims) : prims[0];
  const mesh = out.createMesh(type).addPrimitive(merged);
  scene.addChild(out.createNode(type).setMesh(mesh));
}

await out.transform(
  weld(),
  simplify({ simplifier: MeshoptSimplifier, ...SIMPLIFY }),
  prune(),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);

mkdirSync(dirname(output), { recursive: true });
await io.write(output, out);

// Report + budget gate
for (const node of out.getRoot().listNodes()) {
  const b = getBounds(node);
  const verts = node
    .getMesh()
    .listPrimitives()
    .reduce((s, p) => s + p.getAttribute('POSITION').getCount(), 0);
  const size = b.max.map((v, i) => (v - b.min[i]).toFixed(2)).join(' × ');
  console.log(`${node.getName()}  vertices=${verts}  size=${size}`);
}
const bytes = statSync(output).size;
console.log(`wrote ${output} (${(bytes / 1e6).toFixed(2)} MB)`);
if (bytes > MAX_OUTPUT_BYTES) {
  console.error(`pieces.glb exceeds the ${MAX_OUTPUT_BYTES / 1e6} MB budget`);
  process.exit(1);
}
