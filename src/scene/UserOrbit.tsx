import React from 'react';
import { OrbitControls } from '@react-three/drei';

// Own chunk: only Study and Photo mode hand the camera to the viewer, so cinematic-only
// sessions never download OrbitControls (three-stdlib).
const UserOrbit: React.FC = () => (
  <OrbitControls
    enableDamping
    dampingFactor={0.08}
    minDistance={4}
    maxDistance={22}
    maxPolarAngle={Math.PI / 2 - 0.05} // don't go below table
  />
);

export default UserOrbit;
