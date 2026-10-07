import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { globalCameraRig } from '../animation/cameraRig';
import { globalDirector } from '../animation/Director';
import { globalSceneRegistry } from '../animation/sceneRegistry';

// Dev-only camera tuner (§E7), opened with ?debugCamera=1. Pause first, nudge the rig's target
// shot, then "Copy JSON" and paste the values into experience/shots.ts. Plain DOM — no extra
// dependency just for development.

type Vec = [number, number, number];
interface Fields {
  position: Vec;
  target: Vec;
  fov: number;
  roll: number;
}

const read = (): Fields => ({
  position: globalCameraRig.targetPosition.toArray().map((v) => +v.toFixed(2)) as Vec,
  target: globalCameraRig.targetLookAt.toArray().map((v) => +v.toFixed(2)) as Vec,
  fov: +globalCameraRig.targetFov.toFixed(1),
  roll: +THREE.MathUtils.radToDeg(globalCameraRig.targetRoll).toFixed(1),
});

const DebugCamera: React.FC = () => {
  const [fields, setFields] = useState<Fields>(read);
  const [ply, setPly] = useState(globalDirector.getPly());

  // Follow the Director while you scrub to the moment you want to tune
  useEffect(() => {
    const id = setInterval(() => {
      if (globalDirector.getPly() !== ply) {
        setPly(globalDirector.getPly());
        setFields(read());
      }
    }, 250);
    return () => clearInterval(id);
  }, [ply]);

  const apply = (next: Fields) => {
    setFields(next);
    globalCameraRig.targetPosition.set(...next.position);
    globalCameraRig.targetLookAt.set(...next.target);
    globalCameraRig.targetFov = next.fov;
    globalCameraRig.targetRoll = THREE.MathUtils.degToRad(next.roll);
    globalSceneRegistry.requestFrame();
  };

  const vecInputs = (key: 'position' | 'target') =>
    fields[key].map((value, i) => (
      <input
        key={i}
        type="number"
        step={0.1}
        value={value}
        style={{ width: 56 }}
        onChange={(e) => {
          const v = [...fields[key]] as Vec;
          v[i] = Number(e.target.value);
          apply({ ...fields, [key]: v });
        }}
      />
    ));

  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        background: 'rgba(0,0,0,0.85)',
        color: '#ddd',
        font: '12px monospace',
        padding: 10,
        borderRadius: 6,
        display: 'grid',
        gap: 6,
      }}
    >
      <div>debug camera · ply {ply} (pause before editing)</div>
      <div>position {vecInputs('position')}</div>
      <div>target&nbsp;&nbsp; {vecInputs('target')}</div>
      <div>
        fov{' '}
        <input
          type="number"
          value={fields.fov}
          style={{ width: 56 }}
          onChange={(e) => apply({ ...fields, fov: Number(e.target.value) })}
        />{' '}
        roll°{' '}
        <input
          type="number"
          value={fields.roll}
          style={{ width: 56 }}
          onChange={(e) => apply({ ...fields, roll: Number(e.target.value) })}
        />
      </div>
      <button onClick={() => void navigator.clipboard.writeText(JSON.stringify(fields, null, 2))}>Copy JSON</button>
    </div>
  );
};

const host = document.createElement('div');
document.body.appendChild(host);
createRoot(host).render(<DebugCamera />);
