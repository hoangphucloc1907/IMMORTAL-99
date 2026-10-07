import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { REPLAY_STEPS } from '../src/game/replay';
import { squareToCoords } from '../src/game/coordinates';
import { Square } from '../src/game/types';
import { getChoreographyForPly, restingShot } from '../src/experience/choreography';
import { resolveShot } from '../src/experience/shots';
import { Breakpoint, ShotDef, ShotId } from '../src/experience/types';

// §E1 framing constraint: the destination (and the checked king) is inside the safe area of the
// resting shot; the origin square is inside the frame when the piece lifts. The safe area keeps
// clear of the bottom control bar (~17% of the height) and the outer edges.
const SAFE = { left: -0.94, right: 0.94, top: 0.94, bottom: -0.62 };
const ASPECT: Record<Breakpoint, number> = { desktop: 16 / 9, tablet: 4 / 3, mobile: 390 / 844 };
const PIECE_MID_HEIGHT = 0.35; // aim at the body of the piece, not the floor of the square

function project(shot: ShotDef, aspect: number, square: Square): THREE.Vector3 {
  const camera = new THREE.PerspectiveCamera(shot.fov, aspect, 0.1, 100);
  camera.position.set(...shot.position);
  camera.lookAt(...shot.target);
  if (shot.roll) camera.rotateZ(THREE.MathUtils.degToRad(shot.roll));
  camera.updateMatrixWorld();
  const { x, z } = squareToCoords(square);
  return new THREE.Vector3(x, PIECE_MID_HEIGHT, z).project(camera);
}

function inSafeArea(ndc: THREE.Vector3): boolean {
  return ndc.z < 1 && ndc.x >= SAFE.left && ndc.x <= SAFE.right && ndc.y >= SAFE.bottom && ndc.y <= SAFE.top;
}

/** The shot on screen when the piece lifts: the ply's last pre/onLift cue, else the previous rest. */
function shotAtLift(ply: number): ShotId {
  const early = getChoreographyForPly(ply).filter((c) => c.timing === 'pre' || c.timing === 'onLift');
  return early.length ? early[early.length - 1].shot : restingShot(ply - 1);
}

describe('camera framing (§E1)', () => {
  for (const breakpoint of ['desktop', 'tablet', 'mobile'] as const) {
    it(`${breakpoint}: destination, checked king and origin stay in the safe area`, () => {
      const failures: string[] = [];
      for (const step of REPLAY_STEPS) {
        const rest = resolveShot(restingShot(step.ply), step.ply, breakpoint);
        const lift = resolveShot(shotAtLift(step.ply), step.ply, breakpoint);
        const checks: Array<[string, ShotDef, Square]> = [
          ['to', rest, step.to],
          ['from', lift, step.from],
        ];
        if (step.checkSquare) checks.push(['king', rest, step.checkSquare]);

        for (const [label, shot, square] of checks) {
          const ndc = project(shot, ASPECT[breakpoint], square);
          if (!inSafeArea(ndc)) {
            failures.push(
              `${step.ply} ${step.san} ${label}=${square} via ${shot.id} → (${ndc.x.toFixed(2)}, ${ndc.y.toFixed(2)})`,
            );
          }
        }
      }
      expect(failures).toEqual([]);
    });
  }
});
