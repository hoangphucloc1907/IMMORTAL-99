import React from 'react';
import { useReplayStore } from './useReplayStore';

export const ActTitleCard: React.FC = () => {
  const actTitleCard = useReplayStore((s) => s.actTitleCard);

  if (!actTitleCard) return null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '42%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 60,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontSize: 'clamp(1.4rem, 5vw, 2.8rem)',
          fontWeight: 600,
          letterSpacing: 'clamp(0.1em, 1vw, 0.25em)',
          whiteSpace: 'nowrap',
          color: '#f0e6d2',
          textTransform: 'uppercase',
          textShadow: '0 4px 30px rgba(0,0,0,0.9)',
          padding: '0.6rem clamp(1rem, 4vw, 2.4rem)',
          borderTop: '1px solid rgba(240, 230, 210, 0.25)',
          borderBottom: '1px solid rgba(240, 230, 210, 0.25)',
          background: 'rgba(5, 6, 8, 0.6)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {actTitleCard}
      </div>
    </div>
  );
};
