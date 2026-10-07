import { test, expect } from '@playwright/test';
import { boot, waitForScene, tick, getProbe, expectResting } from './helpers';
import { adaptShotForMotion, resolveShot } from '../src/experience/shots';
import { restingShot } from '../src/experience/choreography';

test.describe('Reduced motion tests', () => {
  test.use({ reducedMotion: 'reduce' });

  test('activates reduced-motion profile and adapts DUTCH_TILT shots to OVER_SHOULDER', async ({ page }) => {
    const collector = await boot(page);
    await page.getByRole('button', { name: 'PLAY THE IMMORTAL GAME' }).click();
    await waitForScene(page);

    // Pause first so playback does not run
    await page.getByRole('button', { name: 'Pause (Space)' }).click();

    // 1. Store reducedMotion === true and effectsLevel === 'reduced'
    const initialProbe = await getProbe(page);
    expect(initialProbe.reducedMotion).toBe(true);
    expect(initialProbe.effectsLevel).toBe('reduced');

    // 2. Seek to a king-hunt ply whose resting shot is DUTCH_TILT (plies 65 and 69)
    const ply = 65;
    expect(restingShot(ply)).toBe('DUTCH_TILT');

    const scrubber = page.getByRole('slider', { name: 'Move timeline' });
    await scrubber.fill(String(ply));
    await tick(page, 100);

    const probe = await getProbe(page);
    expect(probe.ply).toBe(ply);

    // Verify adaptShotForMotion adapts DUTCH_TILT to OVER_SHOULDER when reducedMotion is true
    const adaptedShotId = adaptShotForMotion('DUTCH_TILT', true);
    expect(adaptedShotId).toBe('OVER_SHOULDER');

    const adaptedShot = resolveShot(adaptedShotId, ply, probe.breakpoint as 'desktop' | 'tablet' | 'mobile');
    const tiltShot = resolveShot('DUTCH_TILT', ply, probe.breakpoint as 'desktop' | 'tablet' | 'mobile');

    // Ensure adapted shot and tilt shot are distinct
    expect(adaptedShot.position).not.toEqual(tiltShot.position);

    // The camera target must equal the adapted shot, not the tilt shot
    expect(probe.camera.targetPosition[0]).toBeCloseTo(adaptedShot.position[0], 3);
    expect(probe.camera.targetPosition[1]).toBeCloseTo(adaptedShot.position[1], 3);
    expect(probe.camera.targetPosition[2]).toBeCloseTo(adaptedShot.position[2], 3);
    expect(probe.camera.targetFov).toBeCloseTo(adaptedShot.fov, 3);

    // Confirm it does not equal the unadapted tilt shot
    const matchesTilt =
      Math.abs(probe.camera.targetPosition[0] - tiltShot.position[0]) < 1e-3 &&
      Math.abs(probe.camera.targetPosition[1] - tiltShot.position[1]) < 1e-3 &&
      Math.abs(probe.camera.targetPosition[2] - tiltShot.position[2]) < 1e-3;
    expect(matchesTilt).toBe(false);

    await expectResting(page, ply, 'cinematic');

    collector.assertNoErrors();
  });
});
