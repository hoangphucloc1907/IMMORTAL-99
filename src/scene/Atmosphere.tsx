import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { globalSceneRegistry } from '../animation/sceneRegistry';

// Wijk aan Zee in January (§C9): tall windows far behind the board, grey North Sea winter light.
// Kept dim and out of focus — a sense of place, never a set piece competing with the board.
const WINDOW_XS = [-10, 0, 10];
const WINDOW_Z = -18;

function windowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, 'rgba(196, 210, 226, 1)'); // overcast sky
  sky.addColorStop(0.55, 'rgba(120, 138, 160, 0.8)');
  sky.addColorStop(1, 'rgba(40, 48, 60, 0)'); // fades into the room
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Mullions: one vertical, two horizontal bars
  ctx.fillStyle = 'rgba(10, 11, 13, 1)';
  ctx.fillRect(canvas.width / 2 - 2, 0, 4, canvas.height);
  ctx.fillRect(0, canvas.height * 0.33, canvas.width, 4);
  ctx.fillRect(0, canvas.height * 0.66, canvas.width, 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const Atmosphere: React.FC = () => {
  const scene = useThree((s) => s.scene);
  const fog = useMemo(() => new THREE.FogExp2('#0c0e12', 0.025), []);
  const windowMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: windowTexture(),
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        fog: false, // the light comes through the haze on purpose
      }),
    [],
  );

  // Fog density is driven by the Director (Act preset + tension)
  useEffect(() => {
    scene.fog = fog;
    globalSceneRegistry.registerFog(fog);
    return () => {
      scene.fog = null;
      globalSceneRegistry.registerFog(null);
    };
  }, [scene, fog]);

  return (
    <group name="Atmosphere">
      <color attach="background" args={['#0a0b0d']} />
      {WINDOW_XS.map((x) => (
        <mesh key={x} position={[x, 6, WINDOW_Z]} material={windowMaterial}>
          <planeGeometry args={[4.2, 10]} />
        </mesh>
      ))}
    </group>
  );
};
