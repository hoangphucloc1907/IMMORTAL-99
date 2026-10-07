import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTO_HIDE_MS, AutoHideController } from '../src/ui/useAutoHide';

describe('Control bar auto-hide (§10)', () => {
  let changes: boolean[];
  let canHide: boolean;
  let controller: AutoHideController;

  beforeEach(() => {
    vi.useFakeTimers();
    changes = [];
    canHide = true;
    controller = new AutoHideController(
      (hidden) => changes.push(hidden),
      () => canHide,
    );
  });

  afterEach(() => {
    controller.dispose();
    vi.useRealTimers();
  });

  it('hides 3s after playback starts, not before', () => {
    controller.setEnabled(true);
    vi.advanceTimersByTime(AUTO_HIDE_MS - 1);
    expect(controller.isHidden()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(controller.isHidden()).toBe(true);
    expect(changes).toEqual([true]);
  });

  it('any activity shows the bar and restarts the countdown', () => {
    controller.setEnabled(true);
    vi.advanceTimersByTime(AUTO_HIDE_MS);
    controller.activity();
    expect(controller.isHidden()).toBe(false);
    vi.advanceTimersByTime(AUTO_HIDE_MS - 1);
    expect(controller.isHidden()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(controller.isHidden()).toBe(true);
  });

  it('never hides while disabled (paused / study), and disabling shows it at once', () => {
    controller.activity();
    vi.advanceTimersByTime(AUTO_HIDE_MS * 3);
    expect(controller.isHidden()).toBe(false);

    controller.setEnabled(true);
    vi.advanceTimersByTime(AUTO_HIDE_MS);
    expect(controller.isHidden()).toBe(true);
    controller.setEnabled(false);
    expect(controller.isHidden()).toBe(false);
    vi.advanceTimersByTime(AUTO_HIDE_MS * 3);
    expect(controller.isHidden()).toBe(false);
  });

  it('stays visible while hovered or keyboard-focused, until the next activity re-arms it', () => {
    controller.setEnabled(true);
    canHide = false;
    vi.advanceTimersByTime(AUTO_HIDE_MS * 2);
    expect(controller.isHidden()).toBe(false);

    canHide = true;
    controller.activity();
    vi.advanceTimersByTime(AUTO_HIDE_MS);
    expect(controller.isHidden()).toBe(true);
  });
});
