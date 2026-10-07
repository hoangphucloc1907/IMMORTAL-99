export type Square =
  | 'a1'
  | 'a2'
  | 'a3'
  | 'a4'
  | 'a5'
  | 'a6'
  | 'a7'
  | 'a8'
  | 'b1'
  | 'b2'
  | 'b3'
  | 'b4'
  | 'b5'
  | 'b6'
  | 'b7'
  | 'b8'
  | 'c1'
  | 'c2'
  | 'c3'
  | 'c4'
  | 'c5'
  | 'c6'
  | 'c7'
  | 'c8'
  | 'd1'
  | 'd2'
  | 'd3'
  | 'd4'
  | 'd5'
  | 'd6'
  | 'd7'
  | 'd8'
  | 'e1'
  | 'e2'
  | 'e3'
  | 'e4'
  | 'e5'
  | 'e6'
  | 'e7'
  | 'e8'
  | 'f1'
  | 'f2'
  | 'f3'
  | 'f4'
  | 'f5'
  | 'f6'
  | 'f7'
  | 'f8'
  | 'g1'
  | 'g2'
  | 'g3'
  | 'g4'
  | 'g5'
  | 'g6'
  | 'g7'
  | 'g8'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'h5'
  | 'h6'
  | 'h7'
  | 'h8';

export type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Color = 'w' | 'b';
export type PieceId = string;

export type MoveType =
  'NORMAL' | 'CAPTURE' | 'CHECK' | 'CASTLING' | 'SACRIFICE' | 'KING_HUNT' | 'MAJOR_ATTACK' | 'FINAL_MOVE';

export interface Annotation {
  glyph?: '!' | '!!' | '?' | '??' | '!?' | '?!' | '+';
  caption?: string;
  explanation?: string;
  eval?: number; // Stockfish eval in pawns
}

export interface ReplayStep {
  ply: number; // 1..87
  moveNumber: number;
  color: 'w' | 'b';
  san: string;
  from: Square;
  to: Square;
  piece: PieceSymbol;
  captured?: PieceSymbol;
  promotion?: PieceSymbol;
  castle?: 'k' | 'q';
  isCheck: boolean;
  isMate: boolean;
  checkSquare?: Square; // square of the king in check after this move
  fenBefore: string;
  fenAfter: string;
  pieceId: PieceId; // moving piece stable id
  capturedId?: PieceId; // captured piece stable id
  rookMove?: { id: PieceId; from: Square; to: Square }; // for O-O-O
  types: MoveType[]; // factual ∪ authored; primary = types[0]
  annotation?: Annotation;
}

export interface PieceInstance {
  id: PieceId;
  color: Color;
  type: PieceSymbol;
  startSquare: Square;
  currentSquare: Square | 'captured';
  capturedAtPly?: number;
}

export type BoardSnapshot = Record<PieceId, Square | 'captured'>;
