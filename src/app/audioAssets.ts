// Foley samples — Kenney "Impact Sounds", CC0 (see CREDITS.md). Imported as URLs so they get
// content-hashed file names; fetched only after the CTA unlocks audio (never in the initial payload).
import moveA from '../assets/audio/impactWood_light_000.ogg?url';
import moveB from '../assets/audio/impactWood_light_001.ogg?url';
import moveC from '../assets/audio/impactWood_light_002.ogg?url';
import moveD from '../assets/audio/impactWood_light_003.ogg?url';
import moveE from '../assets/audio/impactWood_light_004.ogg?url';
import captureA from '../assets/audio/impactWood_medium_000.ogg?url';
import captureB from '../assets/audio/impactWood_medium_001.ogg?url';
import captureC from '../assets/audio/impactWood_medium_002.ogg?url';
import checkRingA from '../assets/audio/impactBell_heavy_000.ogg?url';
import checkRingB from '../assets/audio/impactBell_heavy_001.ogg?url';
import toppleA from '../assets/audio/impactPlank_medium_000.ogg?url';
import toppleB from '../assets/audio/impactPlank_medium_001.ogg?url';
import toppleC from '../assets/audio/impactPlank_medium_002.ogg?url';
import impact from '../assets/audio/impactWood_heavy_000.ogg?url';
import heartbeatA from '../assets/audio/impactSoft_heavy_000.ogg?url';
import heartbeatB from '../assets/audio/impactSoft_heavy_001.ogg?url';
import type { SampleUrls } from '../audio/soundBank';

export const SAMPLE_URLS: SampleUrls = {
  move: [moveA, moveB, moveC, moveD, moveE],
  capture: [captureA, captureB, captureC],
  topple: [toppleA, toppleB, toppleC],
  checkRing: [checkRingA, checkRingB],
  impact: [impact],
  heartbeat: [heartbeatA, heartbeatB],
};
