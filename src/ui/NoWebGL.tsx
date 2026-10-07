import React from 'react';
import { PGN_METADATA } from '../game/pgn';
import { REPLAY_STEPS } from '../game/replay';

/** Shown instead of the 3D experience when the browser has no WebGL2 (§12 fallback). */
export const NoWebGL: React.FC = () => {
  const moves: string[] = [];
  for (let i = 0; i < REPLAY_STEPS.length; i += 2) {
    const black = REPLAY_STEPS[i + 1];
    moves.push(`${REPLAY_STEPS[i].moveNumber}. ${REPLAY_STEPS[i].san}${black ? ` ${black.san}` : ''}`);
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        overflowY: 'auto',
        padding: '48px 24px',
        display: 'flex',
        justifyContent: 'center',
        background: '#0a0b0d',
        color: '#e5e7eb',
      }}
    >
      <div style={{ maxWidth: '640px' }}>
        <h1
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: '2.4rem',
            letterSpacing: '0.06em',
            color: '#f5f0e8',
          }}
        >
          KASPAROV’S IMMORTAL
        </h1>
        <p style={{ color: '#9ca3af', margin: '8px 0 24px' }}>
          {PGN_METADATA.white} vs {PGN_METADATA.black} · {PGN_METADATA.site} · {PGN_METADATA.date}
        </p>
        <p style={{ lineHeight: 1.6, marginBottom: '24px' }}>
          This cinematic replay needs WebGL 2, which this browser or device does not provide. Here is the full game
          instead — try a current version of Chrome, Edge, Firefox or Safari for the 3D experience.
        </p>
        <p style={{ fontFamily: '"IBM Plex Mono", monospace', lineHeight: 1.9, color: '#d1d5db' }}>
          {moves.join('  ')} {PGN_METADATA.result}
        </p>
      </div>
    </main>
  );
};
