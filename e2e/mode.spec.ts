import { test, expect } from '@playwright/test';
import { boot, waitForScene, tick, expectResting, getProbe } from './helpers';

test.describe('Mode transition and study tests', () => {
  test('switches between cinematic and study mode, preserving camera during study navigation', async ({ page }) => {
    const collector = await boot(page);
    await page.getByRole('button', { name: 'PLAY THE IMMORTAL GAME' }).click();
    await waitForScene(page);

    // Pause first so playback does not run
    await page.getByRole('button', { name: 'Pause (Space)' }).click();

    // 1. Seek to some ply, switch to STUDY via the toggle
    const scrubber = page.getByRole('slider', { name: 'Move timeline' });
    await scrubber.fill('10');
    await tick(page, 100);
    await expectResting(page, 10, 'cinematic');

    const modeToggle = page.getByRole('button', { name: /^(CINEMATIC|STUDY)$/ });
    await modeToggle.click();
    await tick(page, 100);

    const probeStudy = await getProbe(page);
    expect(probeStudy.mode).toBe('study');
    await expect(page.getByText('GAME STUDY')).toBeVisible();

    // 2. Record probe().camera, click 24. Rxd4 in the move list
    const cameraBefore = probeStudy.camera;
    // Row "24." → its white move (15.Rxd4 has the same SAN, so match by row)
    const moveRxd4 = page.locator('span', { hasText: /^24\.$/ }).locator('xpath=following-sibling::span[1]');
    await expect(moveRxd4).toHaveText('Rxd4');
    await moveRxd4.click();
    await tick(page, 100);

    const probeRxd4 = await getProbe(page);
    expect(probeRxd4.ply).toBe(47);
    await expect(page.getByText(/24\.\s+Rxd4/).first()).toBeVisible();
    // The caption is shown once — in the Study panel, not again in the cinematic caption box
    // (the screen-reader announcer also carries it, off screen, by design)
    const onScreen = await page
      .getByText('24. Rxd4!! — Kasparov gives up a rook.')
      .evaluateAll((els) => els.filter((el) => !el.closest('[aria-live]')).length);
    expect(onScreen, 'caption boxes showing 24.Rxd4').toBe(1);
    await expectResting(page, 47, 'study');

    // Camera is unchanged in study mode
    expect(probeRxd4.camera.targetPosition[0]).toBeCloseTo(cameraBefore.targetPosition[0], 3);
    expect(probeRxd4.camera.targetPosition[1]).toBeCloseTo(cameraBefore.targetPosition[1], 3);
    expect(probeRxd4.camera.targetPosition[2]).toBeCloseTo(cameraBefore.targetPosition[2], 3);
    expect(probeRxd4.camera.targetFov).toBeCloseTo(cameraBefore.targetFov, 3);

    // 3. Switch back to CINEMATIC → after ticking ~1.5s simulated, camera target equals restingShot of ply 47
    await modeToggle.click();
    await tick(page, 1500);

    const probeCinematic = await getProbe(page);
    expect(probeCinematic.mode).toBe('cinematic');
    await expectResting(page, 47, 'cinematic');

    collector.assertNoErrors();
  });

  test('deep link opens directly in study at ply 47 without the intro', async ({ page }) => {
    const collector = await boot(page, 'ply=47&mode=study');
    await waitForScene(page);

    const probe = await getProbe(page);
    expect(probe.mode).toBe('study');
    expect(probe.ply).toBe(47);

    // Intro is skipped
    await expect(page.getByRole('button', { name: 'PLAY THE IMMORTAL GAME' })).not.toBeVisible();
    await expect(page.getByText('GAME STUDY')).toBeVisible();

    // Resting state at ply 47 study mode
    await expectResting(page, 47, 'study');

    collector.assertNoErrors();
  });

  test('cinematic deep link rebuilds the scene, camera and lighting at that ply', async ({ page }) => {
    const collector = await boot(page, 'ply=60');
    await waitForScene(page);
    await tick(page, 100);

    await expect(page.getByRole('button', { name: 'PLAY THE IMMORTAL GAME' })).not.toBeVisible();
    expect((await getProbe(page)).playing).toBe(false);
    await expectResting(page, 60, 'cinematic');

    collector.assertNoErrors();
  });
});
