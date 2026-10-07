import * as THREE from 'three';

type FadableMaterial = THREE.Material & { opacity: number; transparent: boolean };

function forEachMaterial(target: THREE.Object3D, fn: (mat: FadableMaterial) => void): void {
  target.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of materials) fn(mat as FadableMaterial);
  });
}

export class DisintegrateEffect {
  // Applies a dissolve / alpha fade to a target mesh or group
  public applyToMesh(target: THREE.Object3D, progress: number): void {
    const p = Math.max(0, Math.min(1, progress));
    forEachMaterial(target, (mat) => {
      if (!mat.transparent) {
        mat.transparent = true;
        mat.needsUpdate = true;
      }
      mat.opacity = 1 - p;
    });

    if (p >= 1) {
      target.visible = false;
    }
  }

  public reset(target: THREE.Object3D): void {
    target.visible = true;
    forEachMaterial(target, (mat) => {
      mat.opacity = 1.0;
      if (mat.transparent) {
        // back to the opaque pass so sorting and shadows behave like an untouched piece
        mat.transparent = false;
        mat.needsUpdate = true;
      }
    });
  }
}
