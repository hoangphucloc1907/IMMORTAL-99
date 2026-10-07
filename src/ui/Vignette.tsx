import React from 'react';
import { useReplayStore } from './useReplayStore';

// CSS vignette (no post-processing pass). Opacity changes at ply boundaries; CSS eases it.
export const Vignette: React.FC = () => {
  const vignette = useReplayStore((s) => s.vignette);

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.95) 100%)',
        opacity: vignette,
        transition: 'opacity 1.2s ease',
      }}
    />
  );
};
