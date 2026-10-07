import React, { useEffect, useState } from 'react';
import { useDirector } from './useDirector';
import { useReplayStore } from './useReplayStore';
import { globalReplayStore } from '../store/replayStore';
import { Scrubber } from './Scrubber';
import { useAutoHide } from './useAutoHide';
import { useShareLink } from './share';

const SPEEDS = [0.5, 1, 1.5, 2];
const canFullscreen = typeof document !== 'undefined' && !!document.fullscreenEnabled;

function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen();
}

export const CinematicControls: React.FC = () => {
  const director = useDirector();
  const ply = useReplayStore((s) => s.ply);
  const playing = useReplayStore((s) => s.playing);
  const speed = useReplayStore((s) => s.speed);
  const mode = useReplayStore((s) => s.mode);
  const muted = useReplayStore((s) => s.muted);
  const effectsLevel = useReplayStore((s) => s.effectsLevel);
  const breakpoint = useReplayStore((s) => s.breakpoint);
  const reducedMotion = useReplayStore((s) => s.reducedMotion);
  const [fullscreen, setFullscreen] = useState(false);
  const compact = breakpoint === 'mobile';
  const { hidden, toolbarProps } = useAutoHide(playing && mode === 'cinematic');
  const { copied, share } = useShareLink(ply, mode);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleEffects = () =>
    globalReplayStore.getState().setEffectsLevel(effectsLevel === 'full' ? 'reduced' : 'full');
  const cycleSpeed = () => director.setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]);

  // Keyboard shortcuts (§10): Space, ←/→, R, 1–4, M, F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (playing) director.pause();
          else director.play();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          director.prev();
          break;
        case 'ArrowRight':
          e.preventDefault();
          director.next();
          break;
        case 'KeyR':
          e.preventDefault();
          director.replayCurrent();
          break;
        case 'Digit1':
        case 'Digit2':
        case 'Digit3':
        case 'Digit4':
          director.setSpeed(SPEEDS[Number(e.code.slice(-1)) - 1]);
          break;
        case 'KeyM':
          globalReplayStore.getState().setMuted(!muted);
          break;
        case 'KeyF':
          if (canFullscreen) toggleFullscreen();
          break;
        case 'KeyP':
          globalReplayStore.getState().setPhotoMode(true);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playing, muted, director]);

  const transport = (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '6px' : '8px' }}>
      <button
        onClick={() => director.prev()}
        style={btnStyle}
        aria-label="Previous move (Left Arrow)"
        title="Previous (←)"
      >
        ⏮
      </button>
      <button
        onClick={() => (playing ? director.pause() : director.play())}
        style={{ ...btnStyle, backgroundColor: '#dfcfb2', color: '#101216', fontWeight: 600, padding: '6px 16px' }}
        aria-label={playing ? 'Pause (Space)' : 'Play (Space)'}
      >
        {playing ? '⏸ PAUSE' : '▶ PLAY'}
      </button>
      <button onClick={() => director.next()} style={btnStyle} aria-label="Next move (Right Arrow)" title="Next (→)">
        ⏭
      </button>
      <button
        onClick={() => director.replayCurrent()}
        style={btnStyle}
        aria-label="Replay current move (R)"
        title="Replay (R)"
      >
        ↺
      </button>
      <span
        style={{ fontSize: '0.85rem', color: '#a0a5b0', marginLeft: '6px', fontFamily: '"IBM Plex Mono", monospace' }}
      >
        {ply} / 87
      </span>
    </div>
  );

  const speedControl = compact ? (
    <button onClick={cycleSpeed} style={btnStyle} aria-label={`Playback speed ${speed}x — change`}>
      {speed}x
    </button>
  ) : (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} role="group" aria-label="Playback speed">
      {SPEEDS.map((s) => (
        <button
          key={s}
          onClick={() => director.setSpeed(s)}
          aria-pressed={speed === s}
          style={{
            ...btnStyle,
            padding: '4px 8px',
            fontSize: '0.75rem',
            backgroundColor: speed === s ? 'rgba(223, 207, 178, 0.2)' : 'transparent',
            color: speed === s ? '#dfcfb2' : '#8c929c',
            border: speed === s ? '1px solid #dfcfb2' : '1px solid transparent',
          }}
        >
          {s}x
        </button>
      ))}
    </div>
  );

  const settings = (
    <div style={{ display: 'flex', alignItems: 'center', gap: compact ? '6px' : '8px' }}>
      {compact && speedControl}
      <button
        onClick={() => globalReplayStore.getState().setMuted(!muted)}
        style={btnStyle}
        aria-label={muted ? 'Unmute (M)' : 'Mute (M)'}
        aria-pressed={muted}
      >
        {muted ? '🔇' : '🔊'}
      </button>
      <button
        onClick={toggleEffects}
        style={{ ...btnStyle, fontSize: '0.72rem', letterSpacing: '0.05em' }}
        aria-label={effectsLevel === 'full' ? 'Reduce visual effects' : 'Restore full visual effects'}
        aria-pressed={effectsLevel === 'reduced'}
        title="Visual effects"
      >
        FX {effectsLevel === 'full' ? 'FULL' : 'LOW'}
      </button>
      {canFullscreen && (
        <button
          onClick={toggleFullscreen}
          style={btnStyle}
          aria-label={fullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'}
        >
          {fullscreen ? '⤡' : '⤢'}
        </button>
      )}
      {/* No room in the compact bar: on mobile the share action lives in photo mode */}
      {!compact && (
        <button
          onClick={share}
          style={btnStyle}
          aria-label={copied ? 'Link copied' : 'Copy link to this move'}
          title={copied ? 'Link copied' : 'Copy link to this move'}
        >
          {copied ? '✓' : '🔗'}
        </button>
      )}
      <button
        onClick={() => globalReplayStore.getState().setPhotoMode(true)}
        style={{ ...btnStyle, fontSize: '0.85rem' }}
        aria-label="Photo mode (P)"
        title="Photo mode (P)"
      >
        📷
      </button>
      <button
        onClick={() => director.setMode(mode === 'cinematic' ? 'study' : 'cinematic')}
        aria-pressed={mode === 'study'}
        style={{
          ...btnStyle,
          backgroundColor: mode === 'study' ? 'rgba(223, 207, 178, 0.2)' : 'rgba(255,255,255,0.06)',
          color: mode === 'study' ? '#dfcfb2' : '#d0d4dc',
          padding: '6px 12px',
          fontSize: '0.8rem',
          letterSpacing: '0.05em',
        }}
      >
        {mode === 'cinematic' ? 'CINEMATIC' : 'STUDY'}
      </button>
    </div>
  );

  return (
    <div
      {...toolbarProps}
      role="toolbar"
      aria-label="Replay controls"
      data-hidden={hidden || undefined}
      style={{
        opacity: hidden ? 0 : 1,
        transition: reducedMotion ? 'none' : 'opacity 0.4s ease',
        position: 'absolute',
        bottom: compact ? '12px' : '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: compact ? 'calc(100% - 24px)' : 'calc(100% - 48px)',
        maxWidth: '920px',
        backgroundColor: 'rgba(12, 14, 18, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '12px',
        padding: compact ? '10px 12px' : '14px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '8px' : '12px',
        zIndex: 40,
        boxShadow: '0 16px 36px rgba(0,0,0,0.6)',
      }}
    >
      <Scrubber />
      {compact ? (
        <>
          {transport}
          {settings}
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          {transport}
          {speedControl}
          {settings}
        </div>
      )}
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  background: 'rgba(255, 255, 255, 0.06)',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  color: '#e2e6ee',
  borderRadius: '6px',
  padding: '6px 12px',
  cursor: 'pointer',
  fontSize: '0.9rem',
  transition: 'all 0.15s ease',
};
