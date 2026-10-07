import { createStore } from 'zustand/vanilla';
import { ActId, Breakpoint } from '../experience/types';

export interface ReplayState {
  ply: number;
  playing: boolean;
  speed: number;
  mode: 'cinematic' | 'study';
  effectsLevel: 'full' | 'reduced';
  overlay: string | null;
  actTitleCard: string | null;
  activeAct: ActId;
  vignette: number; // CSS vignette opacity, changed at ply boundaries (event-rate)
  volume: number;
  muted: boolean;
  breakpoint: Breakpoint;
  reducedMotion: boolean;
  showIntro: boolean;
  showEnding: boolean;
  showStudyList: boolean;
  ghostLineId: string | null; // engine line being shown in Study mode
  isPhotoMode: boolean;
  challengeActive: boolean;
  challengeEnabled: boolean;

  // Actions
  setPly: (ply: number) => void;
  setPlaying: (playing: boolean) => void;
  setSpeed: (speed: number) => void;
  setMode: (mode: 'cinematic' | 'study') => void;
  setEffectsLevel: (level: 'full' | 'reduced') => void;
  setOverlay: (overlay: string | null) => void;
  setActTitleCard: (card: string | null) => void;
  setActiveAct: (act: ActId) => void;
  setVignette: (vignette: number) => void;
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;
  setBreakpoint: (bp: Breakpoint) => void;
  setReducedMotion: (rm: boolean) => void;
  setShowIntro: (show: boolean) => void;
  setShowEnding: (show: boolean) => void;
  setShowStudyList: (show: boolean) => void;
  setGhostLineId: (id: string | null) => void;
  setPhotoMode: (photo: boolean) => void;
  setChallengeActive: (active: boolean) => void;
  setChallengeEnabled: (enabled: boolean) => void;
}

export type ReplayStore = ReturnType<typeof createReplayStore>;

export function createReplayStore() {
  return createStore<ReplayState>((set) => ({
    ply: 0,
    playing: false,
    speed: 1.0,
    mode: 'cinematic',
    effectsLevel: 'full',
    overlay: null,
    actTitleCard: null,
    activeAct: 'ACT_I',
    vignette: 0.3,
    volume: 0.8,
    muted: false,
    breakpoint: 'desktop',
    reducedMotion: false,
    showIntro: true,
    showEnding: false,
    showStudyList: false,
    ghostLineId: null,
    isPhotoMode: false,
    challengeActive: false,
    challengeEnabled: false,

    setPly: (ply) => set({ ply }),
    setPlaying: (playing) => set({ playing }),
    setSpeed: (speed) => set({ speed }),
    setMode: (mode) => set({ mode }),
    setEffectsLevel: (effectsLevel) => set({ effectsLevel }),
    setOverlay: (overlay) => set({ overlay }),
    setActTitleCard: (actTitleCard) => set({ actTitleCard }),
    setActiveAct: (activeAct) => set({ activeAct }),
    setVignette: (vignette) => set({ vignette }),
    setVolume: (volume) => set({ volume }),
    setMuted: (muted) => set({ muted }),
    setBreakpoint: (breakpoint) => set({ breakpoint }),
    setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    setShowIntro: (showIntro) => set({ showIntro }),
    setShowEnding: (showEnding) => set({ showEnding }),
    setShowStudyList: (showStudyList) => set({ showStudyList }),
    setGhostLineId: (ghostLineId) => set({ ghostLineId }),
    setPhotoMode: (isPhotoMode) => set({ isPhotoMode }),
    setChallengeActive: (challengeActive) => set({ challengeActive }),
    setChallengeEnabled: (challengeEnabled) => set({ challengeEnabled }),
  }));
}

export const globalReplayStore = createReplayStore();
