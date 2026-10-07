import React, { useEffect, useRef, useState } from 'react';

/** §10: the control bar hides after 3s without interaction while the cinematic is playing. */
export const AUTO_HIDE_MS = 3000;

/** Timer logic, free of React and the DOM so it can be tested with fake timers. */
export class AutoHideController {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private enabled = false;
  private hidden = false;

  constructor(
    private readonly onChange: (hidden: boolean) => void,
    private readonly canHide: () => boolean = () => true,
    private readonly delayMs = AUTO_HIDE_MS,
  ) {}

  /** Enabled only while hiding is allowed (playing, cinematic). Disabling shows the bar at once. */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (enabled) {
      this.restart();
    } else {
      this.clear();
      this.setHidden(false);
    }
  }

  /** Any pointer, touch, wheel or key input: show the bar and restart the countdown. */
  public activity(): void {
    this.setHidden(false);
    if (this.enabled) this.restart();
  }

  public isHidden(): boolean {
    return this.hidden;
  }

  public dispose(): void {
    this.clear();
  }

  private restart(): void {
    this.clear();
    this.timer = setTimeout(() => {
      this.timer = null;
      // Hovered or keyboard-focused: stay visible; the next input re-arms the countdown
      if (this.enabled && this.canHide()) this.setHidden(true);
    }, this.delayMs);
  }

  private clear(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private setHidden(hidden: boolean): void {
    if (hidden === this.hidden) return;
    this.hidden = hidden;
    this.onChange(hidden);
  }
}

const ACTIVITY_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel'] as const;

function hasKeyboardFocusWithin(el: HTMLElement | null): boolean {
  const active = document.activeElement;
  return !!el && !!active && el.contains(active) && active.matches(':focus-visible');
}

/**
 * Auto-hide for the control bar. The bar only fades (it stays in the layout and the accessibility tree);
 * a touch on the hidden bar just reveals it instead of pressing the button underneath.
 */
export function useAutoHide(active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const hoveredRef = useRef(false);
  const hiddenRef = useRef(false);
  const swallowClickRef = useRef(false);
  const [hidden, setHidden] = useState(false);
  const [controller] = useState(
    () =>
      new AutoHideController(
        (h) => {
          hiddenRef.current = h;
          setHidden(h);
        },
        () => !hoveredRef.current && !hasKeyboardFocusWithin(ref.current),
      ),
  );

  useEffect(() => controller.setEnabled(active), [active, controller]);

  useEffect(() => {
    const onActivity = () => controller.activity();
    for (const type of ACTIVITY_EVENTS) window.addEventListener(type, onActivity, { passive: true });
    return () => {
      for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, onActivity);
      controller.dispose();
    };
  }, [controller]);

  const toolbarProps = {
    ref,
    onPointerEnter: () => {
      hoveredRef.current = true;
    },
    onPointerLeave: () => {
      hoveredRef.current = false;
    },
    // Runs before the window listener reveals the bar, so it still sees the hidden state
    onPointerDownCapture: (e: React.PointerEvent) => {
      swallowClickRef.current = hiddenRef.current && e.pointerType !== 'mouse';
    },
    onClickCapture: (e: React.MouseEvent) => {
      if (!swallowClickRef.current) return;
      swallowClickRef.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };

  return { hidden, toolbarProps };
}
