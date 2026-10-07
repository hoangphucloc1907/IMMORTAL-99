import React from 'react';
import { useReplayStore } from '../useReplayStore';
import { useDirector } from '../useDirector';
import { MoveList } from './MoveList';
import { REPLAY_STEPS } from '../../game/replay';
import { ANNOTATIONS } from '../../experience/annotations';
import { describeMove } from '../../experience/moveText';
import { ENGINE_SOURCE, engineEval, engineLinesAt, formatEval } from '../../experience/engineAnalysis';

// Unreviewed engine lines are listed only in development, so the project owner can review them
const SHOW_UNREVIEWED = import.meta.env.DEV;

const label: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#9ca3af',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

export const StudyLayout: React.FC = () => {
  const director = useDirector();
  const mode = useReplayStore((s) => s.mode);
  const ply = useReplayStore((s) => s.ply);
  const ghostLineId = useReplayStore((s) => s.ghostLineId);
  const breakpoint = useReplayStore((s) => s.breakpoint);

  if (mode !== 'study') return null;

  const currentStep = ply > 0 ? REPLAY_STEPS[ply - 1] : null;
  const annotation = ply > 0 ? ANNOTATIONS[ply] : null;
  const evaluation = engineEval(ply);
  const lines = engineLinesAt(ply, SHOW_UNREVIEWED);

  return (
    <div
      style={{
        position: 'absolute',
        // Desktop: side panel · tablet: narrower drawer · mobile: top sheet, 40% of the height (§11)
        top: breakpoint === 'mobile' ? '12px' : '24px',
        right: breakpoint === 'mobile' ? '12px' : '24px',
        left: breakpoint === 'mobile' ? '12px' : undefined,
        width: breakpoint === 'mobile' ? undefined : breakpoint === 'tablet' ? '300px' : '340px',
        maxHeight: breakpoint === 'mobile' ? '40vh' : 'calc(100vh - 220px)',
        overflowY: 'auto',
        backgroundColor: 'rgba(12, 14, 18, 0.9)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        zIndex: 50,
        boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: '#f3f4f6', letterSpacing: '0.05em' }}>GAME STUDY</h3>
        <span style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: '"IBM Plex Mono", monospace' }}>
          Ply {ply}/87
        </span>
      </div>

      {currentStep && (
        <div style={{ padding: '8px 12px', backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 600, color: '#dfcfb2' }}>
              {currentStep.moveNumber}. {currentStep.color === 'b' ? '… ' : ''}
              {currentStep.san} {annotation?.glyph || ''}
            </span>
            {evaluation && (
              <span
                title={`${ENGINE_SOURCE}, depth ${evaluation.depth}`}
                style={{ fontSize: '0.75rem', color: '#9ca3af', fontFamily: '"IBM Plex Mono", monospace' }}
              >
                {formatEval(evaluation)}
              </span>
            )}
          </div>
          {annotation?.caption && (
            <div style={{ fontSize: '0.85rem', color: '#e5e7eb', marginTop: '6px' }}>{annotation.caption}</div>
          )}
          <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '4px', lineHeight: 1.4 }}>
            {annotation?.explanation ?? describeMove(currentStep)}
          </div>
        </div>
      )}

      {lines.length > 0 && (
        <div>
          <div style={label}>Engine lines — instead of {currentStep?.san}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {lines.map((line) => (
              <button
                key={line.id}
                onClick={() => director.playEngineLine(line.id)}
                aria-pressed={ghostLineId === line.id}
                style={{
                  textAlign: 'left',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#e5e7eb',
                  background: ghostLineId === line.id ? 'rgba(143, 179, 217, 0.18)' : 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: '0.78rem',
                }}
              >
                <span style={{ color: '#8fb3d9' }}>{formatEval(line)}</span> {line.moves.slice(0, 5).join(' ')}
                {line.moves.length > 5 ? ' …' : ''}
                {!line.approved && <span style={{ color: '#e8c574' }}> · unreviewed</span>}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '6px' }}>
            {ENGINE_SOURCE}. Shown with translucent pieces; the game resumes where it was.
          </div>
        </div>
      )}

      <div>
        <div style={label}>Move notation</div>
        <MoveList />
      </div>
    </div>
  );
};
