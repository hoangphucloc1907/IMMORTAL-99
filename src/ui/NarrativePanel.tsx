import React from 'react';
import { useReplayStore } from './useReplayStore';
import { ANNOTATIONS } from '../experience/annotations';
import { REPLAY_STEPS } from '../game/replay';

export const NarrativePanel: React.FC = () => {
  const ply = useReplayStore((s) => s.ply);
  const mode = useReplayStore((s) => s.mode);
  const compact = useReplayStore((s) => s.breakpoint === 'mobile');

  // Cinematic captions only (§10): in Study the panel shows the move, caption and explanation in full
  if (ply === 0 || mode === 'study') return null;

  const step = REPLAY_STEPS[ply - 1];
  const annotation = ANNOTATIONS[ply];

  // Only moves that have a caption get one
  if (!annotation) return null;

  return (
    <div
      style={{
        position: 'absolute',
        // Mobile: a slim band across the top, caption only — the board stays the focus (§11)
        top: compact ? '12px' : '28px',
        left: compact ? '12px' : '28px',
        right: compact ? '12px' : undefined,
        maxWidth: compact ? undefined : '380px',
        backgroundColor: 'rgba(12, 14, 18, 0.8)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '10px',
        padding: compact ? '10px 14px' : '16px 20px',
        zIndex: 40,
        boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
        animation: 'fadeIn 0.25s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontSize: '1.4rem',
            fontWeight: 700,
            color: '#dfcfb2',
          }}
        >
          {step.moveNumber}. {step.san} {annotation?.glyph || ''}
        </span>
        {annotation?.eval !== undefined && (
          <span style={{ fontSize: '0.75rem', color: '#88909d', fontFamily: '"IBM Plex Mono", monospace' }}>
            Eval: +{annotation.eval.toFixed(1)}
          </span>
        )}
      </div>

      {annotation?.caption && (
        <div style={{ fontSize: '0.95rem', color: '#f3f4f6', lineHeight: 1.4, marginBottom: '6px' }}>
          {annotation.caption}
        </div>
      )}

      {!compact && annotation?.explanation && (
        <div style={{ fontSize: '0.8rem', color: '#9ca3af', lineHeight: 1.35 }}>{annotation.explanation}</div>
      )}
    </div>
  );
};
