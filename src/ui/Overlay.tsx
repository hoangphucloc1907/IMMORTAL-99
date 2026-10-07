import React from 'react';
import { useReplayStore } from './useReplayStore';

export const Overlay: React.FC = () => {
  const overlay = useReplayStore((s) => s.overlay);

  if (!overlay) return null;

  const isSacrifice = overlay.includes('Rxd4');
  const isCheck = overlay === 'CHECK';

  return (
    <div
      style={{
        position: 'absolute',
        top: '28%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 50,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: '"Cormorant Garamond", Georgia, serif',
          fontSize: isSacrifice
            ? 'clamp(2rem, 6vw, 3.5rem)'
            : isCheck
              ? 'clamp(1.6rem, 5vw, 2.8rem)'
              : 'clamp(1.4rem, 4.5vw, 2.4rem)',
          fontWeight: 700,
          letterSpacing: isCheck ? '0.35em' : '0.15em',
          whiteSpace: 'nowrap',
          color: isSacrifice ? '#e8c574' : isCheck ? '#e05358' : '#f5f0e8',
          textShadow: '0 4px 24px rgba(0,0,0,0.85)',
          padding: '0.4rem 1.6rem',
          borderRadius: '4px',
          background: 'rgba(10, 11, 14, 0.45)',
          backdropFilter: 'blur(8px)',
          border: isSacrifice ? '1px solid rgba(232, 197, 116, 0.3)' : '1px solid rgba(255,255,255,0.08)',
          animation: 'fadeIn 0.3s ease-out',
        }}
      >
        {overlay}
      </div>
    </div>
  );
};
