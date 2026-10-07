// README showcase: stills (JPEG) and the hero animation (GIF) of the 24.Rxd4 sequence.
//
// Usage: start the app (`npm run dev`), then `node scripts/captureScreenshots.mjs [baseUrl] [--hero]`
//   baseUrl defaults to http://localhost:5173; --hero redoes only the GIF. Output goes to docs/images/.
// Time is driven through the test hook (?test=1 → window.__immortal.tick), so every capture lands on the
// same frame of the same animation on every run. GIF encoding is pure JS (gifenc), no ffmpeg needed.
import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import jpeg from 'jpeg-js';
import gifenc from 'gifenc';

const { GIFEncoder, quantize, applyPalette } = gifenc;

const args = process.argv.slice(2);
const HERO_ONLY = args.includes('--hero');
const BASE_URL = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:5173';
const OUT_DIR = path.resolve('docs/images');
fs.mkdirSync(OUT_DIR, { recursive: true });

const STILL = { width: 1920, height: 1080 };
const HERO = { width: 1440, height: 810, downscale: 2, fps: 6, seconds: 6.4 }; // → 720×405, ~2–3 MB

/** Box-filter downscale of an RGBA raster by an integer factor. */
function downscale({ width, height, data }, factor) {
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

async function openApp(browser, viewport, query = '') {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(`${BASE_URL}/?test=1${query}`);
  await page.waitForFunction(() => {
    const p = window.__immortal?.probe?.();
    return p && Object.keys(p.piecePositions).length === 32;
  });
  // Stone textures and the GLB arrive after the placeholders
  await page.waitForLoadState('networkidle');
  return page;
}

const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
const tick = (page, ms) =>
  page.evaluate((d) => {
    for (let t = 0; t < d; t += 1000 / 60) window.__immortal.tick(Math.min(1000 / 60, d - t));
  }, ms);
const seek = async (page, ply) => {
  await page.evaluate((p) => window.__immortal.director.seek(p), ply);
  await tick(page, 300);
  await page.waitForTimeout(700); // camera damping runs on rendered frames
  await settle(page);
};
const shot = (page, name) => page.screenshot({ path: path.join(OUT_DIR, name), type: 'jpeg', quality: 86 });

async function stills(browser) {
  const page = await openApp(browser, STILL);

  console.log('intro.jpg');
  await page.waitForTimeout(1000);
  await shot(page, 'intro.jpg');

  await page.getByRole('button', { name: 'PLAY THE IMMORTAL GAME' }).click();
  await page.evaluate(() => window.__immortal.director.pause());

  console.log('opening.jpg (11. O-O-O)');
  await seek(page, 21);
  await shot(page, 'opening.jpg');

  // The sacrifice mid-sequence: low angle on the rook, "24. Rxd4!!" on screen
  console.log('sacrifice.jpg (24. Rxd4!!)');
  await seek(page, 46);
  await page.evaluate(() => window.__immortal.director.play());
  await tick(page, 600);
  await page.waitForTimeout(900);
  await settle(page);
  await shot(page, 'sacrifice.jpg');
  await page.evaluate(() => window.__immortal.director.pause());

  console.log('king-hunt.jpg (33. c3+)');
  await seek(page, 65);
  await shot(page, 'king-hunt.jpg');

  console.log('final.jpg (44. Qa7)');
  await seek(page, 87);
  await shot(page, 'final.jpg');

  console.log('study.jpg');
  await seek(page, 47);
  await page.getByRole('button', { name: /^CINEMATIC$/ }).click();
  await page.getByText('GAME STUDY').waitFor();
  await page.waitForTimeout(800);
  await shot(page, 'study.jpg');
  await page.getByRole('button', { name: /^STUDY$/ }).click();

  console.log('ending.jpg');
  await seek(page, 87);
  await page.evaluate(() => window.__immortal.store.getState().setShowEnding(true));
  await page.getByText('THE IMMORTAL GAME').waitFor();
  await page.waitForTimeout(800);
  await shot(page, 'ending.jpg');
  await page.close();
}

/** 24. Rxd4!!: overlay, title card, the rook's slow approach, the pawn dissolving, the reveal. */
async function hero(browser) {
  const page = await openApp(browser, { width: HERO.width, height: HERO.height });
  await page.getByRole('button', { name: 'PLAY THE IMMORTAL GAME' }).click();
  await page.evaluate(() => window.__immortal.director.pause());
  // A film, not a UI demo: no control bar
  await page.addStyleTag({ content: '[role="toolbar"] { display: none !important; }' });
  await seek(page, 46);
  await page.evaluate(() => window.__immortal.director.play());

  const gif = GIFEncoder();
  const frames = Math.round(HERO.seconds * HERO.fps);
  const delay = 1000 / HERO.fps;
  for (let i = 0; i < frames; i++) {
    await tick(page, delay);
    await page.waitForTimeout(120); // let the damped camera catch up with the timeline
    await settle(page);
    const raw = jpeg.decode(await page.screenshot({ type: 'jpeg', quality: 92 }), { useTArray: true });
    const { width, height, data } = downscale(
      { width: raw.width, height: raw.height, data: new Uint8Array(raw.data) },
      HERO.downscale,
    );
    const palette = quantize(data, 256);
    gif.writeFrame(applyPalette(data, palette), width, height, { palette, delay });
    process.stdout.write(`\rhero.gif frame ${i + 1}/${frames}`);
  }
  gif.finish();
  fs.writeFileSync(path.join(OUT_DIR, 'hero.gif'), gif.bytes());
  console.log(`\nhero.gif ${(fs.statSync(path.join(OUT_DIR, 'hero.gif')).size / 1e6).toFixed(1)} MB`);
  await page.close();
}

const browser = await chromium.launch({
  headless: true,
  args: ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'],
});
try {
  if (!HERO_ONLY) await stills(browser);
  await hero(browser);
} finally {
  await browser.close();
}
