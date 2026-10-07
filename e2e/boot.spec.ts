import { test, expect } from '@playwright/test';
import { boot } from './helpers';

test.describe('Boot smoke test', () => {
  test('boots correctly, preserves WebGL2, suppresses pre-CTA audio, and proceeds on CTA click', async ({ page }) => {
    const audioRequests: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (/\.(ogg|webm|m4a)(\?.*)?$/i.test(url)) {
        audioRequests.push(url);
      }
    });

    // Board stone (§9): KTX2 textures and the Basis transcoder must load and transcode in every engine
    const stoneResponses: string[] = [];
    const failedRequests: string[] = [];
    const stoneWarnings: string[] = [];
    page.on('response', (res) => {
      if (/\.ktx2$|basis_transcoder/.test(res.url())) stoneResponses.push(`${res.status()} ${res.url()}`);
    });
    page.on('requestfailed', (req) => failedRequests.push(req.url()));
    page.on('console', (msg) => {
      if (msg.text().includes('Keeping procedural board stone')) stoneWarnings.push(msg.text());
    });

    const collector = await boot(page);

    // 1. <canvas> exists and WebGL2 is available (NoWebGL fallback is not shown)
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    await expect(page.getByText('needs WebGL 2')).not.toBeVisible();
    const hasWebGL2 = await canvas.evaluate((el) => (el as HTMLCanvasElement).getContext('webgl2') !== null);
    expect(hasWebGL2, 'canvas has a WebGL2 context').toBe(true);

    // 2. The CTA is visible and enabled before the 3D scene finishes loading (no waitForScene)
    const cta = page.getByRole('button', { name: 'PLAY THE IMMORTAL GAME' });
    await expect(cta).toBeVisible();
    await expect(cta).toBeEnabled();

    // 3. No audio requests happened before CTA click
    expect(audioRequests, 'No audio requests before CTA click').toHaveLength(0);

    // Click the CTA
    await cta.click();

    // 4. After CTA: intro is gone and Replay controls toolbar is visible
    await expect(cta).not.toBeVisible();
    const toolbar = page.getByRole('toolbar', { name: 'Replay controls' });
    await expect(toolbar).toBeVisible();

    // 5. Stone textures: both colour maps and the transcoder arrived, nothing failed or fell back
    await expect
      .poll(() => stoneResponses.filter((r) => /stone-(dark|light)-color/.test(r)).length, { timeout: 30000 })
      .toBeGreaterThanOrEqual(2);
    await expect.poll(() => stoneResponses.filter((r) => /basis_transcoder/.test(r)).length).toBe(2);
    expect(
      stoneResponses.filter((r) => !r.startsWith('200 ')),
      'texture responses',
    ).toEqual([]);
    expect(failedRequests, 'failed requests').toEqual([]);
    expect(stoneWarnings, 'stone texture fallback').toEqual([]);

    collector.assertNoErrors();
  });
});
