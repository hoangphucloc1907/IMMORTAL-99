import * as THREE from 'three';

/**
 * Returns a float copy of a loaded mesh's geometry with the mesh's world transform baked in.
 *
 * Meshopt compression quantizes positions/normals (normalized int16/int8) and moves the
 * dequantization scale + offset onto the node. Using `mesh.geometry` alone would drop that
 * transform: pieces would be centred on the board surface (half sunk) and over-sized.
 */
export function bakeWorldGeometry(mesh: THREE.Mesh): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  // De-quantize to Float32 first: applyMatrix4 on int16 attributes would overflow
  for (const name of ['position', 'normal'] as const) {
    const source = mesh.geometry.getAttribute(name);
    if (!source) continue;
    const values = new Float32Array(source.count * 3);
    for (let i = 0; i < source.count; i++) {
      values[i * 3] = source.getX(i);
      values[i * 3 + 1] = source.getY(i);
      values[i * 3 + 2] = source.getZ(i);
    }
    geometry.setAttribute(name, new THREE.BufferAttribute(values, 3));
  }
  const index = mesh.geometry.getIndex();
  if (index) geometry.setIndex(index.clone());

  mesh.updateWorldMatrix(true, false);
  geometry.applyMatrix4(mesh.matrixWorld); // also transforms + renormalizes normals
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
