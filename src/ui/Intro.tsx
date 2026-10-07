import React from 'react';
import { useDirector } from './useDirector';
import { useReplayStore } from './useReplayStore';
import { globalReplayStore } from '../store/replayStore';
import { PGN_METADATA } from '../game/pgn';

// Dev-only review shortcut: ?ply=46 starts playback right before 24.Rxd4 (M4 gate review)
function reviewStartPly(): number {
  if (!import.meta.env.DEV) return 0;
  const ply = Number(new URLSearchParams(window.location.search).get('ply'));
  return Number.isInteger(ply) && ply >= 0 && ply <= 87 ? ply : 0;
}

export const Intro: React.FC = () => {
  const director = useDirector();
  const showIntro = useReplayStore((s) => s.showIntro);
  const challengeEnabled = useReplayStore((s) => s.challengeEnabled);

  if (!showIntro) return null;

  const handleStart = () => {
    globalReplayStore.getState().setShowIntro(false);
    director.seek(reviewStartPly());
    director.play();
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(8, 10, 13, 0.85)',
        backdropFilter: 'blur(20px)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '24px',
        animation: 'fadeIn 0.5s ease',
      }}
    >
      <div style={{ maxWidth: '680px' }}>
        <p
          style={{
            letterSpacing: '0.35em',
            fontSize: '0.85rem',
            color: '#c4a77d',
            textTransform: 'uppercase',
            marginBottom: '16px',
          }}
        >
          Interactive Cinematic 3D Replay
        </p>

        <h1
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: 'clamp(2.8rem, 6vw, 4.6rem)',
            fontWeight: 700,
            letterSpacing: '0.08em',
            color: '#f5f0e8',
            marginBottom: '12px',
            lineHeight: 1.1,
          }}
        >
          KASPAROV’S IMMORTAL
        </h1>

        <p style={{ fontSize: '1.15rem', color: '#d0d4dc', marginBottom: '8px' }}>
          {PGN_METADATA.white} vs {PGN_METADATA.black}
        </p>

        <p style={{ fontSize: '0.9rem', color: '#88909d', letterSpacing: '0.05em', marginBottom: '36px' }}>
          {PGN_METADATA.event} · {PGN_METADATA.site} · {PGN_METADATA.date}
        </p>

        <button
          onClick={handleStart}
          style={{
            backgroundColor: '#dfcfb2',
            color: '#121418',
            border: 'none',
            borderRadius: '8px',
            padding: '14px 36px',
            fontSize: '1rem',
            fontWeight: 600,
            letterSpacing: '0.15em',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(223, 207, 178, 0.25)',
            transition: 'transform 0.15s ease, background-color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#eae0cd')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#dfcfb2')}
        >
          PLAY THE IMMORTAL GAME
        </button>

        {/* §12b D11: opt-in, off by default — the cinematic stays uninterrupted unless asked for */}
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '22px',
            fontSize: '0.85rem',
            color: '#88909d',
            letterSpacing: '0.04em',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={challengeEnabled}
            onChange={(e) => globalReplayStore.getState().setChallengeEnabled(e.target.checked)}
            style={{ accentColor: '#dfcfb2', width: '15px', height: '15px', cursor: 'pointer' }}
          />
          Pause before the sacrifice and let me find the move
        </label>
      </div>
    </div>
  );
};
