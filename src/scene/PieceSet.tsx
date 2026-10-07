import React, { useEffect, useState } from 'react';
import { INITIAL_PIECE_DEFS } from '../game/boardState';
import { ChessPiece } from './ChessPiece';
import { loadPieceGeometries, PieceGeometries } from './pieceGeometries';
import { globalSceneRegistry } from '../animation/sceneRegistry';
import { MaterialQuality } from './materials';

export const PieceSet: React.FC<{ quality: MaterialQuality }> = ({ quality }) => {
  // Not Suspense: the piece groups must stay mounted (and registered with the Director) while
  // the GLB loads, so a seek made before it arrives is never lost. Placeholders fill the gap.
  const [geometries, setGeometries] = useState<PieceGeometries | null>(null);

  useEffect(() => {
    let active = true;
    loadPieceGeometries()
      .then((loaded) => {
        if (!active) return;
        setGeometries(loaded);
        globalSceneRegistry.ghostBoard.setGeometries(loaded); // engine-line ghosts share the real shapes
      })
      .catch((error) => console.error('Falling back to placeholder pieces:', error));
    return () => {
      active = false;
    };
  }, []);

  return (
    <group name="PieceSet">
      {INITIAL_PIECE_DEFS.map((def) => (
        <ChessPiece
          key={def.id}
          id={def.id}
          color={def.color}
          type={def.type}
          startSquare={def.startSquare}
          geometry={geometries?.[def.type]}
          quality={quality}
        />
      ))}
    </group>
  );
};
