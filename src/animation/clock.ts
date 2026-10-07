import gsap from 'gsap';

// GSAP must have exactly one time source. Its internal rAF ticker is detached so the
// R3F frame loop (or tick() in tests) is the only driver of gsap.updateRoot. With both
// running, tweens render on one clock and complete on the other (visible jumps).
gsap.ticker.remove(gsap.updateRoot);

// With frameloop="demand" the first delta after an idle period can be seconds long;
// clamp it so a freshly created timeline never completes in a single frame.
const MAX_FRAME_DELTA = 1 / 20;

export class AnimationClock {
  private time = gsap.ticker.time; // continue from wherever the root timeline already is
  private isManual = false;

  public setManualMode(enabled: boolean): void {
    this.isManual = enabled;
  }

  public isManualMode(): boolean {
    return this.isManual;
  }

  /** Called once per rendered frame. Ignored in manual mode (tests drive time via tick). */
  public update(deltaSeconds: number): void {
    if (this.isManual) return;
    this.advance(Math.min(deltaSeconds, MAX_FRAME_DELTA));
  }

  public tick(milliseconds: number): void {
    this.advance(milliseconds / 1000);
  }

  public getTime(): number {
    return this.time;
  }

  private advance(deltaSeconds: number): void {
    this.time += deltaSeconds;
    gsap.updateRoot(this.time);
  }
}

export const globalClock = new AnimationClock();
