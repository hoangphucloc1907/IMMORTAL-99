import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { globalSceneRegistry } from '../animation/sceneRegistry';

/**
 * Shader warm-up (§12, M8): compile every program while the Intro is on screen, so the first
 * capture, check pulse or ghost never stalls a frame. Hidden effect groups are briefly made
 * visible for the compile (three.js skips invisible objects), then restored.
 */
export const ShaderWarmup: React.FC<{ version: unknown }> = ({ version }) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);

  useEffect(() => {
    const r = globalSceneRegistry;
    const groups = [
      r.impact,
      r.checkPulse,
      r.attackLine,
      r.kingTrail,
      r.particles,
      r.forceLines,
      r.ghostBoard,
      r.boardMarks,
      r.pressureGrid,
    ].map((fx) => fx.group);
    const visibility = groups.map((g) => g.visible);
    groups.forEach((g) => (g.visible = true));
    try {
      gl.compile(scene, camera);
    } finally {
      groups.forEach((g, i) => (g.visible = visibility[i]));
    }
  }, [gl, scene, camera, version]);

  return null;
};
