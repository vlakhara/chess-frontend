import {
  Board,
  CHARACTER_MAP,
  Piece,
  PieceType,
  Position,
} from "@/brain/types";
import { getKing, isKingInCheck } from "@/brain/move";

export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq";

const LETTER_TO_TYPE: Record<string, PieceType> = {
  k: PieceType.KING,
  q: PieceType.QUEEN,
  r: PieceType.ROOK,
  b: PieceType.BISHOP,
  n: PieceType.KNIGHT,
  p: PieceType.PAWN,
};

const TYPE_TO_LETTER: Record<PieceType, string> = {
  [PieceType.KING]: "k",
  [PieceType.QUEEN]: "q",
  [PieceType.ROOK]: "r",
  [PieceType.BISHOP]: "b",
  [PieceType.KNIGHT]: "n",
  [PieceType.PAWN]: "p",
};

export const FILES = "abcdefgh";
export const squareName = (p: Position) => `${FILES[p.y]}${8 - p.x}`;
export const parseSquare = (s: string): Position | null => {
  if (!/^[a-h][1-8]$/.test(s)) return null;
  return { x: 8 - Number(s[1]), y: FILES.indexOf(s[0]) };
};

export const makePiece = (
  type: PieceType,
  color: "white" | "black",
  id: number,
  hasMoved?: boolean
): Piece => ({
  id,
  type,
  color,
  notation: CHARACTER_MAP[type].notation,
  ...(hasMoved === undefined ? {} : { hasMoved }),
});

export const emptyBoard = (): Board =>
  Array.from({ length: 8 }, () => Array<Piece | null>(8).fill(null));

/** Reads a FEN ("placement turn castling") into a board the rules code understands. */
export const fenToBoard = (
  fen: string
): { board: Board; turn: "white" | "black" } | null => {
  const [placement, turnPart = "w", castling = "-"] = fen.trim().split(/\s+/);
  const rows = (placement ?? "").split("/");
  if (rows.length !== 8) return null;

  const board = emptyBoard();
  let id = 100;
  for (let x = 0; x < 8; x++) {
    let y = 0;
    for (const ch of rows[x]) {
      if (/[1-8]/.test(ch)) {
        y += Number(ch);
        continue;
      }
      const type = LETTER_TO_TYPE[ch.toLowerCase()];
      if (!type || y > 7) return null;
      const color = ch === ch.toLowerCase() ? "black" : "white";

      let hasMoved = true;
      if (type === PieceType.PAWN) {
        hasMoved = color === "white" ? x !== 6 : x !== 1;
      } else if (type === PieceType.KING) {
        const home = color === "white" ? x === 7 && y === 4 : x === 0 && y === 4;
        const rights = color === "white" ? /[KQ]/ : /[kq]/;
        hasMoved = !(home && rights.test(castling));
      } else if (type === PieceType.ROOK) {
        const row = color === "white" ? 7 : 0;
        const right =
          y === 7 && x === row
            ? color === "white" ? "K" : "k"
            : y === 0 && x === row
            ? color === "white" ? "Q" : "q"
            : null;
        hasMoved = !(right && castling.includes(right));
      }
      board[x][y] = makePiece(type, color, id++, hasMoved);
      y++;
    }
    if (y !== 8) return null;
  }
  return { board, turn: turnPart === "b" ? "black" : "white" };
};

/** Writes a board as FEN. Castling rights come from the pieces' hasMoved flags. */
export const boardToFen = (board: Board, turn: "white" | "black"): string => {
  const rows: string[] = [];
  for (let x = 0; x < 8; x++) {
    let row = "";
    let empty = 0;
    for (let y = 0; y < 8; y++) {
      const piece = board[x][y];
      if (!piece) {
        empty++;
        continue;
      }
      if (empty) {
        row += empty;
        empty = 0;
      }
      const letter = TYPE_TO_LETTER[piece.type];
      row += piece.color === "white" ? letter.toUpperCase() : letter;
    }
    if (empty) row += empty;
    rows.push(row);
  }

  const at = (x: number, y: number, type: PieceType, color: string) => {
    const p = board[x][y];
    return Boolean(p && p.type === type && p.color === color && !p.hasMoved);
  };
  let castling = "";
  if (at(7, 4, PieceType.KING, "white")) {
    if (at(7, 7, PieceType.ROOK, "white")) castling += "K";
    if (at(7, 0, PieceType.ROOK, "white")) castling += "Q";
  }
  if (at(0, 4, PieceType.KING, "black")) {
    if (at(0, 7, PieceType.ROOK, "black")) castling += "k";
    if (at(0, 0, PieceType.ROOK, "black")) castling += "q";
  }
  return `${rows.join("/")} ${turn === "white" ? "w" : "b"} ${castling || "-"}`;
};

/** Returns a message if the position can't be played, otherwise null. */
export const validatePosition = (
  board: Board,
  turn: "white" | "black"
): string | null => {
  const count = (type: PieceType, color: string) =>
    board.flat().filter((p) => p && p.type === type && p.color === color).length;

  if (count(PieceType.KING, "white") !== 1 || count(PieceType.KING, "black") !== 1) {
    return "Each side needs exactly one king.";
  }
  for (let y = 0; y < 8; y++) {
    if (board[0][y]?.type === PieceType.PAWN || board[7][y]?.type === PieceType.PAWN) {
      return "Pawns can't stand on the first or last rank.";
    }
  }
  const waiting = turn === "white" ? "black" : "white";
  const king = getKing(board, waiting);
  if (king && isKingInCheck(board, king.position)) {
    return `The ${waiting} king is in check, but it is ${turn}'s move.`;
  }
  return null;
};
