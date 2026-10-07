import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bloom, DepthOfField, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { DepthOfFieldEffect, ToneMappingMode } from 'postprocessing';
import { globalCameraRig } from '../animation/cameraRig';

const MAX_BOKEH = 3.2;

/**
 * Desktop-only post-processing (§2, §E4). Lazy-loaded by Stage; never mounted on mobile or with
 * reduced effects. The composer switches the renderer's tone mapping off, so ACES runs here.
 *
 * Depth of field focuses on the camera rig's look-at point: when a shot changes, the focus
 * travels with the rig's damping — a rack-focus from the checking piece to the king for free.
 * Its strength follows the shot's `dof` flag (eased by the rig), set imperatively per frame.
 */
const PostFX: React.FC = () => {
  const dof = useRef<DepthOfFieldEffect>(null);

  useFrame(() => {
    if (dof.current) dof.current.bokehScale = MAX_BOKEH * globalCameraRig.currentDof;
  });

  return (
    <EffectComposer multisampling={4}>
      <DepthOfField ref={dof} target={globalCameraRig.currentLookAt} worldFocusRange={2.6} bokehScale={0} />
      <Bloom mipmapBlur luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.35} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  );
};

export default PostFX;
