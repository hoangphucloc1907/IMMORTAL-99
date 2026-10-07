// Board stone textures (§9 M8): photo-scanned marble → KTX2 (Basis Universal), committed to src/assets/textures.
//
// Usage: node scripts/buildStoneTextures.mjs <dir>
//   <dir> holds the extracted ambientCG 2K-JPG packs (CC0, https://ambientcg.com):
//     <dir>/Marble002/Marble002_2K-JPG_{Color,NormalGL,Roughness}.jpg   dark squares
//     <dir>/Marble024/Marble024_2K-JPG_{Color,NormalGL,Roughness}.jpg   light squares
//   Download: https://ambientcg.com/get?file=Marble002_2K-JPG.zip (and Marble024)
//
// Encoding (§2): colour → ETC1S sRGB 2K (small, on-GPU compressed); normal → UASTC + Zstd 1K (ETC1S
// smears normals); roughness → ETC1S linear 1K. Mipmaps for all. The encoder is the Basis Universal
// WASM build in `ktx2-encoder`, so no system install (toktx) is needed.
import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import jpeg from 'jpeg-js';
import { encodeToKTX2 } from 'ktx2-encoder';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = process.argv[2];
if (!srcDir) {
  console.error('Usage: node scripts/buildStoneTextures.mjs <dir with Marble002/ and Marble024/>');
  process.exit(1);
}
const outDir = join(root, 'src/assets/textures');
mkdirSync(outDir, { recursive: true });

const STONES = [
  { id: 'Marble002', name: 'stone-dark' },
  { id: 'Marble024', name: 'stone-light' },
];

/** Box-filter downscale of an RGBA raster by an integer factor. */
function downscale({ width, height, data }, factor) {
  if (factor === 1) return { width, height, data };
  const w = width / factor;
  const h = height / factor;
  const out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        for (let dy = 0; dy < factor; dy++) {
          for (let dx = 0; dx < factor; dx++) sum += data[((y * factor + dy) * width + x * factor + dx) * 4 + c];
        }
        out[(y * w + x) * 4 + c] = Math.round(sum / (factor * factor));
      }
    }
  }
  return { width: w, height: h, data: out };
}

const decoderFor = (factor) => async (buffer) => {
  const img = jpeg.decode(buffer, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 1024 });
  return downscale({ width: img.width, height: img.height, data: new Uint8Array(img.data) }, factor);
};

const MAPS = [
  {
    suffix: 'Color',
    out: 'color',
    factor: 1, // 2K
    options: { isUASTC: false, qualityLevel: 192, isPerceptual: true, isSetKTX2SRGBTransferFunc: true },
  },
  {
    suffix: 'NormalGL',
    out: 'normal',
    factor: 2, // 1K
    options: {
      isUASTC: true,
      needSupercompression: true,
      uastcLDRQualityLevel: 2,
      isNormalMap: true,
      isPerceptual: false,
      isSetKTX2SRGBTransferFunc: false,
    },
  },
  {
    suffix: 'Roughness',
    out: 'roughness',
    factor: 2, // 1K
    options: { isUASTC: false, qualityLevel: 128, isPerceptual: false, isSetKTX2SRGBTransferFunc: false },
  },
];

for (const stone of STONES) {
  for (const map of MAPS) {
    const input = join(srcDir, stone.id, `${stone.id}_2K-JPG_${map.suffix}.jpg`);
    const source = new Uint8Array(readFileSync(input));

    if (map.out === 'roughness') {
      // Report the mean so the material's roughness factor can target §9 (0.35–0.5)
      const { data } = await decoderFor(4)(source);
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) sum += data[i];
      console.log(`${stone.name} roughness mean ${(sum / (data.length / 4) / 255).toFixed(3)}`);
    }

    const ktx2 = await encodeToKTX2(source, {
      ...map.options,
      generateMipmap: true,
      isKTX2File: true,
      imageDecoder: decoderFor(map.factor),
    });
    const file = join(outDir, `${stone.name}-${map.out}.ktx2`);
    writeFileSync(file, ktx2);
    console.log(`${file.slice(root.length + 1)}  ${(statSync(file).size / 1024).toFixed(0)} KB`);
  }
}
