import gsap from 'gsap';
import { LIGHTING_PRESETS } from '../experience/atmosphere';
import { AtmosphereState } from '../experience/types';
import { SceneRegistry } from './sceneRegistry';

function aimSpot(registry: SceneRegistry, target: AtmosphereState): void {
  const spot = registry.lights.spot;
  if (!spot) return;
  const [x, z] = LIGHTING_PRESETS[target.lighting].spotTarget;
  spot.target.position.set(x, 0, z);
  spot.target.updateMatrixWorld();
}

/** Instant application, used by seek and at the end of every ply. */
export function applyAtmosphere(registry: SceneRegistry, target: AtmosphereState): void {
  const preset = LIGHTING_PRESETS[target.lighting];
  const { ambient, key, rim, fill, spot } = registry.lights;
  if (ambient) ambient.intensity = preset.ambient;
  if (key) key.intensity = preset.key;
  if (rim) rim.intensity = preset.rim;
  if (fill) fill.intensity = preset.fill;
  if (spot) spot.intensity = preset.spot;
  aimSpot(registry, target);
  if (registry.fog) registry.fog.density = target.fog;
  registry.appliedLighting = target.lighting;
}

/** Eased change toward a ply's atmosphere (Act III darkens into the sacrifice, Act IV re-opens). */
export function tweenAtmosphere(
  registry: SceneRegistry,
  target: AtmosphereState,
  duration: number,
): gsap.core.Timeline {
  const preset = LIGHTING_PRESETS[target.lighting];
  const { ambient, key, rim, fill, spot } = registry.lights;
  const tl = gsap.timeline();
  const vars = { duration, ease: 'sine.inOut' };

  tl.call(
    () => {
      aimSpot(registry, target);
      registry.appliedLighting = target.lighting;
    },
    [],
    0,
  );
  if (ambient) tl.to(ambient, { intensity: preset.ambient, ...vars }, 0);
  if (key) tl.to(key, { intensity: preset.key, ...vars }, 0);
  if (rim) tl.to(rim, { intensity: preset.rim, ...vars }, 0);
  if (fill) tl.to(fill, { intensity: preset.fill, ...vars }, 0);
  if (spot) tl.to(spot, { intensity: preset.spot, ...vars }, 0);
  if (registry.fog) tl.to(registry.fog, { density: target.fog, ...vars }, 0);
  tl.to({}, { duration }, 0); // same length with or without a mounted scene

  return tl;
}
