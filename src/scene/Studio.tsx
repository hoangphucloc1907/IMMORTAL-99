import React from 'react';
import { Environment, Lightformer } from '@react-three/drei';

/**
 * Reflections for the polished pieces (§9 "HDRI tối, studio nhỏ"): a small dark studio rendered
 * once into the environment map from a few soft light panels — no HDRI file, no CDN preset.
 * It only feeds reflections (`background` stays the scene colour).
 */
export const Studio: React.FC<{ resolution: number }> = ({ resolution }) => (
  <Environment resolution={resolution} frames={1} environmentIntensity={0.55}>
    <color attach="background" args={['#050506']} />
    {/* Large soft key above, like the hall's ceiling light */}
    <Lightformer
      form="rect"
      intensity={1.6}
      color="#f4ead8"
      position={[0, 6, 1]}
      rotation-x={Math.PI / 2}
      scale={[8, 4, 1]}
    />
    {/* Cold window light from behind Black (Wijk aan Zee, winter) */}
    <Lightformer form="rect" intensity={1.1} color="#b8c8dc" position={[0, 3, -8]} scale={[10, 3, 1]} />
    {/* Thin warm strips on the sides: long highlights along the pieces */}
    <Lightformer
      form="rect"
      intensity={0.7}
      color="#e8d7b8"
      position={[-7, 2, 0]}
      rotation-y={Math.PI / 2}
      scale={[6, 0.6, 1]}
    />
    <Lightformer
      form="rect"
      intensity={0.5}
      color="#e8d7b8"
      position={[7, 2, 0]}
      rotation-y={-Math.PI / 2}
      scale={[6, 0.6, 1]}
    />
  </Environment>
);
