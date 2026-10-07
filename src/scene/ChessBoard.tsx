import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useStore } from 'zustand';
import { globalReplayStore } from '../store/replayStore';
import { createStoneMaterial, MaterialQuality } from './materials';
import { loadStoneTextures, StoneMaps, stoneVariant } from './stoneTextures';

const VARIANTS = 4; // stone variants per square colour, so neighbouring squares never repeat
const BOARD_SIZE = 8.6; // squares (8) + a 0.3 border on each side

// The scans are glossier than §9 asks for (mean roughness 0.26 dark, 0.11 light): scale them to ~0.36 / ~0.40,
// the same values the procedural stone uses (which is also the 'low' tier, where there is no roughness map)
// The dark scan (mean sRGB 32) is also much lighter than §9's near-black albedo: tint it down so the squares
// keep their contrast and the slab's cloudy patches never read as light squares.
const STONE_LOOK = {
  dark: { roughness: 0.36, roughnessScale: 1.4, tint: 0xa0a0a0 },
  light: { roughness: 0.4, roughnessScale: 3.5, tint: 0xffffff },
};

/** Swap the procedural canvases for the scanned stone, in place (the meshes keep their materials). */
function applyStone(
  material: THREE.MeshStandardMaterial,
  maps: StoneMaps,
  variant: number,
  look: typeof STONE_LOOK.dark,
) {
  material.map?.dispose();
  material.bumpMap?.dispose();
  material.map = stoneVariant(maps.color, variant);
  material.color.set(look.tint);
  material.bumpMap = null;
  if (maps.normal && maps.roughness) {
    material.normalMap = stoneVariant(maps.normal, variant);
    material.normalScale.set(0.6, 0.6);
    material.roughnessMap = stoneVariant(maps.roughness, variant);
    material.roughness = look.roughnessScale;
  } else {
    material.roughnessMap = null;
    material.roughness = look.roughness;
  }
  material.needsUpdate = true;
}

/** a–h / 1–8 engraved in the border (§9); stronger in Study mode (§M9). */
function coordinatesTexture(): THREE.CanvasTexture {
  const px = 1024;
  const unit = px / BOARD_SIZE;
  const margin = 0.3 * unit;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgba(214, 200, 172, 1)';
  ctx.font = `600 ${Math.round(margin * 0.55)}px "IBM Plex Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 8; i++) {
    const along = margin + (i + 0.5) * unit;
    const file = String.fromCharCode(97 + i); // canvas left → right = a → h
    const rank = String(8 - i); // canvas top → bottom = 8 → 1 (White sits at the bottom)
    ctx.fillText(file, along, px - margin / 2);
    ctx.fillText(file, along, margin / 2);
    ctx.fillText(rank, margin / 2, along);
    ctx.fillText(rank, px - margin / 2, along);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export const ChessBoard: React.FC<{ quality: MaterialQuality }> = ({ quality }) => {
  const mode = useStore(globalReplayStore, (s) => s.mode);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  const squares = useMemo(() => {
    const list: Array<{ key: string; position: [number, number, number]; light: boolean; variant: number }> = [];
    for (let r = 0; r < 8; r++) {
      for (let f = 0; f < 8; f++) {
        list.push({
          key: `sq-${f}-${r}`,
          position: [f - 3.5, 0, 3.5 - r],
          light: (r + f) % 2 === 1,
          variant: (f * 3 + r * 5) % VARIANTS,
        });
      }
    }
    return list;
  }, []);

  // Black stone and smoky grey stone (§9), a few variants each
  const materials = useMemo(
    () => ({
      light: Array.from({ length: VARIANTS }, (_, i) =>
        createStoneMaterial({ seed: 101 + i, tint: 0xa6a39e, base: 190, roughness: 0.4, quality }),
      ),
      dark: Array.from({ length: VARIANTS }, (_, i) =>
        createStoneMaterial({ seed: 201 + i, tint: 0x2a2a2d, base: 70, roughness: 0.36, quality }),
      ),
    }),
    [quality],
  );
  const border = useMemo(
    () => new THREE.MeshStandardMaterial({ color: 0x17120e, roughness: 0.45, metalness: 0.35 }), // dark bronze-wood
    [],
  );
  const coordinates = useMemo(
    () => new THREE.MeshBasicMaterial({ map: coordinatesTexture(), transparent: true, depthWrite: false }),
    [],
  );
  coordinates.opacity = mode === 'study' ? 0.85 : 0.3;

  // Scanned stone replaces the procedural placeholder once it has loaded; on failure the placeholder stays
  useEffect(() => {
    let active = true;
    loadStoneTextures(gl, quality === 'high')
      .then((stone) => {
        if (!active) return;
        materials.dark.forEach((m, i) => applyStone(m, stone.dark, i, STONE_LOOK.dark));
        materials.light.forEach((m, i) => applyStone(m, stone.light, i, STONE_LOOK.light));
        invalidate();
      })
      .catch((error) => console.warn('Keeping procedural board stone:', error));
    return () => {
      active = false;
    };
  }, [gl, invalidate, materials, quality]);

  useEffect(
    () => () => {
      for (const m of [...materials.light, ...materials.dark]) {
        m.map?.dispose();
        m.bumpMap?.dispose();
        m.normalMap?.dispose();
        m.roughnessMap?.dispose();
        m.dispose();
      }
    },
    [materials],
  );

  return (
    <group name="ChessBoard">
      {squares.map((sq) => (
        <mesh
          key={sq.key}
          position={sq.position}
          receiveShadow
          material={(sq.light ? materials.light : materials.dark)[sq.variant]}
        >
          <boxGeometry args={[0.98, 0.04, 0.98]} />
        </mesh>
      ))}

      {/* Outer border */}
      <mesh position={[0, -0.05, 0]} receiveShadow material={border}>
        <boxGeometry args={[BOARD_SIZE, 0.1, BOARD_SIZE]} />
      </mesh>

      {/* Coordinates, just above the border */}
      <mesh position={[0, 0.002, 0]} rotation-x={-Math.PI / 2} material={coordinates} renderOrder={1}>
        <planeGeometry args={[BOARD_SIZE, BOARD_SIZE]} />
      </mesh>
    </group>
  );
};
