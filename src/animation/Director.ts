import gsap from 'gsap';
import { Chess } from 'chess.js';
import './clock'; // detaches GSAP's own ticker: the frame loop / tick() is the only time source
import { REPLAY_STEPS } from '../game/replay';
import { squareToCoords } from '../game/coordinates';
import { PieceId, ReplayStep, Square } from '../game/types';
import { computePressureMap } from '../game/pressureMap';
import { getExperienceState } from '../experience/experienceState';
import { getActForPly } from '../experience/acts';
import { getChoreographyForPly } from '../experience/choreography';
import { adaptShotForMotion, resolveShot } from '../experience/shots';
import { getRestDurationForAct } from '../experience/pacing';
import { trayPosition } from '../experience/capturedTray';
import { engineLine } from '../experience/engineAnalysis';
import { ShotTiming } from '../experience/types';
import { SceneRegistry, globalSceneRegistry } from './sceneRegistry';
import { CameraRig, CameraTransition, globalCameraRig } from './cameraRig';
import { SoundBank, globalSoundBank } from '../audio/soundBank';
import { AudioEngine, globalAudioEngine } from '../audio/engine';
import { ReplayStore, globalReplayStore } from '../store/replayStore';
import { applyAtmosphere, tweenAtmosphere } from './atmosphere';
import { baseMoveLandTime, buildBaseMove } from './MoveTimeline';
import { buildCheckAnimation } from './CheckAnimation';
import { buildSacrificeAnimation } from './SacrificeAnimation';
import { buildKingHuntAnimation } from './KingHuntAnimation';
import { buildFinalAnimation } from './FinalAnimation';
import { buildActTransition, buildTitleCard } from './actTransitions';
import { BuildDeps, DirectorCommands, StepOptions } from './types';

type Mode = 'cinematic' | 'study';

const LAST_PLY = REPLAY_STEPS.length; // 87
const ACT_IV_TITLE_PLY = 50; // after 25...Kb6 — never on top of the 25.Re7+ payoff
const ACT_IV_TITLE_SECONDS = 1.8;
const STUDY_MOVE_SECONDS = 0.5;
const STUDY_REST_SECONDS = 0.15;
const LIFT_CUE_TIME = 0.15;
const GHOST_MOVE_SECONDS = 0.55;
const GHOST_STEP_SECONDS = 0.85;
const GHOST_HOLD_SECONDS = 1.6;
const DIMMED_REAL_PIECES = 0.85; // dissolve progress → real pieces at 15% opacity under the ghosts

function clampPly(ply: number): number {
  return Math.max(0, Math.min(LAST_PLY, Math.round(ply)));
}

export class Director implements DirectorCommands {
  private ctx: gsap.Context = gsap.context(() => {});
  private currentTimeline: gsap.core.Timeline | null = null;
  private restCall: gsap.core.Tween | null = null;
  private targetPly: number | null = null;
  private currentPly = 0;
  private isPlaying = false;
  private speed = 1.0;
  private mode: Mode = 'cinematic';
  private ghostActive = false;
  // One-shot: the viewer has just answered the challenge, so the next step plays 24.Rxd4 itself
  private challengeAnswered = false;

  public registry: SceneRegistry;
  public cameraRig: CameraRig;
  public soundBank: SoundBank;
  public audioEngine: AudioEngine;
  public store: ReplayStore;

  constructor(
    registry = globalSceneRegistry,
    cameraRig = globalCameraRig,
    soundBank = globalSoundBank,
    audioEngine = globalAudioEngine,
    store = globalReplayStore,
  ) {
    this.registry = registry;
    this.cameraRig = cameraRig;
    this.soundBank = soundBank;
    this.audioEngine = audioEngine;
    this.store = store;
  }

