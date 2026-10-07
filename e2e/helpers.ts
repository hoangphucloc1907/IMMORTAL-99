import { expect, Page } from '@playwright/test';
import { getExperienceState } from '../src/experience/experienceState';
import { squareToCoords } from '../src/game/coordinates';
import { trayPosition } from '../src/experience/capturedTray';
import { adaptShotForMotion, resolveShot } from '../src/experience/shots';
import { LIGHTING_PRESETS } from '../src/experience/atmosphere';
import { Breakpoint } from '../src/experience/types';
import { Square } from '../src/game/types';
import { SceneProbeData } from '../src/dev/sceneProbe';

export type { SceneProbeData };

/**
 * Allowlisted console errors that are expected and benign.
 * Currently empty; any future allowlisted messages must be documented with rationale.
 */
export const ALLOWLISTED_CONSOLE_ERRORS: RegExp[] = [
  // Example: /favicon\.ico/ - not applicable here
];

export interface ErrorCollector {
  assertNoErrors: () => void;
  errors: string[];
}

/**
 * Attaches listeners for pageerror and console.error on the given page.
 */
export function setupErrorCollector(page: Page): ErrorCollector {
  const errors: string[] = [];

  page.on('pageerror', (err) => {
    errors.push(`[pageerror] ${err.message}\n${err.stack ?? ''}`);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      const isAllowed = ALLOWLISTED_CONSOLE_ERRORS.some((pattern) => pattern.test(text));
      if (!isAllowed) {
        errors.push(`[console.error] ${text}`);
      }
    }
  });

  return {
    assertNoErrors: () => {
      if (errors.length > 0) {
        throw new Error(`Captured unexpected errors:\n${errors.join('\n')}`);
      }
    },
    errors,
  };
}

/**
 * Boots the app at /?test=1 (with optional additional query string parameters).
 * Ensures error collectors are installed from the start.
 */
export async function boot(page: Page, query = ''): Promise<ErrorCollector> {
  const collector = setupErrorCollector(page);
  const q = query.replace(/^\?/, '');
  const params = new URLSearchParams(q);
  params.set('test', '1');
  await page.goto(`/?${params.toString()}`);
  collector.assertNoErrors();
  return collector;
}

/**
 * Queries window.__immortal.probe() from the page.
 */
export async function getProbe(page: Page): Promise<SceneProbeData> {
  return await page.evaluate(() => {
    const immortal = (window as unknown as { __immortal?: { probe: () => SceneProbeData } }).__immortal;
    if (!immortal?.probe) throw new Error('window.__immortal.probe is not available');
    return immortal.probe();
  });
}

/**
 * Waits until the 3D scene has loaded 32 pieces and stabilized.
 */
