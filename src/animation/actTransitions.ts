import gsap from 'gsap';
import { ActDefinition, Breakpoint } from '../experience/types';
import { resolveShot } from '../experience/shots';
import { ReplayStore } from '../store/replayStore';
import { CameraRig } from './cameraRig';

const TITLE_SECONDS = 2.0;
const TRANSITION_SECONDS = 2.2;

/** A title card shown for `seconds` inside a timeline (cleared by seek like any transient). */
export function buildTitleCard(store: ReplayStore, text: string, seconds: number): gsap.core.Timeline {
  const tl = gsap.timeline();
  tl.call(() => store.getState().setActTitleCard(text), [], 0);
  tl.call(() => store.getState().setActTitleCard(null), [], seconds);
  return tl;
}

/**
 * Full act transition (Acts II and V). Acts III and IV are folded into the sacrifice
 * sequence and the 25.Re7+ payoff (E6), so the Director never calls this for them.
 */
export function buildActTransition(
  act: ActDefinition,
  ply: number,
  cameraRig: CameraRig,
  store: ReplayStore,
  breakpoint: Breakpoint,
): gsap.core.Timeline {
  const tl = gsap.timeline();

  tl.call(() => cameraRig.applyShot(resolveShot(act.openingShot, ply, breakpoint), false), [], 0);
  tl.add(buildTitleCard(store, `${act.romanNumeral} · ${act.title}`, TITLE_SECONDS), 0);
  tl.to({}, { duration: TRANSITION_SECONDS }, 0);

  return tl;
}