  public getPly(): number {
    return this.currentPly;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /** Something is moving or about to: the frame loop must keep running. */
  public isBusy(): boolean {
    return this.isPlaying || this.currentTimeline !== null;
  }

  public setSpeed(speed: number): void {
    this.speed = Math.max(0.5, Math.min(2.0, speed));
    this.store.getState().setSpeed(this.speed);
    this.currentTimeline?.timeScale(this.speed);
  }

  public setMode(mode: Mode): void {
    this.mode = mode;
    this.store.getState().setMode(mode);
    this.seek(this.currentPly, { cameraBlend: mode === 'cinematic' ? 0.8 : 0 });
  }

  /** Deterministic state reconstruction. Always stops playback. */
  public seek(ply: number, opts: { cameraBlend?: number; audioFade?: number } = {}): void {
    this.stopPlayback();
    this.reconstruct(ply, (opts.cameraBlend ?? 0) === 0);
  }

  public capturePhoto(): Promise<string | null> {
    return this.registry.capturePhoto();
  }

  public resumeAfterChallenge(): void {
    this.store.getState().setChallengeActive(false);
    this.challengeAnswered = true;
    this.play();
  }

  public play(): void {
    this.leaveEngineLine();
    if (this.isPlaying) return;
    void this.startAudio();

    if (this.currentTimeline) {
      // Resume the move that was paused — never start a second timeline for the same ply
      this.setPlaying(true);
      this.currentTimeline.resume();
    } else {
      if (this.currentPly >= LAST_PLY) this.reconstruct(0, true);
      this.setPlaying(true);
      this.playNextStep();
    }
    this.registry.requestFrame();
  }

  public pause(): void {
    this.setPlaying(false);
    this.cancelRest();
    this.currentTimeline?.pause();
  }

  public next(): void {
    this.leaveEngineLine();
    if (this.currentTimeline && this.targetPly !== null) {
      // Finish the running move instantly; keep playing if we were
      const dest = this.targetPly;
      this.reconstruct(dest, false);
      if (this.isPlaying) this.scheduleNext(dest);
      return;
    }

    if (this.restCall) {
      // Skip the rest between two moves during playback
      this.cancelRest();
      this.playNextStep();
      return;
    }

    if (this.currentPly < LAST_PLY) {
      this.animatePly(this.currentPly + 1);
    }
  }

  public prev(): void {
    this.leaveEngineLine();
    this.stopPlayback();
    this.reconstruct(Math.max(0, this.currentPly - 1), true);
  }

  public replayCurrent(): void {
    this.leaveEngineLine();
    if (this.currentPly === 0) return;
    const target = this.currentPly;
    this.stopPlayback();
    this.reconstruct(target - 1, true);
    this.animatePly(target);
  }

  /**
   * Study mode (§A2): plays an engine line from the position before its branch ply with
   * translucent pieces over the dimmed real board, then restores the real position. Every move
   * is validated by chess.js; the whole timeline lives in the Director's context, so seek clears it.
   */
  public playEngineLine(id: string): void {
    const line = engineLine(id);
    const branch = line ? REPLAY_STEPS[line.branchPly - 1] : undefined;
    if (!line || !branch) return;

    const returnTo = this.currentPly;
    this.stopPlayback();
    this.reconstruct(returnTo, false);

    const board = new Chess(branch.fenBefore);
    const ghost = this.registry.ghostBoard;
    ghost.show(
      board
        .board()
        .flat()
        .flatMap((p) => (p ? [{ square: p.square, at: squareToCoords(p.square), type: p.type, color: p.color }] : [])),
    );
    for (const piece of this.registry.getAllPieces().values())
      this.registry.disintegrate.applyToMesh(piece, DIMMED_REAL_PIECES);
    this.ghostActive = true;
    this.store.getState().setGhostLineId(id);

    this.ctx.add(() => {
      const tl = gsap.timeline({ onComplete: () => this.leaveEngineLine() });
      tl.timeScale(this.speed);

      let t = 0.6;
      for (const san of line.moves) {
        const move = board.move(san);
        const legs: Array<[string, string]> = [[move.from, move.to]];
        if (move.flags.includes('k') || move.flags.includes('q')) {
          const rank = move.color === 'w' ? '1' : '8';
          legs.push(move.flags.includes('q') ? [`a${rank}`, `d${rank}`] : [`h${rank}`, `f${rank}`]);
        }
        const taken = move.captured ? ghost.pieceAt(move.to) : undefined;

        for (const [from, to] of legs) {
          const piece = ghost.pieceAt(from);
          if (!piece) continue;
          const target = squareToCoords(to as Square);
          tl.to(piece.position, { x: target.x, z: target.z, duration: GHOST_MOVE_SECONDS, ease: 'power2.inOut' }, t);
          tl.to(
            piece.position,
            { y: 0.25, duration: GHOST_MOVE_SECONDS / 2, ease: 'sine.out', yoyo: true, repeat: 1 },
            t,
          );
          ghost.relocate(from, to);
        }
        if (taken) tl.call(() => void (taken.visible = false), [], t + GHOST_MOVE_SECONDS * 0.8);
        tl.call(
          () => (move.captured ? this.soundBank.playCapture() : this.soundBank.playMove()),
          [],
          t + GHOST_MOVE_SECONDS,
        );
        t += GHOST_STEP_SECONDS;
      }
      tl.to({}, { duration: GHOST_HOLD_SECONDS }, t);
      this.currentTimeline = tl;
    });
    this.registry.requestFrame();
  }

  /** Back from an engine line to the real game, exactly where it was. */
  private leaveEngineLine(): void {
    if (!this.ghostActive) return;
    this.ghostActive = false;
    this.reconstruct(this.currentPly, false);
  }

  /** Stops everything this Director started (tests, HMR). */
  public dispose(): void {
    this.stopPlayback();
    this.ctx.revert();
    this.currentTimeline = null;
    this.targetPly = null;
  }

  // ---------------------------------------------------------------------------
  // Playback machinery
  // ---------------------------------------------------------------------------

  private setPlaying(playing: boolean): void {
    this.isPlaying = playing;
    this.store.getState().setPlaying(playing);
  }

  private stopPlayback(): void {
    this.setPlaying(false);
    this.cancelRest();
  }

  private cancelRest(): void {
    this.restCall?.kill();
    this.restCall = null;
  }

  private async startAudio(): Promise<void> {
    if (!(await this.audioEngine.unlock())) return;
    // No background music in v1 (M7 decision): sound is foley and silence only
    void this.soundBank.loadSamples(); // lazy: foley samples arrive after the CTA
  }

  private playNextStep(): void {
    if (!this.isPlaying) return;
    if (this.currentPly >= LAST_PLY) {
      this.setPlaying(false);
      return;
    }
    const nextPly = this.currentPly + 1;
    // Check for interactive challenge (Item 11)
    const answered = this.challengeAnswered;
    this.challengeAnswered = false;
    if (nextPly === 47 && this.mode === 'cinematic' && this.store.getState().challengeEnabled && !answered) {
      this.setPlaying(false);
      this.store.getState().setChallengeActive(true);
      return;
    }
    this.animatePly(nextPly);
  }

  private scheduleNext(completedPly: number): void {
    if (completedPly >= LAST_PLY) {
      this.setPlaying(false);
      return;
    }
    const rest = this.mode === 'cinematic' ? getRestDurationForAct(getActForPly(completedPly).id) : STUDY_REST_SECONDS;
    this.ctx.add(() => {
      this.restCall = gsap.delayedCall(rest / this.speed, () => {
        this.restCall = null;
        this.playNextStep();
      });
    });
  }

  private onStepComplete(ply: number): void {
    this.currentTimeline = null;
    this.targetPly = null;
    this.currentPly = ply;
    // Invariant: a finished ply looks exactly like seek(ply) — except the camera keeps easing
    this.registry.clearAllTransientFx();
    this.store.getState().setActTitleCard(null);
    this.applyRestingState(ply, false);
    this.store.getState().setPly(ply);
    if (this.isPlaying) this.scheduleNext(ply);
  }

  /** Kill everything, clear transients and rebuild the resting state of `ply`. */
  private reconstruct(ply: number, snapCamera: boolean): void {
    const target = clampPly(ply);

    // 1. Kill every timeline / tween / delayed call the Director created
    this.cancelRest();
    this.ctx.revert();
    this.ctx = gsap.context(() => {});
    this.currentTimeline = null;
    this.targetPly = null;

    // 2. Clear transient FX (an engine line included) and transient text
    this.registry.clearAllTransientFx();
    this.ghostActive = false;
    const s = this.store.getState();
    s.setOverlay(null);
    s.setActTitleCard(null);
    s.setGhostLineId(null);
    s.setChallengeActive(false); // the challenge is transient too: a seek closes it
    this.challengeAnswered = false;

    // 3–5. Resting state, audio, store
    this.soundBank.stopAll();
    this.currentPly = target;
    this.applyRestingState(target, snapCamera);
    this.store.getState().setPly(target);
    this.registry.requestFrame();
  }

  private applyRestingState(ply: number, snapCamera: boolean): void {
    const state = getExperienceState(ply, this.mode);
    const settings = this.store.getState();

    for (const [id, square] of Object.entries(state.pieces)) {
      const piece = this.registry.getPiece(id as PieceId);
      if (!piece) continue;
      if (square === 'captured') {
        const tray = trayPosition(id, ply);
        piece.position.set(tray.x, 0, tray.z);
      } else {
        const coords = squareToCoords(square as Square);
        piece.position.set(coords.x, 0, coords.z);
      }
      piece.rotation.set(0, 0, 0);
      this.registry.disintegrate.reset(piece);
    }

    // Persistent FX
    const { kingTrail, lastMove, checkMarker, kingHighlight } = state.persistentFx;
    if (kingTrail.length > 0) this.registry.kingTrail.setTrail(kingTrail);
    else this.registry.kingTrail.clear();
    this.registry.boardMarks.setLastMove(
      lastMove ? [squareToCoords(lastMove[0]), squareToCoords(lastMove[1])] : undefined,
    );
    this.registry.boardMarks.setCheck(checkMarker ? squareToCoords(checkMarker) : undefined);
    this.registry.boardMarks.setKingHighlight(kingHighlight ? squareToCoords(kingHighlight) : undefined);

    // Pressure Grid during King Hunt (ply 49..70)
    if (ply >= 49 && ply <= 70 && settings.effectsLevel === 'full') {
      const pressureData = computePressureMap(state.pieces);
      this.registry.pressureGrid.update(pressureData);
    } else {
      this.registry.pressureGrid.clear();
    }

    // Camera (study mode leaves the camera to the user)
    if (state.shot) {
      const shotId = adaptShotForMotion(state.shot, settings.reducedMotion);
      this.cameraRig.applyShot(resolveShot(shotId, ply, settings.breakpoint), snapCamera);
    }

    applyAtmosphere(this.registry, state.atmosphere);

    settings.setActiveAct(state.act);
    settings.setVignette(state.post.vignette);
    settings.setOverlay(state.overlay);
  }

  private stepOptions(): StepOptions {
    const s = this.store.getState();
    return {
      cinematic: this.mode === 'cinematic',
      speed: this.speed,
      effectsLevel: s.effectsLevel,
      reducedMotion: s.reducedMotion,
      breakpoint: s.breakpoint,
    };
  }

  private deps(): BuildDeps {
    return {
      registry: this.registry,
      soundBank: this.soundBank,
      audioEngine: this.audioEngine,
      cameraRig: this.cameraRig,
      store: this.store,
    };
  }

  private animatePly(targetPly: number): void {
    const step = REPLAY_STEPS[targetPly - 1];
    if (!step) return;

    const opts = this.stepOptions();
    const targetState = getExperienceState(targetPly, this.mode);
    const act = getActForPly(targetPly);
    const actChanged = act.id !== getActForPly(this.currentPly).id;
    const continuous = opts.cinematic && this.isPlaying;
    this.targetPly = targetPly;

    this.ctx.add(() => {
      const master = gsap.timeline({ onComplete: () => this.onStepComplete(targetPly) });
      master.timeScale(this.speed);

      if (opts.cinematic) {
        // Light, fog and vignette follow the ply being played. Entering Act III
        // darkens the periphery into the sacrifice; entering Act IV re-opens the light.
        const fade = actChanged ? (act.id === 'ACT_III' ? 1.4 : 1.0) : 0.8;
        master.add(tweenAtmosphere(this.registry, targetState.atmosphere, fade), 0);
        master.call(() => this.store.getState().setVignette(targetState.post.vignette), [], 0);
      }

      let stepStart = 0;
      if (continuous && actChanged && act.id !== 'ACT_III' && act.id !== 'ACT_IV') {
        const transition = buildActTransition(act, targetPly, this.cameraRig, this.store, opts.breakpoint);
        master.add(transition, 0);
        stepStart = transition.duration();
      }
      if (continuous && targetPly === ACT_IV_TITLE_PLY) {
        master.add(buildTitleCard(this.store, 'IV · THE HUNT', ACT_IV_TITLE_SECONDS), 0);
      }

      master.add(this.buildStepTimeline(step, opts), stepStart);
      this.currentTimeline = master;
    });

    this.registry.requestFrame();
  }

  private buildStepTimeline(step: ReplayStep, opts: StepOptions): gsap.core.Timeline {
    const deps = this.deps();

    // Study: plain, short moves — no overlays, title cards, slow motion or camera work
    if (!opts.cinematic) {
      const tl = buildBaseMove(step, deps, { ...opts, effectsLevel: 'reduced' });
      if (tl.duration() > 0) tl.duration(STUDY_MOVE_SECONDS);
      return tl;
    }

    const primary = step.types[0];
    if (primary === 'SACRIFICE') return buildSacrificeAnimation(step, deps, opts);
    if (primary === 'FINAL_MOVE') return buildFinalAnimation(step, deps, opts);

    let tl: gsap.core.Timeline;
    if (primary === 'KING_HUNT') {
      tl = buildKingHuntAnimation(step, deps, opts);
    } else {
      tl = gsap.timeline();
      tl.add(buildBaseMove(step, deps, opts), 0);
      if (step.isCheck && step.checkSquare) {
        // the warning lands with the piece, never before it
        tl.add(buildCheckAnimation(step, step.checkSquare, deps, { showLabel: true }), baseMoveLandTime(step));
      }
    }

    this.addCameraCues(tl, step, opts);
    return tl;
  }

  /** Camera choreography (E2): the ply's cues placed at pre / onLift / onLand / post. */
  private addCameraCues(tl: gsap.core.Timeline, step: ReplayStep, opts: StepOptions): void {
    const end = tl.duration();
    const cueTime: Record<ShotTiming, number> = {
      pre: 0,
      onLift: Math.min(LIFT_CUE_TIME, end),
      onLand: Math.min(baseMoveLandTime(step), end),
      post: end,
    };

    for (const cue of getChoreographyForPly(step.ply)) {
      const shotId = adaptShotForMotion(cue.shot, opts.reducedMotion);
      // reduced motion: cuts and whips become dollies
      const snap: CameraTransition =
        opts.reducedMotion || (cue.transition !== 'cut' && cue.transition !== 'whip') ? 'dolly' : cue.transition;
      tl.call(
        () => this.cameraRig.applyShot(resolveShot(shotId, step.ply, opts.breakpoint), snap),
        [],
        cueTime[cue.timing],
      );
    }
  }
}

export const globalDirector = new Director();
