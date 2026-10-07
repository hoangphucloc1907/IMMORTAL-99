import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { globalSceneRegistry } from '../animation/sceneRegistry';
import { LIGHTING_PRESETS } from '../experience/atmosphere';

const INITIAL = LIGHTING_PRESETS.ACT_I;

export const Lighting: React.FC = () => {
  const scene = useThree((s) => s.scene);
  const ambient = useRef<THREE.AmbientLight>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const rim = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const spot = useRef<THREE.SpotLight>(null);

  // Intensities are driven by the Director (atmosphere presets per Act / tension)
  useEffect(() => {
    const spotLight = spot.current;
    if (spotLight) scene.add(spotLight.target);
    globalSceneRegistry.registerLights({
      ambient: ambient.current ?? undefined,
      key: key.current ?? undefined,
      rim: rim.current ?? undefined,
      fill: fill.current ?? undefined,
      spot: spotLight ?? undefined,
    });
    return () => {
      if (spotLight) scene.remove(spotLight.target);
      globalSceneRegistry.registerLights({});
    };
  }, [scene]);

  return (
    <group name="Lighting">
      {/* Soft ambient base */}
      <ambientLight ref={ambient} intensity={INITIAL.ambient} color="#dbe2ef" />

      {/* Main directional key light casting shadows */}
      <directionalLight
        ref={key}
        position={[6, 12, 8]}
        intensity={INITIAL.key}
        color="#fff8f0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0005}
      />

      {/* Cool rim light from behind */}
      <directionalLight ref={rim} position={[-8, 6, -8]} intensity={INITIAL.rim} color="#7f9eb2" />

      {/* Soft fill light */}
      <directionalLight ref={fill} position={[0, 4, -6]} intensity={INITIAL.fill} color="#9aa0a6" />

      {/* Narrow cone that isolates the tactical zone (Act III: the d-file) */}
      <spotLight
        ref={spot}
        position={[-0.5, 7.5, 4.5]}
        angle={0.32}
        penumbra={0.85}
        decay={0}
        intensity={INITIAL.spot}
        color="#ffe9c4"
      />
    </group>
  );
};
