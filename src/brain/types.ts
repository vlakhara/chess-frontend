export const CHARACTER_MAP = {
  KING: { white: "♔", black: "♚", notation: "K" },
  QUEEN: { white: "♕", black: "♛", notation: "Q" },
  ROOK: { white: "♖", black: "♜", notation: "R" },
  BISHOP: { white: "♗", black: "♝", notation: "B" },
  KNIGHT: { white: "♘", black: "♞", notation: "N" },
  PAWN: { white: "♙", black: "♟︎", notation: "" },
};

export enum PieceType {
  KING = "KING",
  QUEEN = "QUEEN",
  ROOK = "ROOK",
  BISHOP = "BISHOP",
  KNIGHT = "KNIGHT",
  PAWN = "PAWN",
}

export enum GameStatus {
  WAITING_FOR_PLAYER = "WAITING_FOR_PLAYER",
  IN_PROGRESS = "IN_PROGRESS",
  CHECKMATE = "CHECKMATE",
  STALEMATE = "STALEMATE",
  RESIGNED = "RESIGNED",
  DRAW = "DRAW",
  TIMEOUT = "TIMEOUT",
}

export type Piece = {
  id: number;
  type: PieceType;
  color: "white" | "black";
  hasMoved?: boolean;
  notation: string;
};

export type Board = (Piece | null)[][];

export type Position = {
  x: number;
  y: number;
};

export type PieceWithPosition = {
  piece: Piece;
  position: Position;
};

export type Move = {
  from: Position;
  to: Position;
  piece: Piece;
  capturedPiece?: Piece | null;
  isPromoted?: boolean;
  isCastle?: boolean;
  promotedTo?: PieceType;
};

export type PIECE_MOVE = { dx: number; dy: number };

export type MovePayload = {
  from: Position;
  to: Position;
  board: Board;
  history: Move[];
  nextTurn: "white" | "black";
  winner: "white" | "black" | null;
  isCheckmate: boolean;
  isStalemate: boolean;
};

export type Player = {
  id: string;
  name: string;
  color: "white" | "black";
};

export type GameState = {
  gameId: string;
  white: Player;
  black: Player;
  winner: Player | null;
  board: { pieces: Board };
  history: { moves: Move[]; lastMove: Move };
  status: GameStatus;
  currentTurn: Player;
  check: boolean;
  checkmate: boolean;
  stalemate: boolean;
  startedAt: Date;
  endedAt: Date | null;
};