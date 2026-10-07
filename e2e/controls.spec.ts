import { test, expect } from '@playwright/test';
import { boot, waitForScene, tick, tickUntilStopped, expectResting, getProbe } from './helpers';

test.describe('Controls replay and keyboard tests', () => {
  test('handles playback controls, timeline scrubbing, speed, mute, and keyboard shortcuts', async ({ page }) => {
    const collector = await boot(page);
    await page.getByRole('button', { name: 'PLAY THE IMMORTAL GAME' }).click();
    await waitForScene(page);

    // 1. After CTA: Pause → probe().playing === false
    const pauseBtn = page.getByRole('button', { name: 'Pause (Space)' });
    await pauseBtn.click();
    expect((await getProbe(page)).playing).toBe(false);

    // 2. From a resting ply (seek via scrubber to 0 first): Next ×5
    const scrubber = page.getByRole('slider', { name: 'Move timeline' });
    await scrubber.fill('0');
    await tick(page, 100);
    await expectResting(page, 0);

    const nextBtn = page.getByRole('button', { name: 'Next move (Right Arrow)' });
    for (let p = 1; p <= 5; p++) {
      await nextBtn.click();
      await tickUntilStopped(page, 30000);
      await expectResting(page, p);
    }

    // 3. Prev → ply 4, resting. Replay current → after ticking to the end, still ply 4, resting.
    const prevBtn = page.getByRole('button', { name: 'Previous move (Left Arrow)' });
    await prevBtn.click();
    await tick(page, 100);
    await expectResting(page, 4);

    const replayBtn = page.getByRole('button', { name: 'Replay current move (R)' });
    await replayBtn.click();
    await tickUntilStopped(page, 30000);
    await expectResting(page, 4);

    // 4. Play → tick → ply advances; Pause stops it.
    const playBtn = page.getByRole('button', { name: 'Play (Space)' });
    await playBtn.click();
    expect((await getProbe(page)).playing).toBe(true);

    await tick(page, 3000);
    const midProbe = await getProbe(page);
    expect(midProbe.ply).toBeGreaterThan(4);

    await page.getByRole('button', { name: 'Pause (Space)' }).click();
    expect((await getProbe(page)).playing).toBe(false);

    // 5. Speed: click each available speed button → aria-pressed and store speed match. Keys 1–4 do the same.
    const speedGroup = page.getByRole('group', { name: 'Playback speed' });
    const speeds = [0.5, 1, 1.5, 2];
    for (const s of speeds) {
      const btn = speedGroup.getByRole('button', { name: `${s}x` });
      await btn.click();
      await expect(btn).toHaveAttribute('aria-pressed', 'true');
      expect((await getProbe(page)).speed).toBe(s);
    }

    for (let i = 0; i < speeds.length; i++) {
      const s = speeds[i];
      await page.keyboard.press(`Digit${i + 1}`);
      const btn = speedGroup.getByRole('button', { name: `${s}x` });
      await expect(btn).toHaveAttribute('aria-pressed', 'true');
      expect((await getProbe(page)).speed).toBe(s);
    }

    // 6. Mute: click → aria-pressed=true and store muted=true; key M toggles back.
    const muteBtn = page.getByRole('button', { name: 'Mute (M)' });
    await muteBtn.click();
    const unmuteBtn = page.getByRole('button', { name: 'Unmute (M)' });
    await expect(unmuteBtn).toHaveAttribute('aria-pressed', 'true');
    expect((await getProbe(page)).muted).toBe(true);

    await page.keyboard.press('KeyM');
    await expect(page.getByRole('button', { name: 'Mute (M)' })).toHaveAttribute('aria-pressed', 'false');
    expect((await getProbe(page)).muted).toBe(false);

    // 7. Keyboard ←/→/Space behave like the buttons.
    await scrubber.fill('10');
    await tick(page, 100);
    await expectResting(page, 10);
    await scrubber.blur();

    // ArrowRight advances move
    await page.keyboard.press('ArrowRight');
    await tickUntilStopped(page, 30000);
    await expectResting(page, 11);

    // ArrowLeft goes back to ply 10
    await page.keyboard.press('ArrowLeft');
    await tick(page, 100);
    await expectResting(page, 10);

    // Space toggles Play / Pause
    await page.keyboard.press('Space');
    expect((await getProbe(page)).playing).toBe(true);
    await page.keyboard.press('Space');
    expect((await getProbe(page)).playing).toBe(false);

    // 8. Fullscreen is not asserted (unreliable headless); only check the button exists.
    const fullscreenBtn = page.getByRole('button', { name: /fullscreen/i });
    await expect(fullscreenBtn).toBeAttached();

    collector.assertNoErrors();
  });
});
