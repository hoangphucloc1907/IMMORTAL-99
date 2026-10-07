// Usage: node scripts/inspectGlb.mjs <file.glb> — lists nodes, meshes, vertex counts, bounds, materials, textures
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/core';
import { MeshoptDecoder } from 'meshoptimizer';

// The decoder lets it read Meshopt-compressed output too (src/assets/models/pieces.glb), not just sources
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
const fmt = (v) => v.map((n) => n.toFixed(3)).join(',');
for (const node of root.listNodes()) {
  const mesh = node.getMesh();
  if (!mesh) continue;
  const verts = mesh.listPrimitives().reduce((s, p) => s + (p.getAttribute('POSITION')?.getCount() ?? 0), 0);
  const b = getBounds(node);
  const mats = mesh
    .listPrimitives()
    .map((p) => p.getMaterial()?.getName())
    .join('|');
  console.log(
    `${node.getName().padEnd(28)} mesh=${mesh.getName().padEnd(26)} v=${String(verts).padStart(6)} t=[${fmt(node.getTranslation())}] min=[${fmt(b.min)}] max=[${fmt(b.max)}] mat=${mats}`,
  );
}
console.log('--- textures');
for (const t of root.listTextures())
  console.log(t.getName(), t.getMimeType(), t.getSize()?.join('x'), (t.getImage()?.byteLength / 1e6).toFixed(2) + 'MB');
console.log(
  'meshes:',
  root.listMeshes().length,
  'materials:',
  root
    .listMaterials()
    .map((m) => m.getName())
    .join(', '),
);
