import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Color, PieceId, PieceSymbol, Square } from '../game/types';
import { squareToCoords } from '../game/coordinates';
import { globalSceneRegistry } from '../animation/sceneRegistry';
import { createPieceMaterial, MaterialQuality } from './materials';

interface ChessPieceProps {
  id: PieceId;
  color: Color;
  type: PieceSymbol;
  startSquare: Square;
  geometry?: THREE.BufferGeometry; // baked GLB geometry; placeholder until it has loaded
  quality: MaterialQuality;
}

// Procedural placeholder geometries, shown until pieces.glb has loaded (or if it fails)
function createPieceGeometry(type: PieceSymbol): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  // Common base pedestal
  const baseGeom = new THREE.CylinderGeometry(0.32, 0.36, 0.12, 24);
  baseGeom.translate(0, 0.06, 0);
  geometries.push(baseGeom);

  const baseCollar = new THREE.CylinderGeometry(0.26, 0.32, 0.08, 24);
  baseCollar.translate(0, 0.16, 0);
  geometries.push(baseCollar);

  switch (type) {
    case 'p': {
      // Pawn (total height ~0.7)
      const body = new THREE.ConeGeometry(0.22, 0.4, 24);
      body.translate(0, 0.4, 0);
      geometries.push(body);

      const head = new THREE.SphereGeometry(0.16, 20, 20);
      head.translate(0, 0.65, 0);
      geometries.push(head);
      break;
    }
    case 'r': {
      // Rook (height ~0.85)
      const column = new THREE.CylinderGeometry(0.24, 0.28, 0.5, 24);
      column.translate(0, 0.45, 0);
      geometries.push(column);

      const battlement = new THREE.CylinderGeometry(0.3, 0.26, 0.22, 24);
      battlement.translate(0, 0.78, 0);
      geometries.push(battlement);
      break;
    }
    case 'n': {
      // Knight (height ~0.9)
      const neck = new THREE.CylinderGeometry(0.22, 0.26, 0.4, 20);
      neck.translate(0, 0.4, 0);
      geometries.push(neck);

      const head = new THREE.BoxGeometry(0.24, 0.38, 0.34);
      head.translate(0, 0.7, 0.04);
      geometries.push(head);
      break;
    }
    case 'b': {
      // Bishop (height ~1.0)
      const body = new THREE.CylinderGeometry(0.2, 0.26, 0.55, 24);
      body.translate(0, 0.48, 0);
      geometries.push(body);

      const mitre = new THREE.SphereGeometry(0.18, 20, 20);
      mitre.scale(1, 1.4, 1);
      mitre.translate(0, 0.88, 0);
      geometries.push(mitre);

      const finial = new THREE.SphereGeometry(0.06, 12, 12);
      finial.translate(0, 1.15, 0);
      geometries.push(finial);
      break;
    }
    case 'q': {
      // Queen (height ~1.15)
      const body = new THREE.CylinderGeometry(0.22, 0.28, 0.68, 24);
      body.translate(0, 0.54, 0);
      geometries.push(body);

      const coronet = new THREE.CylinderGeometry(0.3, 0.22, 0.26, 24);
      coronet.translate(0, 0.98, 0);
      geometries.push(coronet);

      const crownBall = new THREE.SphereGeometry(0.08, 16, 16);
      crownBall.translate(0, 1.18, 0);
      geometries.push(crownBall);
      break;
    }
    case 'k': {
      // King (height ~1.25)
      const body = new THREE.CylinderGeometry(0.24, 0.28, 0.75, 24);
      body.translate(0, 0.58, 0);
      geometries.push(body);

      const crown = new THREE.CylinderGeometry(0.32, 0.24, 0.28, 24);
      crown.translate(0, 1.05, 0);
      geometries.push(crown);

      // Imperial cross finial
      const crossVert = new THREE.BoxGeometry(0.06, 0.2, 0.06);
      crossVert.translate(0, 1.28, 0);
      geometries.push(crossVert);

      const crossHoriz = new THREE.BoxGeometry(0.14, 0.06, 0.06);
      crossHoriz.translate(0, 1.3, 0);
      geometries.push(crossHoriz);
      break;
    }
  }

  // The primitives are indexed geometries: merge with their index so triangles stay intact
  const merged = mergeGeometries(geometries);
  for (const g of geometries) g.dispose();
  if (!merged) {
    throw new Error(`Could not merge placeholder geometry for piece type "${type}"`);
  }
  return merged;
}

// One placeholder geometry per piece type, shared by every piece of that type
const GEOMETRY_CACHE = new Map<PieceSymbol, THREE.BufferGeometry>();

function getPieceGeometry(type: PieceSymbol): THREE.BufferGeometry {
  let geometry = GEOMETRY_CACHE.get(type);
  if (!geometry) {
    geometry = createPieceGeometry(type);
    GEOMETRY_CACHE.set(type, geometry);
  }
  return geometry;
}

// The baked set faces White's direction of play; Black's pieces turn around on the inner mesh,
// so the group's rotation stays free for the Director (it resets it to 0 at every ply).
const BLACK_FACING = Math.PI;

export const ChessPiece: React.FC<ChessPieceProps> = React.memo(
  ({ id, color, type, startSquare, geometry: baked, quality }) => {
    const groupRef = useRef<THREE.Group>(null);
    const initialCoord = squareToCoords(startSquare);

    useEffect(() => {
      if (groupRef.current) {
        globalSceneRegistry.registerPiece(id, groupRef.current);
      }
      return () => {
        globalSceneRegistry.unregisterPiece(id);
      };
    }, [id]);

    const geometry = baked ?? getPieceGeometry(type);

    // One material per piece: the capture dissolve fades a single piece's opacity
    const material = React.useMemo(() => createPieceMaterial(color, quality), [color, quality]);
    useEffect(() => () => material.dispose(), [material]);

    return (
      <group ref={groupRef} position={[initialCoord.x, 0, initialCoord.z]} name={id}>
        <mesh
          geometry={geometry}
          material={material}
          rotation-y={color === 'b' ? BLACK_FACING : 0}
          castShadow
          receiveShadow
        />
      </group>
    );
  },
);
