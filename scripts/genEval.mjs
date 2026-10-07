// Offline engine analysis → src/experience/annotations.eval.json (IMPLEMENTATION_PLAN §A2, Content track).
//
// Usage:
//   npm install --prefix <tools-dir> stockfish@19        (GPL-3.0 — kept OUT of this repo's dependencies)
//   node scripts/genEval.mjs <tools-dir>/node_modules/stockfish [--eval-depth 22] [--ghost-depth 30] [--flavor single]
//
// 1. Evaluates the position after every ply (0..87), White's point of view.
// 2. Ghost candidates: at every Black king move of the hunt (plies 49–70), tries each OTHER legal king
//    move and records the engine's best continuation. A line is kept only if White is clearly winning
//    (eval ≥ +3.00 or a forced mate), so it shows "every escape loses" — never the move actually played.
// 3. Lines are labelled as engine analysis and start with `approved: false`; the project owner flips
//    the flag after review (re-running keeps existing approvals by id). Only approved lines ship.
//
// The engine never runs in the app: only this JSON is bundled.

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Chess } from 'chess.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(root, 'src/experience/annotations.eval.json');
const HUNT = [49, 70];
const WIN_CP = 300;
const PV_PLIES = 8; // ghost line length after the alternative king move

const args = process.argv.slice(2);
const enginePackage = args[0];
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const EVAL_DEPTH = Number(option('eval-depth', 22));
const GHOST_DEPTH = Number(option('ghost-depth', 30));
const FLAVOR = option('flavor', 'single'); // full NNUE, single-threaded
if (!enginePackage) {
  console.error('usage: node scripts/genEval.mjs <path-to-stockfish-package> [--eval-depth 22] [--ghost-depth 30]');
  process.exit(1);
}

// --- game ------------------------------------------------------------------------------------------
const pgnSource = readFileSync(resolve(root, 'src/game/pgn.ts'), 'utf8');
const movesText = pgnSource.match(/PGN_MOVES = `([\s\S]*?)`/)[1];
const game = new Chess();
game.loadPgn(movesText);
const history = game.history({ verbose: true });
const fenAfter = [history[0].before, ...history.map((m) => m.after)]; // index = ply

// --- engine ----------------------------------------------------------------------------------------
const initEngine = createRequire(resolve(enginePackage, 'package.json'))(resolve(enginePackage, 'index.js'));
const engine = await initEngine(FLAVOR);
let onLine = () => {};
engine.listener = (line) => onLine(line);
const send = (cmd) => engine.sendCommand(cmd);
send('uci');
send('setoption name Hash value 256');
send('isready');

let engineName = 'Stockfish';
await new Promise((done) => {
  onLine = (line) => {
    if (line.startsWith('id name ')) engineName = line.slice(8).trim();
    if (line === 'readyok') done();
  };
});

/** Analyse a FEN; score converted to White's point of view. */
function analyse(fen, depth) {
  return new Promise((done) => {
    let last = null;
    onLine = (line) => {
      if (line.startsWith('info') && line.includes(' pv ') && / multipv 1 /.test(line + ' ')) {
        const d = Number(line.match(/ depth (\d+)/)[1]);
        const mate = line.match(/ score mate (-?\d+)/);
        const cp = line.match(/ score cp (-?\d+)/);
        const pv = line.split(' pv ')[1].trim().split(' ');
        last = { depth: d, mate: mate ? Number(mate[1]) : null, cp: cp ? Number(cp[1]) : null, pv };
      }
      if (line.startsWith('bestmove')) {
        const whiteToMove = fen.split(' ')[1] === 'w';
        const sign = whiteToMove ? 1 : -1;
        done({
          depth: last?.depth ?? 0,
          cp: last?.cp === null || last?.cp === undefined ? undefined : last.cp * sign,
          mate: last?.mate === null || last?.mate === undefined ? undefined : last.mate * sign,
          pv: last?.pv ?? [],
        });
      }
    };
    send('ucinewgame');
    send(`position fen ${fen}`);
    send(`go depth ${depth}`);
  });
}

const uciToSan = (fen, uciMoves, max) => {
  const board = new Chess(fen);
  const san = [];
  for (const uci of uciMoves.slice(0, max)) {
    const move = board.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    san.push(move.san);
  }
  return san;
};

// --- 1. evaluation of every ply --------------------------------------------------------------------
const plies = [];
for (let ply = 0; ply < fenAfter.length; ply++) {
  const result = await analyse(fenAfter[ply], EVAL_DEPTH);
  plies.push({ ply, depth: result.depth, cp: result.cp, mate: result.mate });
  process.stdout.write(`\reval ply ${ply}/${fenAfter.length - 1}  `);
}
console.log();

// --- 2. ghost candidates ---------------------------------------------------------------------------
const previous = existsSync(OUTPUT) ? JSON.parse(readFileSync(OUTPUT, 'utf8')) : { ghosts: [] };
const approvedIds = new Set(previous.ghosts.filter((g) => g.approved).map((g) => g.id));

const ghosts = [];
for (let ply = HUNT[0]; ply <= HUNT[1]; ply++) {
  const played = history[ply - 1];
  if (played.color !== 'b' || played.piece !== 'k') continue;

  const before = new Chess(played.before);
  const alternatives = before.moves({ verbose: true }).filter((m) => m.piece === 'k' && m.san !== played.san);
  for (const alt of alternatives) {
    const afterAlt = new Chess(played.before);
    afterAlt.move(alt.san);
    if (afterAlt.isGameOver()) continue;

    const result = await analyse(afterAlt.fen(), GHOST_DEPTH);
    const winning = (result.mate !== undefined && result.mate > 0) || (result.cp !== undefined && result.cp >= WIN_CP);
    console.log(
      `ply ${ply}: instead of ${played.san}, ${alt.san} → ${result.mate !== undefined ? `mate ${result.mate}` : `${result.cp} cp`} (depth ${result.depth})${winning ? '' : '  — dropped'}`,
    );
    if (!winning) continue;

    const id = `p${ply}-${alt.san}`;
    ghosts.push({
      id,
      branchPly: ply,
      instead: played.san,
      moves: [alt.san, ...uciToSan(afterAlt.fen(), result.pv, PV_PLIES)],
      depth: result.depth,
      cp: result.cp,
      mate: result.mate,
      approved: approvedIds.has(id),
    });
  }
}

const output = {
  source: `${engineName} (${FLAVOR} build) — engine analysis, not a published annotation`,
  generatedAt: new Date().toISOString().slice(0, 10),
  evalDepth: EVAL_DEPTH,
  ghostDepth: GHOST_DEPTH,
  plies,
  ghosts,
};
writeFileSync(OUTPUT, JSON.stringify(output, null, 2) + '\n');
console.log(`wrote ${OUTPUT}: ${plies.length} evaluations, ${ghosts.length} ghost candidates`);
process.exit(0);
