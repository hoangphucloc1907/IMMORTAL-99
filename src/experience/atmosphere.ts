import { LightingPresetId } from './types';

export interface LightingPreset {
  ambient: number;
  key: number;
  rim: number;
  fill: number;
  spot: number; // narrow spotlight used to isolate the tactical zone
  spotTarget: [number, number]; // board x, z
  vignette: number; // base CSS vignette opacity (0..1), raised further by tension
}

// d1 → d4: the rook's path in 24.Rxd4!!
const D_FILE_CENTER: [number, number] = [-0.5, 2.0];

export const LIGHTING_PRESETS: Record<LightingPresetId, LightingPreset> = {
  ACT_I: { ambient: 0.6, key: 2.3, rim: 1.0, fill: 0.45, spot: 0, spotTarget: [0, 0], vignette: 0.22 },
  ACT_II: { ambient: 0.5, key: 2.1, rim: 1.1, fill: 0.4, spot: 0, spotTarget: [0, 0], vignette: 0.3 },
  // The sacrifice: periphery sinks into darkness, a single cone holds the d-file
  ACT_III: { ambient: 0.14, key: 0.6, rim: 0.5, fill: 0.08, spot: 4.0, spotTarget: D_FILE_CENTER, vignette: 0.65 },
  // 25.Re7+ — the light opens again
  ACT_IV: { ambient: 0.45, key: 2.2, rim: 1.3, fill: 0.35, spot: 0, spotTarget: [0, 0], vignette: 0.36 },
  ACT_V: { ambient: 0.42, key: 1.8, rim: 0.9, fill: 0.35, spot: 0, spotTarget: [0, 0], vignette: 0.34 },
  STUDY: { ambient: 0.7, key: 2.2, rim: 0.8, fill: 0.5, spot: 0, spotTarget: [0, 0], vignette: 0.1 },
};
