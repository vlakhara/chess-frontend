import {
  Board,
  Move,
  Piece,
  PieceType,
  Position,
} from "@/brain/types";
import {
  getKing,
  getValidMoves,
  isAnyMoveLeft,
  isKingCheckMate,
  isKingInCheck,
  movePiece,
  promote,
} from "@/brain/move";
import { FILES, fenToBoard, parseSquare, squareName } from "./fen";

export interface Puzzle {
  /** Position as "placement turn castling". */
  fen: string;
  /** Moves as "e2e4" (or "e7e8q"), solver first, then the replies alternate. */
  solution: string[];
  title?: string;
}

export interface Played {
  board: Board;
  move: Move;
  check: boolean;
  checkmate: boolean;
  stalemate: boolean;
}

const PROMO: Record<string, PieceType> = {
  q: PieceType.QUEEN,
  r: PieceType.ROOK,
  b: PieceType.BISHOP,
  n: PieceType.KNIGHT,
};
const PROMO_LETTER: Partial<Record<PieceType, string>> = {
  [PieceType.QUEEN]: "q",
  [PieceType.ROOK]: "r",
  [PieceType.BISHOP]: "b",
  [PieceType.KNIGHT]: "n",
};

export const toUci = (from: Position, to: Position, promo?: PieceType) =>
  `${squareName(from)}${squareName(to)}${promo ? PROMO_LETTER[promo] ?? "" : ""}`;

export const parseUci = (
  uci: string
): { from: Position; to: Position; promo?: PieceType } | null => {
  const m = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(uci);
  if (!m) return null;
  const from = parseSquare(m[1]);
  const to = parseSquare(m[2]);
  if (!from || !to) return null;
  return { from, to, promo: m[3] ? PROMO[m[3]] : undefined };
};

const isPromotionMove = (piece: Piece, to: Position) =>
  piece.type === PieceType.PAWN &&
  ((piece.color === "white" && to.x === 0) || (piece.color === "black" && to.x === 7));

/** Plays a move if it is legal for the side to move; null otherwise. */
export const applyMove = (
  board: Board,
  history: Move[],
  turn: "white" | "black",
  from: Position,
  to: Position,
  promo?: PieceType
): Played | null => {
  const piece = board[from.x][from.y];
  if (!piece || piece.color !== turn) return null;
  const legal = getValidMoves(board, from, history).some(
    (m) => m.x === to.x && m.y === to.y
  );
  if (!legal) return null;

  const enPassant =
    piece.type === PieceType.PAWN && from.y !== to.y && !board[to.x][to.y];
  const captured = enPassant ? board[from.x][to.y] : board[to.x][to.y];

  let after = movePiece(board, from, to, true);
  const move: Move = { from, to, piece, capturedPiece: captured };
  if (piece.type === PieceType.KING && Math.abs(to.y - from.y) === 2) move.isCastle = true;
  if (isPromotionMove(piece, to)) {
    const choice = promo ?? PieceType.QUEEN;
    after = promote(after, choice, to, piece.color);
    move.isPromoted = true;
    move.promotedTo = choice;
  }

  const enemy = turn === "white" ? "black" : "white";
  const king = getKing(after, enemy);
  const check = Boolean(king && isKingInCheck(after, king.position));
  const checkmate = check && isKingCheckMate(after, enemy);
  const stalemate = !check && !isAnyMoveLeft(after, enemy);
  return { board: after, move, check, checkmate, stalemate };
};

export const needsPromotion = (board: Board, from: Position, to: Position) => {
  const piece = board[from.x][from.y];
  return Boolean(piece && isPromotionMove(piece, to));
};

export const otherColor = (c: "white" | "black") => (c === "white" ? "black" : "white");

export interface Replayed {
  start: Board;
  turn: "white" | "black";
  boards: Board[]; // boards[i] is the position after i moves
  history: Move[];
  plays: Played[];
}

/** Replays the whole solution; null if the position or any move is illegal. */
export const replayPuzzle = (puzzle: Puzzle): Replayed | null => {
  const parsed = fenToBoard(puzzle.fen);
  if (!parsed) return null;
  let board = parsed.board;
  let turn = parsed.turn;
  const boards: Board[] = [board];
  const history: Move[] = [];
  const plays: Played[] = [];
  for (const uci of puzzle.solution) {
    const m = parseUci(uci);
    if (!m) return null;
    const played = applyMove(board, history, turn, m.from, m.to, m.promo);
    if (!played) return null;
    board = played.board;
    history.push(played.move);
    plays.push(played);
    boards.push(board);
    turn = otherColor(turn);
  }
  return { start: parsed.board, turn: parsed.turn, boards, history, plays };
};

export interface PuzzleInfo {
  turn: "white" | "black";
  /** Moves the solver has to find. */
  solverMoves: number;
  /** Set when the solution ends in checkmate. */
  mateIn: number | null;
}

export const describePuzzle = (puzzle: Puzzle): PuzzleInfo | null => {
  const r = replayPuzzle(puzzle);
  if (!r || r.plays.length === 0) return null;
  const solverMoves = Math.ceil(r.plays.length / 2);
  const last = r.plays[r.plays.length - 1];
  return { turn: r.turn, solverMoves, mateIn: last.checkmate ? solverMoves : null };
};

export const goalText = (info: PuzzleInfo) => {
  const side = info.turn === "white" ? "White" : "Black";
  return info.mateIn
    ? `${side} to move. Mate in ${info.mateIn}.`
    : info.solverMoves > 1
    ? `${side} to move. Find the best ${info.solverMoves} moves.`
    : `${side} to move. Find the best move.`;
};

// ---- Links ---------------------------------------------------------------

export const encodePuzzle = (p: Puzzle): string => {
  const q = new URLSearchParams();
  q.set("f", p.fen.replace(/ /g, "_"));
  q.set("s", p.solution.join(","));
  if (p.title?.trim()) q.set("t", p.title.trim().slice(0, 60));
  return q.toString();
};

type Params = { f?: string | string[]; s?: string | string[]; t?: string | string[] };
const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);

export const decodePuzzle = (params: Params): Puzzle | null => {
  const f = first(params.f);
  const s = first(params.s);
  if (!f || !s) return null;
  const puzzle: Puzzle = {
    fen: f.replace(/_/g, " "),
    solution: s.split(",").filter(Boolean).slice(0, 12),
    title: first(params.t)?.slice(0, 60),
  };
  return replayPuzzle(puzzle) && puzzle.solution.length ? puzzle : null;
};

export { FILES };
