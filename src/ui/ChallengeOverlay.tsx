import React, { useState } from 'react';
import { useDirector } from './useDirector';
import { useReplayStore } from './useReplayStore';
import { getChallengeDetails, SACRIFICE_CHALLENGE_PLY } from '../game/challenge';

export const ChallengeOverlay: React.FC = () => {
  const director = useDirector();
  const challengeActive = useReplayStore((s) => s.challengeActive);
  const ply = useReplayStore((s) => s.ply);

  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'wrong' | 'success'>('idle');
  const [showHint, setShowHint] = useState(false);

  if (!challengeActive || ply !== SACRIFICE_CHALLENGE_PLY) {
    return null;
  }

  const details = getChallengeDetails(ply);
  if (!details) return null;
  const moveNumber = Math.floor(details.ply / 2) + 1; // the move White is about to play

  const handleSelect = (choice: { san: string; correct: boolean }) => {
    setSelectedGuess(choice.san);
    if (choice.correct) {
      setStatus('success');
      setTimeout(() => director.resumeAfterChallenge(), 1400);
    } else {
      setStatus('wrong');
    }
  };

  const handleReveal = () => {
    setStatus('success');
    setTimeout(() => director.resumeAfterChallenge(), 800);
  };

  // Every way out plays on into the real 24.Rxd4 with its full cinematic
  const handleSkip = () => director.resumeAfterChallenge();

  return (
    <div
      style={{
        position: 'absolute',
        top: '16%',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        background: 'rgba(18, 20, 24, 0.92)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(223, 207, 178, 0.35)',
        borderRadius: '8px',
        padding: '24px 32px',
        maxWidth: '480px',
        width: '90%',
        color: '#dfcfb2',
        boxShadow: '0 16px 40px rgba(0,0,0,0.7)',
        textAlign: 'center',
        fontFamily: "'IBM Plex Sans', sans-serif",
      }}
    >
      <div style={{ fontSize: '0.75rem', letterSpacing: '0.18em', color: '#8c929c', marginBottom: '6px' }}>
        CHALLENGE · FIND THE MOVE
      </div>
      <h2 style={{ margin: '0 0 12px 0', fontSize: '1.4rem', fontFamily: "'Cormorant Garamond', serif" }}>
        {details.prompt}
      </h2>

      {status === 'success' && (
        <div
          style={{
            background: 'rgba(232, 197, 116, 0.2)',
            border: '1px solid #e8c574',
            borderRadius: '4px',
            padding: '10px',
            marginBottom: '16px',
            fontWeight: 600,
            color: '#e8c574',
          }}
        >
          BRILLIANT!! The Immortal Sacrifice 24. Rxd4!!
        </div>
      )}

      {status === 'wrong' && (
        <div
          style={{
            background: 'rgba(224, 83, 88, 0.2)',
            border: '1px solid #e05358',
            borderRadius: '4px',
            padding: '8px',
            marginBottom: '16px',
            fontSize: '0.85rem',
            color: '#f87171',
          }}
        >
          Not quite. Kasparov chose something far more radical.
        </div>
      )}

      {/* Move buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        {details.choices.map((c) => (
          <button
            key={c.san}
            onClick={() => handleSelect(c)}
            disabled={status === 'success'}
            style={{
              padding: '10px 14px',
              borderRadius: '4px',
              border: selectedGuess === c.san ? '1px solid #dfcfb2' : '1px solid rgba(223, 207, 178, 0.2)',
              background: selectedGuess === c.san ? 'rgba(223, 207, 178, 0.15)' : 'rgba(255,255,255,0.03)',
              color: '#dfcfb2',
              font: 'inherit',
              cursor: status === 'success' ? 'default' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {moveNumber}. {c.san}
          </button>
        ))}
      </div>

      {showHint && (
        <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '14px', fontStyle: 'italic' }}>
          💡 {details.hint}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '0.8rem' }}>
        {!showHint && (
          <button
            onClick={() => setShowHint(true)}
            style={{
              background: 'none',
              border: 'none',
              color: '#8c929c',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Hint
          </button>
        )}
        <button
          onClick={handleReveal}
          style={{ background: 'none', border: 'none', color: '#e8c574', cursor: 'pointer' }}
        >
          Reveal Move
        </button>
        <button
          onClick={handleSkip}
          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer' }}
        >
          Skip
        </button>
      </div>
    </div>
  );
};
