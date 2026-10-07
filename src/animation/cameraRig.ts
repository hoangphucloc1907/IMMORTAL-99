import * as THREE from 'three';
import { ShotDef } from '../experience/types';

export type CameraTransition = 'cut' | 'dolly' | 'whip';

const DOLLY_DAMPING = 0.12;
const WHIP_DAMPING = 0.38; // a fast, deliberate swing (31.Qxf6) — still eased, never a jump

export class CameraRig {
  // Goal values driven by the Director (cues, GSAP tweens)
  public targetPosition = new THREE.Vector3(0, 7.8, 7.2);
  public targetLookAt = new THREE.Vector3(0, 0, 0);
  public targetFov = 44;
  public targetRoll = 0; // radians
  public targetDof = 0; // 0..1, how much depth of field the shot wants

  // Actual interpolated values
  public currentPosition = new THREE.Vector3(0, 7.8, 7.2);
  public currentLookAt = new THREE.Vector3(0, 0, 0);
  public currentFov = 44;
  public currentRoll = 0;
  public currentDof = 0;

  // Shake
  private shakeIntensity = 0;
  private shakeDecay = 0;
  private shakeOffset = new THREE.Vector3();

  public damping = DOLLY_DAMPING;

  /** `snap` (bool) is kept for existing callers: true = cut, false = dolly. */
  public applyShot(shot: ShotDef, transition: CameraTransition | boolean = false): void {
    const mode: CameraTransition = transition === true ? 'cut' : transition === false ? 'dolly' : transition;
    this.targetPosition.set(shot.position[0], shot.position[1], shot.position[2]);
    this.targetLookAt.set(shot.target[0], shot.target[1], shot.target[2]);
    this.targetFov = shot.fov;
    this.targetRoll = THREE.MathUtils.degToRad(shot.roll ?? 0);
    this.targetDof = shot.dof ? 1 : 0;
    this.damping = mode === 'whip' ? WHIP_DAMPING : DOLLY_DAMPING;

    if (mode === 'cut') {
      this.snap();
    }
  }

  public snap(): void {
    this.currentPosition.copy(this.targetPosition);
    this.currentLookAt.copy(this.targetLookAt);
    this.currentFov = this.targetFov;
    this.currentRoll = this.targetRoll;
    this.currentDof = this.targetDof;
    this.shakeIntensity = 0;
    this.shakeOffset.set(0, 0, 0);
  }

  /** True when the camera has reached its target and no shake is running (lets frameloop="demand" sleep). */
  public isSettled(): boolean {
    return (
      this.shakeIntensity === 0 &&
      this.currentPosition.distanceToSquared(this.targetPosition) < 1e-6 &&
      this.currentLookAt.distanceToSquared(this.targetLookAt) < 1e-6 &&
      Math.abs(this.currentFov - this.targetFov) < 0.01 &&
      Math.abs(this.currentRoll - this.targetRoll) < 1e-4 &&
      Math.abs(this.currentDof - this.targetDof) < 1e-3
    );
  }

  public triggerShake(intensity = 0.008, duration = 0.18): void {
    // Restrained camera shake per Section 7: <= 0.01 units, <= 0.2s
    this.shakeIntensity = Math.min(0.01, intensity);
    this.shakeDecay = duration > 0 ? this.shakeIntensity / duration : 10;
  }

  public update(dt: number, camera?: THREE.PerspectiveCamera): void {
    // Decay shake
    if (this.shakeIntensity > 0) {
      this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * dt);
      this.shakeOffset.set(
        (Math.random() - 0.5) * 2 * this.shakeIntensity,
        (Math.random() - 0.5) * 2 * this.shakeIntensity,
        (Math.random() - 0.5) * 2 * this.shakeIntensity,
      );
    } else {
      this.shakeOffset.set(0, 0, 0);
    }

    // Damp toward the targets (frame-rate independent)
    const factor = Math.min(1, this.damping * (dt / 0.016));
    this.currentPosition.lerp(this.targetPosition, factor);
    this.currentLookAt.lerp(this.targetLookAt, factor);
    this.currentFov += (this.targetFov - this.currentFov) * factor;
    this.currentRoll += (this.targetRoll - this.currentRoll) * factor;
    this.currentDof += (this.targetDof - this.currentDof) * factor;

    if (camera) {
      camera.position.copy(this.currentPosition).add(this.shakeOffset);
      camera.lookAt(this.currentLookAt);
      if (this.currentRoll !== 0) camera.rotateZ(this.currentRoll); // Dutch tilt around the view axis
      if (Math.abs(camera.fov - this.currentFov) > 0.01) {
        camera.fov = this.currentFov;
        camera.updateProjectionMatrix();
      }
    }
  }
}

export const globalCameraRig = new CameraRig();
