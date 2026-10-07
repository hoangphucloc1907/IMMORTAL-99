// Native Web Audio API wrapper (zero external dependencies)

/** Stereo impulse response: decaying noise — a stone hall without shipping an IR file. */
function createRoomImpulse(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds);
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private reverbInput: GainNode | null = null;
  private unlocked = false;
  private masterVolume = 1;

  public init(): void {
    if (this.ctx || typeof window === 'undefined') return;
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();

    this.masterGain.gain.value = this.masterVolume; // honour a mute chosen before the first play
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Shared room reverb: dry, close moves vs. the sacrifice ringing out in a large space
    this.reverbInput = this.ctx.createGain();
    const convolver = this.ctx.createConvolver();
    convolver.buffer = createRoomImpulse(this.ctx, 3.2, 2.6);
    const reverbReturn = this.ctx.createGain();
    reverbReturn.gain.value = 0.55;
    this.reverbInput.connect(convolver);
    convolver.connect(reverbReturn);
    reverbReturn.connect(this.masterGain);
  }

  /** Send bus into the room reverb (one-shots connect a gain node here). */
  public getReverbInput(): GainNode | null {
    return this.reverbInput;
  }

  /** Must be called from a user gesture. Resolves true once the context is running. */
  public async unlock(): Promise<boolean> {
    this.init();
    if (!this.ctx) return false;

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    this.unlocked = this.ctx.state === 'running';
    return this.unlocked;
  }

  public isUnlocked(): boolean {
    return this.unlocked && this.ctx?.state === 'running';
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public getSfxGain(): GainNode | null {
    return this.sfxGain;
  }

  public setMasterVolume(val: number): void {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.02);
    }
  }
}

export const globalAudioEngine = new AudioEngine();
