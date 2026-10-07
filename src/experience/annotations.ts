import { Annotation } from '../game/types';

export interface GhostVariation {
  id: string;
  name: string;
  plyOrigin: number; // ghost lines play from the position after this ply (35...Kd1 = 70)
  moves: string[]; // SAN, must be legal from REPLAY_STEPS[plyOrigin - 1].fenAfter
  commentary: string;
}

// Captions state only facts that can be read off the game score. Evaluations are left out
// until scripts/genEval.ts produces them (IMPLEMENTATION_PLAN §A2): no hand-written numbers.
export const ANNOTATIONS: Record<number, Annotation> = {
  21: {
    caption: '11. O-O-O — Kasparov castles queenside.',
    explanation: 'His king goes to c1; two moves later Topalov castles on the same side.',
  },
  26: {
    caption: '13... O-O-O — Topalov castles queenside too.',
    explanation: 'Both kings now stand on the queenside.',
  },
  39: {
    caption: "20. Qf4+ — Kasparov's queen gives check.",
    explanation: 'The Black king steps from b8 to a7.',
  },
  43: {
    caption: '22. Nd5 — a knight offered in the centre.',
    explanation: 'Topalov takes it with 22...Nbxd5, and Kasparov recaptures with 23.exd5.',
  },
  46: {
    caption: '23... Qd6 — the position before the sacrifice.',
    explanation: "Black's pawn on d4 stands between Kasparov's rook on d1 and Black's position.",
  },
  47: {
    glyph: '!!',
    caption: '24. Rxd4!! — Kasparov gives up a rook.',
    explanation:
      "The rook takes the d4 pawn, where Black's c5 pawn can capture it. Kasparov offers the rook to open lines toward the Black king.",
  },
  48: {
    caption: '24... cxd4 — Topalov accepts.',
    explanation: 'Black is now ahead by a rook for a pawn.',
  },
  49: {
    caption: '25. Re7+ — the second rook arrives with check.',
    explanation: 'The rook from e1 checks along the seventh rank, and the Black king steps out to b6.',
  },
  51: {
    caption: '26. Qxd4+ — the queen joins with check.',
    explanation: 'The queen captures on d4 with check; Topalov answers by taking the a5 knight with his king.',
  },
  53: {
    caption: '27. b4+ — another check.',
    explanation: 'The b-pawn drives the Black king forward to a4.',
  },
  57: {
    caption: '29. Ra7 — the rook switches files.',
    explanation: 'The rook leaves e7 for a7; Topalov answers 29...Bb7.',
  },
  61: {
    caption: '31. Qxf6 — Kasparov takes the f6 knight.',
    explanation: 'In the middle of the hunt the queen collects material, and the Black king takes on a3.',
  },
  63: {
    caption: '32. Qxa6+ — the queen takes on a6 with check.',
    explanation: 'The Black king answers by taking the b4 pawn.',
  },
  65: {
    caption: '33. c3+ — a pawn gives check.',
    explanation: "The king takes it on c3 and keeps running into White's half of the board.",
  },
  70: {
    caption: "35... Kd1 — the king reaches White's first rank.",
    explanation: 'From a7 to d1, the Black king has crossed the entire board.',
  },
  73: {
    caption: '37. Rd7 — the rook steps onto the d-file.',
    explanation: 'Topalov takes it: 37...Rxd7.',
  },
  77: {
    caption: '39. Qxh8 — the queen takes the h8 rook.',
    explanation: 'White wins back material while the Black king is still stranded.',
  },
  82: {
    caption: '41... Ke1 — the king reaches e1.',
    explanation: "From a7 at move 20 to White's back rank.",
  },
  87: {
    caption: '44. Qa7 — Black resigns. 1–0.',
    explanation: "Topalov resigns after Kasparov's final queen move.",
  },
};

// Filled in M7 (IMPLEMENTATION_PLAN §A2): lines from published analysis, confirmed by
// Stockfish, approved by the project owner, and never the moves actually played next.
export const GHOST_VARIATIONS: GhostVariation[] = [];