export async function waitForScene(page: Page, timeoutMs = 30000): Promise<void> {
  await page.waitForFunction(
    () => {
      const immortal = (window as unknown as { __immortal?: { probe: () => SceneProbeData } }).__immortal;
      if (!immortal?.probe) return false;
      const p = immortal.probe();
      return p?.piecePositions && Object.keys(p.piecePositions).length === 32;
    },
    { timeout: timeoutMs },
  );

  // Allow one animation frame to ensure placeholder / GLB replacement settles
  await page.evaluate(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

/**
 * Advances the manual animation clock by `ms` simulated milliseconds in small increments.
 */
export async function tick(page: Page, ms: number, stepMs = 1000 / 60): Promise<void> {
  await page.evaluate(
    ({ ms, stepMs }) => {
      const immortal = (window as unknown as { __immortal?: { tick: (dt: number) => void } }).__immortal;
      if (!immortal?.tick) throw new Error('window.__immortal.tick is not available');
      const steps = Math.max(1, Math.round(ms / stepMs));
      const stepDuration = ms / steps;
      for (let i = 0; i < steps; i++) {
        immortal.tick(stepDuration);
      }
    },
    { ms, stepMs },
  );
}

/**
 * Advances time frame-by-frame inside page.evaluate until playing is false, capped by maxSimulatedMs.
 */
export async function tickUntilStopped(page: Page, maxSimulatedMs = 30000, stepMs = 1000 / 60): Promise<number> {
  return await page.evaluate(
    ({ maxSimulatedMs, stepMs }) => {
      const immortal = (
        window as unknown as {
          __immortal?: {
            tick: (dt: number) => void;
            probe: () => SceneProbeData;
          };
        }
      ).__immortal;
      if (!immortal?.tick || !immortal?.probe) {
        throw new Error('window.__immortal is not available');
      }
      let elapsed = 0;
      immortal.tick(stepMs);
      elapsed += stepMs;
      while (elapsed < maxSimulatedMs) {
        const probe = immortal.probe();
        if (!probe.playing && !probe.busy) {
          return elapsed;
        }
        immortal.tick(stepMs);
        elapsed += stepMs;
      }
      throw new Error(`Animation did not complete within ${maxSimulatedMs}ms simulated time`);
    },
    { maxSimulatedMs, stepMs },
  );
}

/**
 * Mirrors expectResting() from tests/helpers.ts.
 * Compares current 3D probe state against expected resting state computed Node-side.
 */
export async function expectResting(page: Page, ply: number, mode?: 'cinematic' | 'study'): Promise<void> {
  const probe = await getProbe(page);
  const targetMode = mode ?? (probe.mode as 'cinematic' | 'study');
  const state = getExperienceState(ply, targetMode);

  expect(probe.ply, `Director ply at ply ${ply}`).toBe(ply);
  expect(probe.storePly, `Store ply at ply ${ply}`).toBe(ply);
  expect(probe.activeAct, `Active act at ply ${ply}`).toBe(state.act);

  for (const [id, square] of Object.entries(state.pieces)) {
    const expected = square === 'captured' ? trayPosition(id, ply) : squareToCoords(square as Square);
    const pos = probe.piecePositions[id];
    expect(pos, `Piece position for ${id} at ply ${ply}`).toBeDefined();
    expect(pos[0], `${id}.x at ply ${ply}`).toBeCloseTo(expected.x, 3);
    expect(pos[1], `${id}.y at ply ${ply}`).toBeCloseTo(0, 3);
    expect(pos[2], `${id}.z at ply ${ply}`).toBeCloseTo(expected.z, 3);
    expect(probe.pieceRotationsZ[id], `${id} tilt at ply ${ply}`).toBeCloseTo(0, 3);
    expect(probe.pieceVisibility[id], `${id} visible at ply ${ply}`).toBe(true);
  }

  if (state.shot) {
    const shotId = adaptShotForMotion(state.shot, probe.reducedMotion);
    const shot = resolveShot(shotId, ply, probe.breakpoint as Breakpoint);
    expect(probe.camera.targetPosition[0], `camera.x at ply ${ply}`).toBeCloseTo(shot.position[0], 3);
    expect(probe.camera.targetPosition[1], `camera.y at ply ${ply}`).toBeCloseTo(shot.position[1], 3);
    expect(probe.camera.targetPosition[2], `camera.z at ply ${ply}`).toBeCloseTo(shot.position[2], 3);
    expect(probe.camera.targetFov, `camera.fov at ply ${ply}`).toBeCloseTo(shot.fov, 3);
  }

  // Transients never leak past a ply boundary
  expect(probe.activeTransientFxCount, `transient FX at ply ${ply}`).toBe(0);
  expect(probe.actTitleCard, `act title card at ply ${ply}`).toBeNull();
  expect(probe.overlay, `overlay at ply ${ply}`).toBe(state.overlay);

  // Atmosphere and persistent FX
  expect(probe.lighting, `lighting preset at ply ${ply}`).toBe(state.atmosphere.lighting);
  if (probe.ambientIntensity !== null) {
    expect(probe.ambientIntensity, `ambient intensity at ply ${ply}`).toBeCloseTo(
      LIGHTING_PRESETS[state.atmosphere.lighting].ambient,
      3,
    );
  }
  if (probe.fogDensity !== null) {
    expect(probe.fogDensity, `fog density at ply ${ply}`).toBeCloseTo(state.atmosphere.fog, 4);
  }
  expect(probe.vignette, `vignette at ply ${ply}`).toBeCloseTo(state.post.vignette, 4);
  expect(probe.kingTrailVisible, `king trail visible at ply ${ply}`).toBe(state.persistentFx.kingTrail.length >= 2);
  expect(probe.kingHighlight, `king highlight at ply ${ply}`).toBe(!!state.persistentFx.kingHighlight);
}
