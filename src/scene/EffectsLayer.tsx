import React from 'react';
import { globalSceneRegistry } from '../animation/sceneRegistry';

export const EffectsLayer: React.FC = () => {
  return (
    <group name="EffectsLayer">
      <primitive object={globalSceneRegistry.boardMarks.group} />
      <primitive object={globalSceneRegistry.impact.group} />
      <primitive object={globalSceneRegistry.checkPulse.group} />
      <primitive object={globalSceneRegistry.attackLine.group} />
      <primitive object={globalSceneRegistry.forceLines.group} />
      <primitive object={globalSceneRegistry.ghostBoard.group} />
      <primitive object={globalSceneRegistry.kingTrail.group} />
      <primitive object={globalSceneRegistry.pressureGrid.group} />
      <primitive object={globalSceneRegistry.particles.group} />
    </group>
  );
};
