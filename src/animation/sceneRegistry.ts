import * as THREE from 'three';
import { PieceId } from '../game/types';
import { LightingPresetId } from '../experience/types';
import { ImpactEffect } from '../effects/Impact';
import { CheckPulseEffect } from '../effects/CheckPulse';
import { AttackLineEffect } from '../effects/AttackLine';
import { KingTrailEffect } from '../effects/KingTrail';
import { ParticlesEffect } from '../effects/Particles';
import { DisintegrateEffect } from '../effects/Disintegrate';
import { BoardMarksEffect } from '../effects/BoardMarks';
import { ForceLinesEffect } from '../effects/ForceLines';
import { GhostBoardEffect } from '../effects/GhostBoard';
import { PressureGrid } from '../effects/PressureGrid';

export interface SceneLights {
  ambient?: THREE.AmbientLight;
  key?: THREE.DirectionalLight;
  rim?: THREE.DirectionalLight;
  fill?: THREE.DirectionalLight;
  spot?: THREE.SpotLight;
}

export class SceneRegistry {
  private pieces = new Map<PieceId, THREE.Object3D>();
  private frameRequester: (() => void) | null = null;
  private photoCapturer: (() => Promise<string>) | null = null;

  public lights: SceneLights = {};
  public fog: THREE.FogExp2 | null = null;
  public appliedLighting: LightingPresetId | null = null;

  public impact = new ImpactEffect();
  public checkPulse = new CheckPulseEffect();
  public attackLine = new AttackLineEffect();
  public kingTrail = new KingTrailEffect();
  public particles = new ParticlesEffect();
  public disintegrate = new DisintegrateEffect();
  public boardMarks = new BoardMarksEffect();
  public forceLines = new ForceLinesEffect();
  public ghostBoard = new GhostBoardEffect();
  public pressureGrid = new PressureGrid();

  public registerPiece(id: PieceId, object: THREE.Object3D): void {
    this.pieces.set(id, object);
  }

  public unregisterPiece(id: PieceId): void {
    this.pieces.delete(id);
  }

  public getPiece(id: PieceId): THREE.Object3D | undefined {
    return this.pieces.get(id);
  }

  public getAllPieces(): Map<PieceId, THREE.Object3D> {
    return this.pieces;
  }

  public registerLights(lights: SceneLights): void {
    this.lights = lights;
  }

  public registerFog(fog: THREE.FogExp2 | null): void {
    this.fog = fog;
  }

  /** The scene provides R3F's invalidate() so frameloop="demand" wakes up after seek/next. */
  public setFrameRequester(requester: (() => void) | null): void {
    this.frameRequester = requester;
  }

  public requestFrame(): void {
    this.frameRequester?.();
  }

  /** The scene renders a fresh frame and reads it back as a PNG data URL (photo mode, §12b D12). */
  public setPhotoCapturer(capturer: (() => Promise<string>) | null): void {
    this.photoCapturer = capturer;
  }

  public capturePhoto(): Promise<string | null> {
    return this.photoCapturer ? this.photoCapturer() : Promise.resolve(null);
  }

  public clearAllTransientFx(): void {
    this.impact.clear();
    this.checkPulse.clear();
    this.attackLine.clear();
    this.particles.clear();
    this.forceLines.clear();
    this.ghostBoard.clear();
  }

  public activeTransientFxCount(): number {
    return [this.impact, this.checkPulse, this.attackLine, this.particles, this.forceLines, this.ghostBoard].filter(
      (fx) => fx.group.visible,
    ).length;
  }
}

export const globalSceneRegistry = new SceneRegistry();
