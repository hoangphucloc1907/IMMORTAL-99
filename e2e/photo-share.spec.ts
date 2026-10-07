import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { boot, waitForScene, tick } from './helpers';

test.describe('Photo mode and share link (§12b D12)', () => {
  test('the photo is the rendered board, not an empty canvas', async ({ page }) => {
    const collector = await boot(page, 'ply=87');
    await waitForScene(page);
    await tick(page, 200);

    await page.keyboard.press('KeyP');
    const capture = page.getByRole('button', { name: /Capture PNG/ });
    await expect(capture).toBeVisible();
    await expect(page.getByRole('toolbar', { name: 'Replay controls' })).toHaveCount(0); // UI hidden

    // What the button saves: a PNG named after the ply, with real content
    const [download] = await Promise.all([page.waitForEvent('download'), capture.click()]);
    expect(download.suggestedFilename()).toBe('immortal-99-ply87.png');
    const png = readFileSync((await download.path())!);
    expect([...png.subarray(1, 4)].map((c) => String.fromCharCode(c)).join('')).toBe('PNG');

    // Decode it in the page: most pixels are lit, and none of it is transparent
    const stats = await page.evaluate(async (b64) => {
      const img = new Image();
      await new Promise((r) => {
        img.onload = r;
        img.src = `data:image/png;base64,${b64}`;
      });
      const c = document.createElement('canvas');
      c.width = img.width;
      c.height = img.height;
      const ctx = c.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      let opaque = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i] + d[i + 1] + d[i + 2] > 60) lit++;
        if (d[i + 3] === 255) opaque++;
      }
      const n = d.length / 4;
      return { width: img.width, lit: lit / n, opaque: opaque / n };
    }, png.toString('base64'));
    expect(stats.width).toBeGreaterThan(0);
    expect(stats.opaque, 'opaque pixels').toBeGreaterThan(0.99);
    expect(stats.lit, 'lit pixels (board and pieces)').toBeGreaterThan(0.1);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('toolbar', { name: 'Replay controls' })).toBeVisible();
    collector.assertNoErrors();
  });

  test('the share button copies a link to the current move and mode', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const collector = await boot(page, 'ply=51&mode=study');
    await waitForScene(page);

    await page.getByRole('button', { name: 'Copy link to this move' }).click();
    await expect(page.getByRole('button', { name: 'Link copied' })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(new URL(copied).search).toBe('?ply=51&mode=study');

    collector.assertNoErrors();
  });
});
