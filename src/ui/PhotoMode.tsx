import React, { useEffect, useState } from 'react';
import { useReplayStore } from './useReplayStore';
import { useDirector } from './useDirector';
import { useShareLink } from './share';

export const PhotoMode: React.FC = () => {
  const director = useDirector();
  const isPhotoMode = useReplayStore((s) => s.isPhotoMode);
  const setPhotoMode = useReplayStore((s) => s.setPhotoMode);
  const ply = useReplayStore((s) => s.ply);
  const mode = useReplayStore((s) => s.mode);
  const compact = useReplayStore((s) => s.breakpoint === 'mobile');
  const { copied, share } = useShareLink(ply, mode, compact);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!isPhotoMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        setPhotoMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPhotoMode, setPhotoMode]);

  if (!isPhotoMode) return null;

  const handleCapture = async () => {
    try {
      const dataUrl = await director.capturePhoto();
      if (!dataUrl) return;
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `immortal-99-ply${ply}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setToast('Photo saved to downloads!');
      setTimeout(() => setToast(null), 2500);
    } catch (err) {
      console.warn('Failed to capture WebGL canvas:', err);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        pointerEvents: 'auto',
      }}
    >
      {toast && (
        <div
          style={{
            background: 'rgba(232, 197, 116, 0.95)',
            color: '#0a0b0d',
            padding: '6px 14px',
            borderRadius: '4px',
            fontSize: '0.8rem',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          {toast}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: 'rgba(18, 20, 24, 0.9)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(223, 207, 178, 0.3)',
          borderRadius: '24px',
          padding: '8px 18px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.8)',
          color: '#dfcfb2',
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: '0.85rem',
        }}
      >
        <span style={{ fontSize: '0.75rem', letterSpacing: '0.12em', color: '#8c929c', marginRight: '4px' }}>
          PHOTO MODE
        </span>

        <button
          onClick={() => void handleCapture()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#dfcfb2',
            color: '#0a0b0d',
            border: 'none',
            borderRadius: '16px',
            padding: '6px 14px',
            fontWeight: 600,
            cursor: 'pointer',
            font: 'inherit',
          }}
        >
          <span>📸</span> Capture PNG
        </button>

        <button
          onClick={share}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#dfcfb2',
            border: 'none',
            borderRadius: '16px',
            padding: '6px 12px',
            cursor: 'pointer',
            font: 'inherit',
          }}
        >
          {copied ? 'Link copied' : 'Share link'}
        </button>

        <button
          onClick={() => setPhotoMode(false)}
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#8c929c',
            border: 'none',
            borderRadius: '16px',
            padding: '6px 12px',
            cursor: 'pointer',
            font: 'inherit',
          }}
        >
          Exit (Esc)
        </button>
      </div>
    </div>
  );
};
