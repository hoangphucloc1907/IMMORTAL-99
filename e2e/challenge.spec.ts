import { test, expect } from '@playwright/test';
import { boot, waitForScene, tick, getProbe, expectResting, SceneProbeData } from './helpers';

/** Ticks the manual clock until `ply` has finished (then pauses in the rest after it), or the challenge opens. */
async function tickUntilPlyOrChallenge(page: import('@playwright/test').Page, ply: number) {
  return page.evaluate((target) => {
    const immortal = (
      window as unknown as {
        __immortal: {
          tick: (dt: number) => void;
          probe: () => SceneProbeData;
          director: { pause: () => void };
          store: { getState: () => { challengeActive: boolean } };
        };
      }
    ).__immortal;
    for (let t = 0; t < 60000; t += 1000 / 60) {
      immortal.tick(1000 / 60);
      if (immortal.store.getState().challengeActive) return 'challenge';
      const p = immortal.probe();
      if (p.ply === target) {
        immortal.director.pause();
        return 'ply';
      }
    }
    return 'timeout';
  }, ply);
}

test.describe('Find the move challenge (§12b D11)', () => {
  test('opt-in on the intro, pauses before 24.Rxd4, then plays the real sacrifice', async ({ page }) => {
    const collector = await boot(page);

    const toggle = page.getByRole('checkbox', { name: /find the move/i });
    await expect(toggle).not.toBeChecked(); // off by default
    await toggle.check();

    await page.getByRole('button', { name: 'PLAY THE IMMORTAL GAME' }).click();
    await waitForScene(page);
    await page.getByRole('button', { name: 'Pause (Space)' }).click();

    // Play on from 23...Qd6 (ply 46): the challenge must stop playback before 24.Rxd4
    await page.getByRole('slider', { name: 'Move timeline' }).fill('45');
    await tick(page, 100);
    await page.getByRole('button', { name: 'Play (Space)' }).click();
    expect(await tickUntilPlyOrChallenge(page, 47)).toBe('challenge');

    const probe = await getProbe(page);
    expect(probe.ply).toBe(46);
    expect(probe.playing).toBe(false);
    await expect(page.getByText('CHALLENGE · FIND THE MOVE')).toBeVisible();

    // Correct answer → after the short success beat, playback resumes into ply 47 (not a jump past it)
    await page.getByRole('button', { name: '24. Rxd4', exact: true }).click();
    await expect(page.getByText(/BRILLIANT/)).toBeVisible();
    await expect.poll(async () => (await getProbe(page)).playing, { timeout: 5000 }).toBe(true);
    await expect(page.getByText('CHALLENGE · FIND THE MOVE')).not.toBeVisible();
    expect((await getProbe(page)).ply, 'still animating 24.Rxd4, not seeked past it').toBe(46);

    expect(await tickUntilPlyOrChallenge(page, 47)).toBe('ply');
    await tick(page, 100);
    await expectResting(page, 47, 'cinematic');

    collector.assertNoErrors();
  });
});
