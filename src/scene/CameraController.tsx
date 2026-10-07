import React, { lazy, Suspense, useEffect } from 'react';
import { addAfterEffect, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from 'zustand';
import { globalCameraRig } from '../animation/cameraRig';
import { globalClock } from '../animation/clock';
import { globalDirector } from '../animation/Director';
import { globalSceneRegistry } from '../animation/sceneRegistry';
import { globalReplayStore } from '../store/replayStore';

const UserOrbit = lazy(() => import('./UserOrbit'));

const MAX_RIG_DELTA = 1 / 20;
const PHOTO_BACKDROP = '#0a0b0d'; // the page background behind the canvas (app/App.tsx)

export const CameraController: React.FC = () => {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const mode = useStore(globalReplayStore, (s) => s.mode);
  const isPhotoMode = useStore(globalReplayStore, (s) => s.isPhotoMode);

  // Lets the Director wake the demand frame loop after seek / next / play
  useEffect(() => {
    globalSceneRegistry.setFrameRequester(invalidate);
    invalidate();
    return () => globalSceneRegistry.setFrameRequester(null);
  }, [invalidate]);

  // Photo capture: the drawing buffer is not preserved (a per-frame copy on tiled mobile GPUs), so read
  // the canvas right after a fresh frame has rendered, in the same task — post-processing included
  const canvas = useThree((s) => s.gl.domElement);
  useEffect(() => {
    globalSceneRegistry.setPhotoCapturer(
      () =>
        new Promise<string>((resolve) => {
          const unsubscribe = addAfterEffect(() => {
            unsubscribe();
            // The WebGL canvas is transparent (the page supplies the dark backdrop): flatten onto it
            const photo = document.createElement('canvas');
            photo.width = canvas.width;
            photo.height = canvas.height;
            const ctx = photo.getContext('2d')!;
            ctx.fillStyle = PHOTO_BACKDROP;
            ctx.fillRect(0, 0, photo.width, photo.height);
            ctx.drawImage(canvas, 0, 0);
            resolve(photo.toDataURL('image/png'));
          });
          invalidate();
        }),
    );
    return () => globalSceneRegistry.setPhotoCapturer(null);
  }, [canvas, invalidate]);

  useFrame((_, delta) => {
    // One clock for GSAP, camera damping and rendering
    globalClock.update(delta);

    const cinematic = mode === 'cinematic' && !isPhotoMode;
    if (cinematic) {
      globalCameraRig.update(Math.min(delta, MAX_RIG_DELTA), camera as THREE.PerspectiveCamera);
      globalSceneRegistry.pressureGrid.tick(
        delta,
        globalDirector.isBusy() && !globalReplayStore.getState().reducedMotion,
      );
    }

    // frameloop="demand": keep rendering while a timeline runs or the camera is still easing
    if (globalDirector.isBusy() || (cinematic && !globalCameraRig.isSettled()) || isPhotoMode) {
      invalidate();
    }
  });

  if (mode === 'study' || isPhotoMode) {
    return (
      <Suspense fallback={null}>
        <UserOrbit />
      </Suspense>
    );
  }

  return null;
};
