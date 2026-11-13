"use client";

import { Board, Position } from "@/brain/types";
import { pieceMarkup } from "@/lib/puzzle/pieces";
import styles from "@/styles/Puzzle.module.css";

interface PuzzleBoardProps {
  board: Board;
  flipped?: boolean;
  selected?: Position | null;
  targets?: Position[];
  lastMove?: { from: Position; to: Position } | null;
  hint?: Position[];
  checkKing?: Position | null;
  shake?: boolean;
  onSquare?: (position: Position) => void;
}

const same = (a: Position | null | undefined, x: number, y: number) =>
  Boolean(a && a.x === x && a.y === y);

const PuzzleBoard = ({
  board,
  flipped = false,
  selected = null,
  targets = [],
  lastMove = null,
  hint = [],
  checkKing = null,
  shake = false,
  onSquare,
}: PuzzleBoardProps) => {
  const cells = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const x = flipped ? 7 - r : r;
      const y = flipped ? 7 - c : c;
      const piece = board[x][y];
      const isTarget = targets.some((t) => t.x === x && t.y === y);
      const classes = [
        styles.sq,
        (x + y) % 2 === 0 ? styles.light : styles.dark,
        same(lastMove?.from, x, y) || same(lastMove?.to, x, y) ? styles.last : "",
        same(selected, x, y) ? styles.selected : "",
        hint.some((h) => h.x === x && h.y === y) ? styles.hint : "",
        same(checkKing, x, y) ? styles.check : "",
        isTarget ? (piece ? styles.capture : styles.target) : "",
      ]
        .filter(Boolean)
        .join(" ");

      cells.push(
        <div
          key={`${x}-${y}`}
          className={classes}
          data-sq={`${"abcdefgh"[y]}${8 - x}`}
          onClick={() => onSquare?.({ x, y })}
        >
          {c === 0 && <i className={styles.rank}>{8 - x}</i>}
          {r === 7 && <i className={styles.file}>{"abcdefgh"[y]}</i>}
          {piece && (
            <svg
              viewBox="0 0 100 100"
              className={styles.piece}
              aria-label={`${piece.color} ${piece.type.toLowerCase()}`}
              dangerouslySetInnerHTML={{ __html: pieceMarkup(piece.type, piece.color) }}
            />
          )}
        </div>
      );
    }
  }
  return (
    <div className={`${styles.board} ${shake ? styles.shake : ""}`} role="grid">
      {cells}
    </div>
  );
};

export default PuzzleBoard;
