import React from 'react';
import { useDirector } from './useDirector';
import { useReplayStore } from './useReplayStore';
import { ACTS } from '../experience/acts';
import evalData from '../experience/annotations.eval.json';

interface EvalRecord {
  ply: number;
  cp?: number;
  mate?: number;
}

const EVAL_RECORDS = evalData.plies as EvalRecord[];

export function generateEvalCurvePath(
  width: number,
  height: number,
): {
  areaPath: string;
  linePath: string;
  sacrificePos: { x: number; y: number };
} {
  const points: Array<{ x: number; y: number }> = [];
  const maxPly = 87;

  for (let i = 0; i <= maxPly; i++) {
    const rec = EVAL_RECORDS[i];
    let norm = 0.5;
    if (rec) {
      if (rec.mate !== undefined) {
        norm = rec.mate > 0 ? 0.95 : 0.05;
      } else {
        const cp = rec.cp ?? 0;
        norm = 0.5 + 0.5 * Math.tanh(cp / 500);
      }
    }
    const clamped = Math.max(0.08, Math.min(0.92, norm));
    const x = (i / maxPly) * width;
    const y = height * (1 - clamped);
    points.push({ x, y });
  }

  const sacrificePos = points[47] || { x: (47 / maxPly) * width, y: height * 0.2 };

  const first = points[0];
  let linePath = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    linePath += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
  }

  const last = points[points.length - 1];
  const areaPath =
    `M 0 ${height} L ${first.x.toFixed(1)} ${first.y.toFixed(1)}` +
    linePath.slice(linePath.indexOf(' L')) +
    ` L ${last.x.toFixed(1)} ${height} Z`;

  return { areaPath, linePath, sacrificePos };
}

export const Scrubber: React.FC = () => {
  const director = useDirector();
  const ply = useReplayStore((s) => s.ply);
  const compact = useReplayStore((s) => s.breakpoint === 'mobile');

  const { areaPath, linePath } = React.useMemo(() => generateEvalCurvePath(1000, 24), []);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetPly = parseInt(e.target.value, 10);
    director.seek(targetPly, { cameraBlend: 0, audioFade: 0.15 });
  };

  return (
    <div style={{ width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {/* Chapter badges */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '0 4px',
          fontSize: '0.7rem',
          color: '#8c929c',
          letterSpacing: '0.08em',
        }}
      >
        {ACTS.map((act) => {
          const current = ply >= act.plyRange[0] && ply <= act.plyRange[1];
          return (
            <button
              key={act.id}
              onClick={() => director.seek(act.plyRange[0])}
              aria-current={current ? 'step' : undefined}
              aria-label={`Act ${act.romanNumeral}: ${act.title}`}
              style={{
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: '2px 4px',
                font: 'inherit',
                letterSpacing: 'inherit',
                color: current ? '#dfcfb2' : '#6b7280',
                fontWeight: current ? 600 : 400,
              }}
            >
              {compact ? act.romanNumeral : `${act.romanNumeral} ${act.title}`}
            </button>
          );
        })}
      </div>

      {/* Track container */}
      <div style={{ position: 'relative', width: '100%', height: '24px', display: 'flex', alignItems: 'center' }}>
        {/* SVG Eval & Tension background curve */}
        <svg
          viewBox="0 0 1000 24"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
            opacity: 0.65,
          }}
        >
          <defs>
            <linearGradient id="scrubber-eval-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#dfcfb2" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#dfcfb2" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#scrubber-eval-area)" />
          <path d={linePath} fill="none" stroke="#dfcfb2" strokeWidth="1.2" strokeOpacity="0.5" />
        </svg>

        {/* King Hunt background highlight region (ply 49 to 70 = 56.3% to 80.4%) */}
        <div
          style={{
            position: 'absolute',
            left: `${(49 / 87) * 100}%`,
            width: `${((70 - 49) / 87) * 100}%`,
            height: '6px',
            backgroundColor: 'rgba(224, 83, 88, 0.35)',
            borderRadius: '2px',
            pointerEvents: 'none',
            zIndex: 2,
          }}
          title="King Hunt (25–35)"
        />

        {/* 24.Rxd4!! Sacrifice indicator marker */}
        <div
          style={{
            position: 'absolute',
            left: `${(47 / 87) * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#e8c574',
            boxShadow: '0 0 8px #e8c574',
            pointerEvents: 'none',
            zIndex: 2,
          }}
          title="24.Rxd4!!"
        />

        {/* HTML Range input */}
        <input
          type="range"
          min={0}
          max={87}
          value={ply}
          aria-label="Move timeline"
          aria-valuetext={`Ply ${ply} of 87`}
          onChange={handleSliderChange}
          style={{
            width: '100%',
            accentColor: '#dfcfb2',
            cursor: 'pointer',
            zIndex: 3,
            background: 'transparent',
          }}
        />
      </div>
    </div>
  );
};
