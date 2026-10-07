import { test, expect, Page } from '@playwright/test';
import { boot, waitForScene, getProbe } from './helpers';

// The idle timer is a real 3s UI timer (not the animation clock), so these tests wait on the
// toolbar's state with web-first assertions instead of ticking.
const HIDE_TIMEOUT = 8000;

async function startPlaying(page: Page) {
  const collector = await boot(page);
  await page.getByRole('button', { name: 'PLAY THE IMMORTAL GAME' }).click();
  await waitForScene(page);
  expect((await getProbe(page)).playing).toBe(true);
  return collector;
}

test.describe('Control bar auto-hide (§10)', () => {
  test('hides after 3s idle while playing, reappears on input, never hides when paused', async ({ page }) => {
    const collector = await startPlaying(page);
    const toolbar = page.getByRole('toolbar', { name: 'Replay controls' });

    // Idle (pointer away from the bar) → hidden, but still in the accessibility tree
    await page.mouse.move(20, 20);
    await expect(toolbar).toHaveAttribute('data-hidden', 'true', { timeout: HIDE_TIMEOUT });
    // Inline style, not computed: headless Chromium does not always run the CSS fade
    await expect(toolbar).toHaveAttribute('style', /opacity: 0;/);
    await expect(page.getByRole('button', { name: 'Pause (Space)' })).toBeAttached();

    // Pointer movement reveals it
    await page.mouse.move(40, 40);
    await expect(toolbar).not.toHaveAttribute('data-hidden');
    await expect(toolbar).toHaveAttribute('style', /opacity: 1;/);

    // A key press reveals it too
    await expect(toolbar).toHaveAttribute('data-hidden', 'true', { timeout: HIDE_TIMEOUT });
    await page.keyboard.press('Shift');
    await expect(toolbar).not.toHaveAttribute('data-hidden');

    // Mouse users can click straight through: the move to the button reveals the bar first
    await expect(toolbar).toHaveAttribute('data-hidden', 'true', { timeout: HIDE_TIMEOUT });
    await page.getByRole('button', { name: 'Pause (Space)' }).click();
    expect((await getProbe(page)).playing).toBe(false);
    await expect(toolbar).not.toHaveAttribute('data-hidden');

    collector.assertNoErrors();
  });

  test.describe('touch', () => {
    test.use({ hasTouch: true });

    test('a tap on the hidden bar only reveals it; the next tap presses the button', async ({ page }) => {
      const collector = await startPlaying(page);
      const toolbar = page.getByRole('toolbar', { name: 'Replay controls' });

      await page.mouse.move(20, 20);
      await expect(toolbar).toHaveAttribute('data-hidden', 'true', { timeout: HIDE_TIMEOUT });

      // A real touch tap on the hidden Pause button must not pause
      const box = (await page.getByRole('button', { name: 'Pause (Space)' }).boundingBox())!;
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      expect((await getProbe(page)).playing, 'tap on the hidden bar must not press Pause').toBe(true);

      // Reveal-then-press, as two touch taps dispatched synchronously: while playing, SwiftShader keeps
      // the main thread so busy that real taps can land >3s apart and the bar hides again in between
      await expect(toolbar).toHaveAttribute('data-hidden', 'true', { timeout: HIDE_TIMEOUT });
      const result = await page.evaluate(() => {
        const immortal = (window as unknown as { __immortal: { probe: () => { playing: boolean } } }).__immortal;
        const bar = document.querySelector('[role=toolbar]')!;
        const button = bar.querySelector('button[aria-label="Pause (Space)"]')!;
        const tap = () => {
          button.dispatchEvent(
            new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', isPrimary: true }),
          );
          button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch', isPrimary: true }));
          button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        };
        const hiddenBefore = bar.hasAttribute('data-hidden');
        tap();
        const playingAfterFirst = immortal.probe().playing;
        tap();
        return { hiddenBefore, playingAfterFirst, playingAfterSecond: immortal.probe().playing };
      });
      expect(result.hiddenBefore).toBe(true);
      expect(result.playingAfterFirst, 'first tap only reveals').toBe(true);
      expect(result.playingAfterSecond, 'second tap presses Pause').toBe(false);
      await expect(toolbar).not.toHaveAttribute('data-hidden');

      collector.assertNoErrors();
    });
  });
});
