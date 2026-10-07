import { Chess } from 'chess.js';
import { FULL_PGN } from './pgn';
import { classifyMove } from './moveClassifier';
import { INITIAL_PIECE_DEFS, createInitialSnapshot } from './boardState';
import { BoardSnapshot, PieceId, PieceInstance, ReplayStep, Square } from './types';

export interface GameReplayData {
  steps: ReplayStep[];
  snapshots: BoardSnapshot[]; // snapshots[0] is initial, snapshots[87] is final
  capturedAtPly: Array<{ w: PieceId[]; b: PieceId[] }>;
  finalFen: string;
}

export function buildGameReplay(): GameReplayData {
  const chess = new Chess();
  chess.loadPgn(FULL_PGN);
  const moves = chess.history({ verbose: true });

  const activePieces = new Map<PieceId, Square | 'captured'>();
  const pieceInstances = new Map<PieceId, PieceInstance>();

  for (const def of INITIAL_PIECE_DEFS) {
    activePieces.set(def.id, def.startSquare);
    pieceInstances.set(def.id, {
      ...def,
      currentSquare: def.startSquare,
    });
  }

  const snapshots: BoardSnapshot[] = [createInitialSnapshot()];
  const capturedAtPly: Array<{ w: PieceId[]; b: PieceId[] }> = [{ w: [], b: [] }];
  const steps: ReplayStep[] = [];

  const capturedWhite: PieceId[] = [];
  const capturedBlack: PieceId[] = [];

  const tempChess = new Chess();

  for (let i = 0; i < moves.length; i++) {
    const ply = i + 1;
    const move = moves[i];
    const fenBefore = tempChess.fen();

    const from = move.from as Square;
    const to = move.to as Square;

    // Find the piece that is currently at `from`
    let movingPieceId: PieceId | undefined;
    for (const [id, sq] of activePieces.entries()) {
      if (sq === from) {
        movingPieceId = id;
        break;
      }
    }

    if (!movingPieceId) {
      throw new Error(`Piece not found at square ${from} for ply ${ply} (${move.san})`);
    }

    // Check for captured piece
    let capturedPieceId: PieceId | undefined;
    if (move.captured) {
      // In Kasparov vs Topalov, there is no en passant, so captured piece is on `to`
      for (const [id, sq] of activePieces.entries()) {
        if (sq === to) {
          capturedPieceId = id;
          break;
        }
      }

      if (!capturedPieceId) {
        throw new Error(`Captured piece not found at square ${to} for ply ${ply} (${move.san})`);
      }

      activePieces.set(capturedPieceId, 'captured');
      const pieceInst = pieceInstances.get(capturedPieceId)!;
      pieceInst.currentSquare = 'captured';
      pieceInst.capturedAtPly = ply;

      if (pieceInst.color === 'w') {
        capturedWhite.push(capturedPieceId);
      } else {
        capturedBlack.push(capturedPieceId);
      }
    }

    // Handle castling rook
    let rookMove: { id: PieceId; from: Square; to: Square } | undefined;
    const isCastle = move.flags.includes('k') || move.flags.includes('q');
    if (isCastle) {
      const rank = move.color === 'w' ? '1' : '8';
      const queenside = move.flags.includes('q');
      const rookFrom = `${queenside ? 'a' : 'h'}${rank}` as Square;
      const rookTo = `${queenside ? 'd' : 'f'}${rank}` as Square;
      const rookId = `${move.color}-R-${rookFrom}`;
      activePieces.set(rookId, rookTo);
      rookMove = { id: rookId, from: rookFrom, to: rookTo };
    }

    // Move the primary piece
    activePieces.set(movingPieceId, to);
    const pieceInst = pieceInstances.get(movingPieceId)!;
    pieceInst.currentSquare = to;

    // Execute move on tempChess to get fenAfter and check flags
    tempChess.move(move.san);
    const fenAfter = tempChess.fen();

    const isCheck = move.san.includes('+') || move.san.includes('#');
    const checkedKingId = move.color === 'w' ? 'b-K-e8' : 'w-K-e1';
    const checkSquare = isCheck ? (activePieces.get(checkedKingId) as Square) : undefined;

    const types = classifyMove({
      ply,
      san: move.san,
      captured: !!move.captured,
      isCastle,
    });

    const step: ReplayStep = {
      ply,
      moveNumber: Math.floor(i / 2) + 1,
      color: move.color,
      san: move.san,
      from,
      to,
      piece: move.piece,
      captured: move.captured,
      promotion: move.promotion,
      castle: isCastle ? (move.flags.includes('k') ? 'k' : 'q') : undefined,
      isCheck,
      isMate: move.san.includes('#'),
      checkSquare,
      fenBefore,
      fenAfter,
      pieceId: movingPieceId,
      capturedId: capturedPieceId,
      rookMove,
      types,
    };

    steps.push(step);

    // Save snapshot
    const currentSnapshot: Partial<BoardSnapshot> = {};
    for (const [id, sq] of activePieces.entries()) {
      currentSnapshot[id] = sq;
    }
    snapshots.push(currentSnapshot as BoardSnapshot);

    capturedAtPly.push({
      w: [...capturedWhite],
      b: [...capturedBlack],
    });
  }

  return {
    steps,
    snapshots,
    capturedAtPly,
    finalFen: tempChess.fen(),
  };
}

export const GAME_DATA = buildGameReplay();
export const REPLAY_STEPS = GAME_DATA.steps;
export const SNAPSHOTS = GAME_DATA.snapshots;
export const CAPTURED_AT_PLY = GAME_DATA.capturedAtPly;
export const FINAL_FEN = GAME_DATA.finalFen;
