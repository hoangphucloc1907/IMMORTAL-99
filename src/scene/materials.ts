import * as THREE from 'three';
import { Color } from '../game/types';

/** 'high' = desktop with full effects; 'low' = mobile, tablet or reduced effects (§9, §12). */
export type MaterialQuality = 'high' | 'low';

/**
 * Piece materials (M8). No transmission anywhere (§9: an extra render pass for 16 pieces).
 * Ivory: warm, soft sheen in place of subsurface scattering. Obsidian: near-black glass-like
 * clearcoat that picks up the studio reflections. One material per piece — the capture dissolve
 * fades a single piece's opacity.
 */
export function createPieceMaterial(color: Color, quality: MaterialQuality): THREE.MeshStandardMaterial {
  if (quality === 'low') {
    return color === 'w'
      ? new THREE.MeshStandardMaterial({ color: 0xf2ece0, roughness: 0.3, metalness: 0.02 })
      : new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.2, metalness: 0.1 });
  }
  return color === 'w'
    ? new THREE.MeshPhysicalMaterial({
        color: 0xefe7d8,
        roughness: 0.34,
        metalness: 0,
        clearcoat: 0.35,
        clearcoatRoughness: 0.3,
        sheen: 0.5,
        sheenRoughness: 0.6,
        sheenColor: new THREE.Color(0xfff1d6), // warm light scattering through the ivory's edges
      })
    : new THREE.MeshPhysicalMaterial({
        color: 0x0c0d10,
        roughness: 0.16,
        metalness: 0.05,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
        specularIntensity: 0.9,
      });
}

// --- Procedural stone for the board ----------------------------------------------------------------
// Generated once at runtime from a fixed seed: no texture download, identical on every visit.
// (Photo-scanned stone compressed to KTX2 can replace this later without touching the board code.)

function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TEXTURE_SIZE = 256;

/** Grey-scale stone: mottled base + a few thin veins. Used as colour, roughness and bump source. */
function stoneCanvas(seed: number, base: number, mottle: number, vein: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d')!;
  const random = prng(seed);

  ctx.fillStyle = `rgb(${base},${base},${base})`;
  ctx.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  // Mottling: many soft, low-contrast blots
  for (let i = 0; i < 260; i++) {
    const x = random() * TEXTURE_SIZE;
    const y = random() * TEXTURE_SIZE;
    const r = 6 + random() * 28;
    const shade = base + (random() - 0.5) * mottle;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${shade},${shade},${shade},0.35)`);
    g.addColorStop(1, `rgba(${shade},${shade},${shade},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  // Veins: a handful of thin wandering strokes
  ctx.lineCap = 'round';
  for (let v = 0; v < 4; v++) {
    ctx.strokeStyle = `rgba(${vein},${vein},${vein},${0.18 + random() * 0.2})`;
    ctx.lineWidth = 0.6 + random() * 1.4;
    ctx.beginPath();
    let x = random() * TEXTURE_SIZE;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < TEXTURE_SIZE) {
      x += (random() - 0.5) * 22;
      y += 6 + random() * 14;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return canvas;
}

export interface StoneMaterialOptions {
  seed: number;
  tint: number; // final colour multiplier
  base: number; // 0–255 grey of the canvas
  roughness: number;
  quality: MaterialQuality;
}

export function createStoneMaterial({
  seed,
  tint,
  base,
  roughness,
  quality,
}: StoneMaterialOptions): THREE.MeshStandardMaterial {
  const canvas = stoneCanvas(seed, base, 34, base > 128 ? base - 70 : base + 60);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const material = new THREE.MeshStandardMaterial({ map, color: tint, roughness, metalness: 0.05 });
  if (quality === 'high') {
    // The same pattern as micro-relief and gloss variation: polished stone, slightly uneven
    const relief = new THREE.CanvasTexture(canvas);
    material.bumpMap = relief;
    material.bumpScale = 0.6;
    material.roughnessMap = relief;
  }
  return material;
}
