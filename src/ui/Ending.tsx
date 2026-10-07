import React from 'react';
import { useDirector } from './useDirector';
import { useReplayStore } from './useReplayStore';
import { globalReplayStore } from '../store/replayStore';
import { PGN_METADATA } from '../game/pgn';

export const Ending: React.FC = () => {
  const director = useDirector();
  const showEnding = useReplayStore((s) => s.showEnding);

  if (!showEnding) return null;

  const handleWatchAgain = () => {
    globalReplayStore.getState().setShowEnding(false);
    director.seek(0);
    director.play();
  };

  const handleStudy = () => {
    globalReplayStore.getState().setShowEnding(false);
    director.setMode('study');
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'rgba(8, 10, 13, 0.88)',
        backdropFilter: 'blur(20px)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '24px',
        animation: 'fadeIn 0.6s ease',
      }}
    >
      <div style={{ maxWidth: '640px' }}>
        <p
          style={{
            letterSpacing: '0.25em',
            fontSize: '0.85rem',
            color: '#c4a77d',
            textTransform: 'uppercase',
            marginBottom: '14px',
          }}
        >
          White Wins — 1-0
        </p>

        <h2
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
            fontWeight: 700,
            color: '#f5f0e8',
            marginBottom: '10px',
            lineHeight: 1.15,
          }}
        >
          THE IMMORTAL GAME
        </h2>

        <p style={{ fontSize: '1.1rem', color: '#d0d4dc', marginBottom: '6px' }}>
          {PGN_METADATA.white} · {PGN_METADATA.black}
        </p>

        <p style={{ fontSize: '0.85rem', color: '#88909d', letterSpacing: '0.05em', marginBottom: '32px' }}>
          {PGN_METADATA.site} · {PGN_METADATA.date}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '36px' }}>
          <button
            onClick={handleWatchAgain}
            style={{
              backgroundColor: '#dfcfb2',
              color: '#121418',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 28px',
              fontSize: '0.95rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Watch Again
          </button>

          <button
            onClick={handleStudy}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#f5f0e8',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              padding: '12px 28px',
              fontSize: '0.95rem',
              cursor: 'pointer',
            }}
          >
            Study the Game
          </button>
        </div>

        <p style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.5 }}>
          IMMORTAL-99 — Kasparov vs Topalov, 1999 · Powered by WebGL2 & Web Audio.
        </p>
        <div style={{ fontSize: '0.7rem', color: '#5b6270', lineHeight: 1.6, marginTop: '10px' }}>
          <p style={{ letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '4px', color: '#6b7280' }}>
            Credits
          </p>
          <p>
            Chess pieces — “A Beautiful Game”, Khronos glTF Sample Assets: © 2020 ASWF, glTF conversion © 2022 Ed
            Mackey, CC BY 4.0; modified (re-scaled, simplified, own materials).
          </p>
          <p>Board stone — Marble 002 and Marble 024 from ambientCG (ambientcg.com), CC0.</p>
          <p>Sound — “Impact Sounds” by Kenney (kenney.nl), CC0.</p>
          <p>Game data — Kasparov vs Topalov, Wijk aan Zee 1999; move validation by chess.js (BSD-2-Clause).</p>
        </div>
      </div>
    </div>
  );
};
