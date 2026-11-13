import { movePiece, promote } from "@/brain/move";
import {
  Board,
  GameState,
  Move,
  PieceType,
  Player,
  Position,
} from "@/brain/types";

/** A move as it travels over the wire (see Board.tsx and the server). */
export interface MovePayload {
  move: {
    from: Position;
    to: Position;
    promotedTo?: PieceType;
    isCastle?: boolean;
  };
  check: boolean;
  checkmate: boolean;
  stalemate: boolean;
  winner: "white" | "black" | null;
}

/** Plays one wire move on a board, using the normal rules code. */
export const replayMove = (
  before: Board,
  m: MovePayload["move"],
  silent = false
): { after: Board; played: Move } | null => {
  const piece = before[m.from.x]?.[m.from.y];
  if (!piece) return null;

  let after = movePiece(before, m.from, m.to, silent);
  if (m.promotedTo) {
    after = promote(after, m.promotedTo, m.to, piece.color);
  }
  const played: Move = {
    from: m.from,
    to: m.to,
    piece,
    capturedPiece: before[m.to.x][m.to.y],
  };
  if (m.promotedTo) {
    played.isPromoted = true;
    played.promotedTo = m.promotedTo;
  }
  if (m.isCastle) played.isCastle = true;
  return { after, played };
};

/**
 * Rebuilds a game from the server's starting position and its move log.
 * Used when coming back to a game after a refresh or a dropped connection.
 */
export const rebuildGame = (base: GameState, moves: MovePayload[]): GameState => {
  let pieces = base.board.pieces;
  const played: Move[] = [];
  for (const m of moves) {
    const result = replayMove(pieces, m.move, true);
    if (!result) break;
    pieces = result.after;
    played.push(result.played);
  }
  const last = moves[moves.length - 1];
  const whiteToMove = played.length % 2 === 0;

  return {
    ...base,
    board: { pieces },
    history: { moves: played, lastMove: played[played.length - 1] },
    currentTurn: (whiteToMove ? base.white : base.black) as Player,
    check: Boolean(last?.check),
    checkmate: Boolean(last?.checkmate),
    stalemate: Boolean(last?.stalemate),
  };
};
