import { test, expect } from '@playwright/test';
import { boot, waitForScene, tick, expectResting, getProbe, SceneProbeData } from './helpers';

test.describe('Seek state reconstruction tests', () => {
  test('scrubbing through fixed sequence reconstructs deterministic resting states', async ({ page }) => {
    const collector = await boot(page);
    await page.getByRole('button', { name: 'PLAY THE IMMORTAL GAME' }).click();
    await waitForScene(page);

    // Pause first so playback does not advance between seeks
    await page.getByRole('button', { name: 'Pause (Space)' }).click();

    const scrubber = page.getByRole('slider', { name: 'Move timeline' });
    const sequence = [47, 60, 12, 70, 33, 87, 0];

    for (const ply of sequence) {
      await scrubber.fill(String(ply));
      await tick(page, 100);
      await expectResting(page, ply, 'cinematic');
    }

    collector.assertNoErrors();
  });

  test('scrubbing mid-animation clears transients and reconstructs target resting state', async ({ page }) => {
    const collector = await boot(page);
    await page.getByRole('button', { name: 'PLAY THE IMMORTAL GAME' }).click();
    await waitForScene(page);

    // Pause first
    await page.getByRole('button', { name: 'Pause (Space)' }).click();

    const scrubber = page.getByRole('slider', { name: 'Move timeline' });

    // Start at ply 46 resting
    await scrubber.fill('46');
    await tick(page, 100);
    await expectResting(page, 46, 'cinematic');

    // Start Play from ply 46 into ply 47
    await page.getByRole('button', { name: 'Play (Space)' }).click();

    // 0.5s in: still in the sacrifice pre-roll, with the "24. Rxd4!!" overlay up
    await tick(page, 500);
    const preRoll = await getProbe(page);
    expect(preRoll.busy, 'ply 47 timeline running').toBe(true);
    expect(preRoll.overlay, 'pre-roll overlay shown').not.toBeNull();

    // Keep going until a transient effect is live (capture dissolve / force lines), so the scrub
    // below really has transient FX to clear
    const fxAt = await page.evaluate(() => {
      const immortal = (
        window as unknown as {
          __immortal: { tick: (dt: number) => void; probe: () => SceneProbeData };
        }
      ).__immortal;
      for (let t = 0; t < 15000; t += 1000 / 60) {
        immortal.tick(1000 / 60);
        if (immortal.probe().activeTransientFxCount > 0) return t;
      }
      return -1;
    });
    expect(fxAt, 'a transient FX became active during ply 47').toBeGreaterThanOrEqual(0);
    expect((await getProbe(page)).busy).toBe(true);

    // Scrub to 30
    await scrubber.fill('30');
    await tick(page, 100);

    // Must be resting at ply 30 with 0 transient FX
    await expectResting(page, 30, 'cinematic');

    collector.assertNoErrors();
  });
});
