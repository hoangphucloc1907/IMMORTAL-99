import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor } from '@react-three/drei';
import { useStore } from 'zustand';
import { Atmosphere } from './Atmosphere';
import { Lighting } from './Lighting';
import { ChessBoard } from './ChessBoard';
import { PieceSet } from './PieceSet';
import { EffectsLayer } from './EffectsLayer';
import { CameraController } from './CameraController';
import { ShaderWarmup } from './ShaderWarmup';
import { MaterialQuality } from './materials';
import { globalReplayStore } from '../store/replayStore';
import { globalDirector } from '../animation/Director';

// Separate chunk: only desktop with full effects ever downloads the post-processing code
const PostFX = lazy(() => import('./PostFX'));
// drei's Environment pulls in the HDR/EXR/gain-map loaders even when unused: load the studio
// reflections after the first frame instead of in the entry chunk (§9 budget: JS ≤ ~400 KB gzip)
const Studio = lazy(() => import('./Studio').then((m) => ({ default: m.Studio })));

// Last child of the scene: its effect runs after every piece, light and fog has registered.
// A deep link seeks before the scene exists, so rebuild that ply now. Skipped while the intro is up
// (the CTA seeks itself) and while a move is playing (the viewer pressed the CTA before 3D was ready).
const RebuildOnMount: React.FC = () => {
  useEffect(() => {
    if (!globalReplayStore.getState().showIntro && !globalDirector.isBusy()) {
      globalDirector.seek(globalDirector.getPly());
    }
  }, []);
  return null;
};

export const Stage: React.FC = () => {
  const breakpoint = useStore(globalReplayStore, (s) => s.breakpoint);
  const effectsLevel = useStore(globalReplayStore, (s) => s.effectsLevel);
  const quality: MaterialQuality = breakpoint === 'desktop' && effectsLevel === 'full' ? 'high' : 'low';

  // PerformanceMonitor (§12): lower the pixel ratio first; if the device keeps struggling, drop to
  // reduced effects (no composer, no particles, cheaper materials).
  const maxDpr = breakpoint === 'mobile' ? 1.5 : 2;
  const [dprCap, setDprCap] = useState(maxDpr);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Renders on demand: CameraController keeps frames coming while anything moves */}
      <Canvas
        dpr={[1, Math.min(dprCap, maxDpr)]}
        frameloop="demand"
        shadows
        gl={{
          powerPreference: 'high-performance',
          antialias: true,
        }}
        onCreated={({ gl }) => {
          gl.toneMappingExposure = 1.15; // ACES compresses mid-tones; lift them slightly
          // Context loss (§12): allow the browser to restore it, then rebuild the current ply
          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', (event) => event.preventDefault());
          canvas.addEventListener('webglcontextrestored', () => globalDirector.seek(globalDirector.getPly()));
        }}
        camera={{
          position: [0, 7.8, 7.2],
          fov: 44,
          near: 0.1,
          far: 100,
        }}
      >
        <PerformanceMonitor
          onDecline={() => setDprCap((d) => Math.max(1, d - 0.5))}
          onFallback={() => globalReplayStore.getState().setEffectsLevel('reduced')}
        />
        <Suspense fallback={null}>
          <Atmosphere />
          <Lighting />
          <ChessBoard quality={quality} />
          <PieceSet quality={quality} />
          <EffectsLayer />
          <CameraController />
          <ShaderWarmup version={quality} />
          <RebuildOnMount />
        </Suspense>
        <Suspense fallback={null}>
          <Studio resolution={quality === 'high' ? 256 : 64} />
        </Suspense>
        {quality === 'high' && (
          <Suspense fallback={null}>
            <PostFX />
          </Suspense>
        )}
      </Canvas>
    </div>
  );
};
