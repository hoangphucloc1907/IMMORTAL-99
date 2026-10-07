import React, { lazy, Suspense, useEffect } from 'react';
import { useStore } from 'zustand';
import { Stage } from '../scene/Stage';
import { CinematicControls } from '../ui/CinematicControls';
import { NarrativePanel } from '../ui/NarrativePanel';
import { MaterialBalance } from '../ui/MaterialBalance';
import { Overlay } from '../ui/Overlay';
import { ActTitleCard } from '../ui/ActTitleCard';
import { Vignette } from '../ui/Vignette';
import { Intro } from '../ui/Intro';
import { DirectorContext } from '../ui/useDirector';
import { globalDirector } from '../animation/Director';
import { globalAudioEngine } from '../audio/engine';
import { globalSoundBank } from '../audio/soundBank';
import { SAMPLE_URLS } from './audioAssets';
import { hasWebGL2, initEnvironment } from './environment';
import { syncUrlWithState } from './deepLink';
import { LiveAnnouncer } from '../ui/LiveAnnouncer';
import { globalReplayStore, ReplayState } from '../store/replayStore';

// Study UI is its own chunk: cinematic viewers never download it (§12 code splitting)
const StudyLayout = lazy(() => import('../ui/study/StudyLayout').then((m) => ({ default: m.StudyLayout })));
// Shown rarely (or never) in a session: each is its own chunk, mounted only while its flag is set,
// to keep the entry JS within the §9 budget (≤ ~400 KB gzip)
const PhotoMode = lazy(() => import('../ui/PhotoMode').then((m) => ({ default: m.PhotoMode })));
const ChallengeOverlay = lazy(() => import('../ui/ChallengeOverlay').then((m) => ({ default: m.ChallengeOverlay })));
const Ending = lazy(() => import('../ui/Ending').then((m) => ({ default: m.Ending })));
const NoWebGL = lazy(() => import('../ui/NoWebGL').then((m) => ({ default: m.NoWebGL })));

const applyVolume = (s: ReplayState) => globalAudioEngine.setMasterVolume(s.muted ? 0 : s.volume);
const applyHaptics = (s: ReplayState) => globalSoundBank.setHapticsLevel(s.effectsLevel);

globalSoundBank.setSampleUrls(SAMPLE_URLS);

const WEBGL2 = hasWebGL2();

export const App: React.FC = () =>
  WEBGL2 ? (
    <Experience />
  ) : (
    <Suspense fallback={null}>
      <NoWebGL />
    </Suspense>
  );

const Experience: React.FC = () => {
  const showIntro = useStore(globalReplayStore, (s) => s.showIntro);
  const mode = useStore(globalReplayStore, (s) => s.mode);
  const isPhotoMode = useStore(globalReplayStore, (s) => s.isPhotoMode);
  const challengeActive = useStore(globalReplayStore, (s) => s.challengeActive);
  const showEnding = useStore(globalReplayStore, (s) => s.showEnding);

  useEffect(() => {
    const cleanup = initEnvironment();
    return cleanup;
  }, []);

  // Mute / volume (UI state) → audio engine; effects level → haptics (§12b D13)
  useEffect(() => {
    applyVolume(globalReplayStore.getState());
    applyHaptics(globalReplayStore.getState());
    return globalReplayStore.subscribe((s, prev) => {
      if (s.muted !== prev.muted || s.volume !== prev.volume) applyVolume(s);
      if (s.effectsLevel !== prev.effectsLevel) applyHaptics(s);
    });
  }, []);

  // Deep Link URL synchronization (§12b)
  useEffect(() => {
    return globalReplayStore.subscribe((s, prev) => {
      if (s.ply !== prev.ply || s.mode !== prev.mode) {
        syncUrlWithState(s.ply, s.mode);
      }
    });
  }, []);

  return (
    <DirectorContext.Provider value={globalDirector}>
      <div
        style={{
          position: 'relative',
          width: '100vw',
          height: '100vh',
          overflow: 'hidden',
          backgroundColor: '#0a0b0d',
        }}
      >
        {/* 3D Canvas Stage */}
        <Stage />
        <Vignette />

        {/* UI Overlay Layers */}
        <Intro />
        <Overlay />
        <ActTitleCard />
        {isPhotoMode && (
          <Suspense fallback={null}>
            <PhotoMode />
          </Suspense>
        )}
        {!showIntro && !isPhotoMode && (
          <>
            <NarrativePanel />
            <MaterialBalance />
            <CinematicControls />
            {challengeActive && (
              <Suspense fallback={null}>
                <ChallengeOverlay />
              </Suspense>
            )}
            {mode === 'study' && (
              <Suspense fallback={null}>
                <StudyLayout />
              </Suspense>
            )}
          </>
        )}
        {showEnding && (
          <Suspense fallback={null}>
            <Ending />
          </Suspense>
        )}
        <LiveAnnouncer />
      </div>
    </DirectorContext.Provider>
  );
};
