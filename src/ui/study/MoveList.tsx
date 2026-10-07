import React from 'react';
import { useDirector } from '../useDirector';
import { useReplayStore } from '../useReplayStore';
import { REPLAY_STEPS } from '../../game/replay';

export const MoveList: React.FC = () => {
  const director = useDirector();
  const currentPly = useReplayStore((s) => s.ply);

  // Group steps by full moves
  const movePairs: Array<{
    moveNumber: number;
    white?: { ply: number; san: string };
    black?: { ply: number; san: string };
  }> = [];

  for (let i = 0; i < REPLAY_STEPS.length; i += 2) {
    const whiteStep = REPLAY_STEPS[i];
    const blackStep = REPLAY_STEPS[i + 1];
    movePairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: { ply: whiteStep.ply, san: whiteStep.san },
      black: blackStep ? { ply: blackStep.ply, san: blackStep.san } : undefined,
    });
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        overflowY: 'auto',
        maxHeight: '380px',
        paddingRight: '6px',
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: '0.85rem',
      }}
    >
      {movePairs.map((pair) => (
        <div
          key={pair.moveNumber}
          style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 1fr',
            padding: '3px 6px',
            borderRadius: '4px',
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <span style={{ color: '#6b7280' }}>{pair.moveNumber}.</span>

          <span
            onClick={() => pair.white && director.seek(pair.white.ply)}
            style={{
              cursor: 'pointer',
              color: currentPly === pair.white?.ply ? '#dfcfb2' : '#d1d5db',
              fontWeight: currentPly === pair.white?.ply ? 600 : 400,
              backgroundColor: currentPly === pair.white?.ply ? 'rgba(223, 207, 178, 0.15)' : 'transparent',
              padding: '1px 4px',
              borderRadius: '2px',
            }}
          >
            {pair.white?.san}
          </span>

          {pair.black ? (
            <span
              onClick={() => pair.black && director.seek(pair.black.ply)}
              style={{
                cursor: 'pointer',
                color: currentPly === pair.black.ply ? '#dfcfb2' : '#d1d5db',
                fontWeight: currentPly === pair.black.ply ? 600 : 400,
                backgroundColor: currentPly === pair.black.ply ? 'rgba(223, 207, 178, 0.15)' : 'transparent',
                padding: '1px 4px',
                borderRadius: '2px',
              }}
            >
              {pair.black.san}
            </span>
          ) : (
            <span />
          )}
        </div>
      ))}
    </div>
  );
};
