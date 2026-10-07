import { ActDefinition } from './types';

export const ACTS: ActDefinition[] = [
  {
    id: 'ACT_I',
    romanNumeral: 'I',
    title: 'THE PIRC',
    subtitle: 'The Opening Skirmish',
    plyRange: [0, 24],
    budgetSeconds: 35,
    lightingPreset: 'ACT_I',
    fogDensity: 0.02,
    openingShot: 'ESTABLISHING',
  },
  {
    id: 'ACT_II',
    romanNumeral: 'II',
    title: 'TENSION',
    subtitle: 'Gathering Storm',
    plyRange: [25, 46],
    budgetSeconds: 40,
    lightingPreset: 'ACT_II',
    fogDensity: 0.03,
    openingShot: 'OVERVIEW',
  },
  {
    id: 'ACT_III',
    romanNumeral: 'III',
    title: 'THE SACRIFICE',
    subtitle: '24. Rxd4!! — Point of No Return',
    plyRange: [47, 48],
    budgetSeconds: 15,
    lightingPreset: 'ACT_III',
    fogDensity: 0.045,
    openingShot: 'LOW_ANGLE',
  },
  {
    id: 'ACT_IV',
    romanNumeral: 'IV',
    title: 'THE HUNT',
    subtitle: 'The King Hunt 25–35',
    plyRange: [49, 70],
    budgetSeconds: 48,
    lightingPreset: 'ACT_IV',
    fogDensity: 0.04,
    openingShot: 'TRACK_KING',
  },
  {
    id: 'ACT_V',
    romanNumeral: 'V',
    title: 'THE SILENCE',
    subtitle: 'Aftermath & Resignation',
    plyRange: [71, 87],
    budgetSeconds: 40,
    lightingPreset: 'ACT_V',
    fogDensity: 0.025,
    openingShot: 'TOP_DOWN',
  },
];

export function getActForPly(ply: number): ActDefinition {
  for (const act of ACTS) {
    if (ply >= act.plyRange[0] && ply <= act.plyRange[1]) {
      return act;
    }
  }
  return ACTS[0];
}

export function isActBoundary(ply: number): boolean {
  return ACTS.some((act) => act.plyRange[0] === ply && ply > 0);
}
