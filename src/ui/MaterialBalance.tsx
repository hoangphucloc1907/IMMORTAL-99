import React from 'react';
import { useReplayStore } from './useReplayStore';
import { CAPTURED_AT_PLY } from '../game/replay';

const VALUES: Record<string, number> = { P: 1, N: 3, B: 3, R: 5, Q: 9 };
const RANGE = 12; // points shown at full width on either side
const lost = (ids: string[]) => ids.reduce((sum, id) => sum + (VALUES[id.split('-')[1]] ?? 0), 0);

/**
 * A thin material bar (§A3): after 24.Rxd4 it leans to Black — and White still wins. No point
 * counts, no score board; the exact balance is only given to screen readers.
 */
export const MaterialBalance: React.FC = () => {
  const ply = useReplayStore((s) => s.ply);
  const mode = useReplayStore((s) => s.mode);
  const breakpoint = useReplayStore((s) => s.breakpoint);
  // The Study panel occupies this corner; on mobile the board keeps the whole screen (§11)
  if (mode === 'study' || breakpoint === 'mobile') return null;
  const captured = CAPTURED_AT_PLY[ply] ?? { w: [], b: [] };
  const balance = lost(captured.b) - lost(captured.w); // + = White ahead
  const share = Math.min(1, Math.abs(balance) / RANGE) * 50; // % of the bar from the centre

  const description =
    balance === 0
      ? 'Material is level'
      : `${balance > 0 ? 'White' : 'Black'} is ahead by ${Math.abs(balance)} points of material`;

  return (
    <div
      role="img"
      aria-label={description}
      title="Material"
      style={{ position: 'absolute', top: '32px', right: '32px', width: '180px', zIndex: 40 }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.62rem',
          letterSpacing: '0.18em',
          color: '#6b7280',
          marginBottom: '6px',
        }}
      >
        <span>WHITE</span>
        <span>BLACK</span>
      </div>
      <div style={{ position: 'relative', height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: balance > 0 ? `${50 - share}%` : '50%',
            width: `${share}%`,
            background: balance > 0 ? '#e8e2d4' : '#5b6474',
            borderRadius: '2px',
            transition: 'left 0.6s ease, width 0.6s ease',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '-3px',
            width: '1px',
            height: '9px',
            background: 'rgba(255,255,255,0.35)',
          }}
        />
      </div>
    </div>
  );
};
