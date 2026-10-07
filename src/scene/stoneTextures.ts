import * as THREE from 'three';
import darkColorUrl from '../assets/textures/stone-dark-color.ktx2?url';
import darkNormalUrl from '../assets/textures/stone-dark-normal.ktx2?url';
import darkRoughnessUrl from '../assets/textures/stone-dark-roughness.ktx2?url';
import lightColorUrl from '../assets/textures/stone-light-color.ktx2?url';
import lightNormalUrl from '../assets/textures/stone-light-normal.ktx2?url';
import lightRoughnessUrl from '../assets/textures/stone-light-roughness.ktx2?url';

/**
 * Photo-scanned board stone (§9 M8): ambientCG Marble002 (dark) and Marble024 (light), CC0, encoded to
 * KTX2 by scripts/buildStoneTextures.mjs. Colour is 2K ETC1S; normal (UASTC) and roughness are 1K and
 * only fetched for the 'high' material tier. The Basis transcoder is three's own copy, which KTX2Loader
 * references via import.meta.url: Vite emits it content-hashed next to the app, always matching the
 * three version — nothing comes from a CDN.
 */
export interface StoneMaps {
  color: THREE.Texture;
  normal?: THREE.Texture;
  roughness?: THREE.Texture;
}

export interface StoneTextures {
  dark: StoneMaps;
  light: StoneMaps;
}

const URLS = {
  dark: { color: darkColorUrl, normal: darkNormalUrl, roughness: darkRoughnessUrl },
  light: { color: lightColorUrl, normal: lightNormalUrl, roughness: lightRoughnessUrl },
};

const pending = new Map<boolean, Promise<StoneTextures>>();

/** Loaded once per detail level and shared; the loader and transcoder are their own lazy chunk. */
export function loadStoneTextures(renderer: THREE.WebGLRenderer, detailed: boolean): Promise<StoneTextures> {
  let promise = pending.get(detailed);
  if (!promise) {
    promise = import('three/examples/jsm/loaders/KTX2Loader.js').then(async ({ KTX2Loader }) => {
      const loader = new KTX2Loader().detectSupport(renderer);
      const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      const load = async (url: string, colorSpace: THREE.ColorSpace) => {
        const texture = await loader.loadAsync(url);
        texture.colorSpace = colorSpace;
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = anisotropy;
        return texture;
      };
      const set = async (urls: (typeof URLS)['dark']): Promise<StoneMaps> => {
        const [color, normal, roughness] = await Promise.all([
          load(urls.color, THREE.SRGBColorSpace),
          detailed ? load(urls.normal, THREE.NoColorSpace) : undefined,
          detailed ? load(urls.roughness, THREE.NoColorSpace) : undefined,
        ]);
        return { color, normal, roughness };
      };
      try {
        const [dark, light] = await Promise.all([set(URLS.dark), set(URLS.light)]);
        return { dark, light };
      } finally {
        loader.dispose(); // stop the transcoder workers once everything is on the CPU side
      }
    });
    pending.set(detailed, promise);
  }
  return promise;
}

/**
 * A view of one quarter of the slab: each square variant shows a different region, so neighbouring
 * squares never repeat. Clones share the image source, so the GPU uploads it once.
 */
export function stoneVariant(texture: THREE.Texture, variant: number): THREE.Texture {
  const view = texture.clone();
  view.repeat.set(0.5, 0.5);
  view.offset.set((variant % 2) * 0.5, Math.floor(variant / 2) * 0.5);
  return view;
}
