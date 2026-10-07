import { AudioEngine, globalAudioEngine } from './engine';
import { triggerHaptic } from './haptics';

export type SampleName = 'move' | 'capture' | 'topple' | 'checkRing' | 'impact' | 'heartbeat';
export type SampleUrls = Record<SampleName, string[]>;

/**
 * One-shot sound effects. Recorded foley samples (CC0, see CREDITS.md) when they have loaded;
 * the synthesized versions below remain as the fallback (before loading, or if a browser
 * cannot decode the format).
 */
export class SoundBank {
  private engine: AudioEngine;
  private active = new Set<AudioScheduledSourceNode>();
  private urls: SampleUrls | null = null;
  private buffers = new Map<SampleName, AudioBuffer[]>();
  private loading: Promise<void> | null = null;
  private variant = 0;
  // §12b D13: no vibration in reduced-effects mode (set by the app from the store)
  private hapticsLevel: 'full' | 'reduced' = 'full';

  constructor(engine: AudioEngine = globalAudioEngine) {
    this.engine = engine;
  }

  /** Provided by app/ (asset URLs live outside the audio layer). */
  public setSampleUrls(urls: SampleUrls): void {
    this.urls = urls;
  }

  /** Fetch + decode every sample once; call after the audio context is unlocked. */
  public loadSamples(): Promise<void> {
    const ctx = this.engine.getContext();
    if (!ctx || !this.urls) return Promise.resolve();
    if (!this.loading) {
      const urls = this.urls;
      this.loading = Promise.all(
        (Object.keys(urls) as SampleName[]).map(async (name) => {
          try {
            const decoded = await Promise.all(
              urls[name].map(async (url) => ctx.decodeAudioData(await (await fetch(url)).arrayBuffer())),
            );
            this.buffers.set(name, decoded);
          } catch (error) {
            console.warn(`Sound "${name}" unavailable, using the synthesized fallback`, error);
          }
        }),
      ).then(() => undefined);
    }
    return this.loading;
  }

  public hasSample(name: SampleName): boolean {
    return (this.buffers.get(name)?.length ?? 0) > 0;
  }

  /** Every one-shot goes through here so stopAll() can cut it on seek. */
  public setHapticsLevel(level: 'full' | 'reduced'): void {
    this.hapticsLevel = level;
  }

  private track(node: AudioScheduledSourceNode): void {
    this.active.add(node);
    node.onended = () => this.active.delete(node);
  }

  /** Routes a one-shot to the dry SFX bus and, by `reverb`, into the room. */
  private route(node: AudioNode, reverb: number): void {
    const ctx = this.engine.getContext();
    const dry = this.engine.getSfxGain();
    const room = this.engine.getReverbInput();
    if (!ctx || !dry) return;
    node.connect(dry);
    if (room && reverb > 0) {
      const send = ctx.createGain();
      send.gain.value = reverb;
      node.connect(send);
      send.connect(room);
    }
  }

  /** Plays a sample variant (round-robin, so repeats never sound identical); false if unavailable. */
  private playSample(
    name: SampleName,
    volume: number,
    opts: { rate?: number; reverb?: number; delay?: number; lowpass?: number } = {},
  ): boolean {
    const ctx = this.engine.getContext();
    const variants = this.buffers.get(name);
    if (!ctx || !variants?.length || !this.engine.isUnlocked()) return false;

    const source = ctx.createBufferSource();
    source.buffer = variants[this.variant++ % variants.length];
    source.playbackRate.value = opts.rate ?? 1;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    if (opts.lowpass) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = opts.lowpass;
      source.connect(filter);
      filter.connect(gain);
    } else {
      source.connect(gain);
    }
    this.route(gain, opts.reverb ?? 0);
    this.track(source);
    source.start(ctx.currentTime + (opts.delay ?? 0));
    return true;
  }

  // The three everyday sounds must be told apart by ear, not by volume alone (M4 review):
  //   move    — one small, dry, close "tock"
  //   capture — two beats: the attacker's strike, then the taken piece falling onto the board
  //   check   — on top of the landing (move/capture already sounds), a dark, ringing metallic
  //             tone: a warning, not wood at all

  public playMove(): void {
    triggerHaptic('move', this.hapticsLevel);
    if (!this.playSample('move', 0.32, { rate: 1.1, reverb: 0.03 })) this.synthMove();
  }

  public playCapture(): void {
    triggerHaptic('capture', this.hapticsLevel);
    if (!this.playSample('capture', 0.85, { rate: 0.85, reverb: 0.18 })) {
      this.synthCapture();
      return;
    }
    this.playSample('topple', 0.5, { rate: 1.25, reverb: 0.12, delay: 0.09 });
  }

  public playCheck(intensity = 0.5): void {
    triggerHaptic('check', this.hapticsLevel);
    const rang = this.playSample('checkRing', 0.35 + intensity * 0.35, { rate: 0.5, lowpass: 1400, reverb: 0.55 });
    if (!rang) this.synthCheck(intensity); // fallback warning tone
  }

  /** 24.Rxd4 / 24...cxd4: a heavy strike, pitched down, into a long reverb, over a sub layer. */
  public playSacrifice(): void {
    triggerHaptic('sacrifice', this.hapticsLevel);
    this.playSample('impact', 1.0, { rate: 0.7, reverb: 1.0 });
    this.synthSubImpact();
  }

  /** A single low heartbeat thump for the pause after the sacrifice. */
  public playHeartbeat(strength = 0.6): void {
    if (!this.playSample('heartbeat', strength, { rate: 0.75, reverb: 0.4 })) this.synthSubImpact();
  }

  private synthMove(): void {
    const ctx = this.engine.getContext();
    const dest = this.engine.getSfxGain();
    if (!ctx || !dest || !this.engine.isUnlocked()) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);

    osc.type = 'sine';
    const baseFreq = 120 + Math.random() * 20;
    osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    this.track(osc);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  }

  private synthCapture(): void {
    const ctx = this.engine.getContext();
    const dest = this.engine.getSfxGain();
    if (!ctx || !dest || !this.engine.isUnlocked()) return;

    // Deep stone resonance
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, ctx.currentTime);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    this.track(osc);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  }

  private synthCheck(intensity: number): void {
    const ctx = this.engine.getContext();
    const dest = this.engine.getSfxGain();
    if (!ctx || !dest || !this.engine.isUnlocked()) return;

    // Harmonic check sting
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.5);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(300 + intensity * 400, ctx.currentTime);

    gain.gain.setValueAtTime(0.14 + intensity * 0.14, ctx.currentTime); // sits under the check sample
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    this.track(osc);
    osc.start();
    osc.stop(ctx.currentTime + 0.65);
  }

  private synthSubImpact(): void {
    const ctx = this.engine.getContext();
    const dest = this.engine.getSfxGain();
    if (!ctx || !dest || !this.engine.isUnlocked()) return;

    // Heavy deep sub-impact for 24.Rxd4!!
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(90, ctx.currentTime);
    subOsc.frequency.exponentialRampToValueAtTime(28, ctx.currentTime + 0.8);

    subGain.gain.setValueAtTime(0.8, ctx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);

    subOsc.connect(subGain);
    subGain.connect(dest);

    this.track(subOsc);
    subOsc.start();
    subOsc.stop(ctx.currentTime + 1.3);
  }

  public stopAll(): void {
    for (const node of this.active) {
      try {
        node.stop();
      } catch {
        // already stopped
      }
    }
    this.active.clear();
  }
}

export const globalSoundBank = new SoundBank();
