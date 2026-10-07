import React from 'react';
import { useReplayStore } from './useReplayStore';
import { REPLAY_STEPS } from '../game/replay';
import { ANNOTATIONS } from '../experience/annotations';

/**
 * Screen-reader narration (§10 Accessibility): every move's SAN — plus its caption, when the
 * moment has one — is announced politely as the game advances or is scrubbed.
 */
export const LiveAnnouncer: React.FC = () => {
  const ply = useReplayStore((s) => s.ply);
  const step = ply > 0 ? REPLAY_STEPS[ply - 1] : null;
  const caption = ANNOTATIONS[ply]?.caption;
  const text = step
    ? `${step.moveNumber}. ${step.color === 'b' ? '… ' : ''}${step.san}${caption ? `. ${caption}` : ''}`
    : 'Starting position.';

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        overflow: 'hidden',
        clip: 'rect(0 0 0 0)',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
};
