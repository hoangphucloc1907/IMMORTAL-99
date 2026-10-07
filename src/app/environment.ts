import { globalReplayStore } from '../store/replayStore';
import { Breakpoint } from '../experience/types';

/** WebGL2 is the baseline renderer (§2). Checked once, before mounting the canvas. */
export function hasWebGL2(): boolean {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

export function initEnvironment(): () => void {
  const updateBreakpoint = () => {
    const width = window.innerWidth;
    let bp: Breakpoint = 'desktop';
    if (width < 768) {
      bp = 'mobile';
    } else if (width < 1200) {
      bp = 'tablet';
    }
    globalReplayStore.getState().setBreakpoint(bp);
  };

  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const updateReducedMotion = () => {
    globalReplayStore.getState().setReducedMotion(motionQuery.matches);
    if (motionQuery.matches) {
      globalReplayStore.getState().setEffectsLevel('reduced');
    }
  };

  // Initial detection
  updateBreakpoint();
  updateReducedMotion();

  window.addEventListener('resize', updateBreakpoint);
  motionQuery.addEventListener('change', updateReducedMotion);

  return () => {
    window.removeEventListener('resize', updateBreakpoint);
    motionQuery.removeEventListener('change', updateReducedMotion);
  };
}
