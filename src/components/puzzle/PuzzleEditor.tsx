"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getKing, getValidMoves, isKingInCheck } from "@/brain/move";
import { Board, PieceType, Position } from "@/brain/types";
import {
  START_FEN,
  boardToFen,
  emptyBoard,
  fenToBoard,
  makePiece,
  validatePosition,
} from "@/lib/puzzle/fen";
import {
  Puzzle,
  applyMove,
  describePuzzle,
  encodePuzzle,
  goalText,
  needsPromotion,
  otherColor,
  replayPuzzle,
  toUci,
} from "@/lib/puzzle/puzzle";
import { pieceMarkup } from "@/lib/puzzle/pieces";
import { usePromotionDialog } from "@/components/usePromotionDialog";
import PuzzleBoard from "./PuzzleBoard";
import ShareTools from "./ShareTools";
import styles from "@/styles/Puzzle.module.css";

type Mode = "setup" | "solution";
type Tool = { type: PieceType; color: "white" | "black" } | "erase" | null;

const PALETTE: { type: PieceType; color: "white" | "black" }[] = [
  ...[PieceType.KING, PieceType.QUEEN, PieceType.ROOK, PieceType.BISHOP, PieceType.KNIGHT, PieceType.PAWN].map(
    (type) => ({ type, color: "white" as const })
  ),
  ...[PieceType.KING, PieceType.QUEEN, PieceType.ROOK, PieceType.BISHOP, PieceType.KNIGHT, PieceType.PAWN].map(
    (type) => ({ type, color: "black" as const })
  ),
];

interface Props {
  initial: Puzzle | null;
}

const PuzzleEditor = ({ initial }: Props) => {
  const start = fenToBoard(initial?.fen ?? START_FEN)!;
  const [mode, setMode] = useState<Mode>(initial?.solution.length ? "solution" : "setup");
  const [board, setBoard] = useState<Board>(start.board);
  const [turn, setTurn] = useState<"white" | "black">(start.turn);
  const [tool, setTool] = useState<Tool>(null);
  const [solution, setSolution] = useState<string[]>(initial?.solution ?? []);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [flipped, setFlipped] = useState(start.turn === "black");
  const [selected, setSelected] = useState<Position | null>(null);
  const [targets, setTargets] = useState<Position[]>([]);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Puzzle | null>(null);
  const [previewOk, setPreviewOk] = useState(true);
  const nextId = useRef(1000);
  const { askPromotion, dialog } = usePromotionDialog();

  const fen = useMemo(() => boardToFen(board, turn), [board, turn]);
  const replay = useMemo(() => replayPuzzle({ fen, solution }), [fen, solution]);
  const shown = mode === "solution" && replay ? replay.boards[replay.boards.length - 1] : board;
  const history = replay?.history ?? [];
  const mover = solution.length % 2 === 0 ? turn : otherColor(turn);
  const lastMove = history.length
    ? { from: history[history.length - 1].from, to: history[history.length - 1].to }
    : null;
  const king = mode === "solution" ? getKing(shown, mover) : null;
  const checkKing = king && isKingInCheck(shown, king.position) ? king.position : null;

  const edit = (fn: () => void) => {
    fn();
    setSolution([]);
    setCreated(null);
    setError("");
  };

  const placePiece = (p: Position) => {
    if (!tool) return;
    edit(() => {
      const next = board.map((row) => row.slice());
      const here = next[p.x][p.y];
      if (tool === "erase") {
        next[p.x][p.y] = null;
      } else if (here && here.type === tool.type && here.color === tool.color) {
        next[p.x][p.y] = null;
      } else {
        next[p.x][p.y] = makePiece(tool.type, tool.color, nextId.current++);
      }
      setBoard(next);
    });
  };

  const recordMove = async (p: Position) => {
    if (!replay) return;
    const piece = shown[p.x][p.y];
    if (selected && targets.some((t) => t.x === p.x && t.y === p.y)) {
      let promo: PieceType | undefined;
      if (needsPromotion(shown, selected, p)) {
        const choice = await askPromotion(mover);
        if (!choice) return;
        promo = choice;
      }
      const played = applyMove(shown, history, mover, selected, p, promo);
      if (!played) return;
      setSolution([...solution, toUci(selected, p, promo)]);
      setSelected(null);
      setTargets([]);
      setCreated(null);
      setError("");
      return;
    }
    if (piece && piece.color === mover) {
      setSelected(p);
      setTargets(getValidMoves(shown, p, history));
    } else {
      setSelected(null);
      setTargets([]);
    }
  };

  const goSolution = () => {
    const problem = validatePosition(board, turn);
    if (problem) {
      setError(problem);
      return;
    }
    setError("");
    setMode("solution");
    setSelected(null);
    setTargets([]);
  };

  const create = () => {
    const problem = validatePosition(board, turn);
    if (problem) return setError(problem);
    if (solution.length === 0) return setError("Play the solution on the board first.");
    if (solution.length % 2 === 0) {
      return setError("The solution should end on the solver's move. Undo the last reply.");
    }
    const puzzle: Puzzle = { fen, solution, title: title.trim() || undefined };
    if (!describePuzzle(puzzle)) return setError("That puzzle doesn't replay cleanly.");
    setError("");
    setPreviewOk(true);
    setCreated(puzzle);
  };

  const info = created ? describePuzzle(created) : null;
  const link =
    created && typeof window !== "undefined"
      ? `${window.location.origin}/puzzle?${encodePuzzle(created)}`
      : "";

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <Link href="/" className={styles.logo}>
          Ch<em>3</em>ss
        </Link>
        <span className={styles.tag}>Puzzle maker</span>
      </header>

      <div className={styles.layout}>
        <div className={styles.boardCol}>
          <PuzzleBoard
            board={shown}
            flipped={flipped}
            selected={mode === "solution" ? selected : null}
            targets={mode === "solution" ? targets : []}
            lastMove={mode === "solution" ? lastMove : null}
            checkKing={checkKing}
            onSquare={mode === "setup" ? placePiece : recordMove}
          />
        </div>

        <aside className={styles.panel}>
          <div className={styles.tabs} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "setup"}
              className={`${styles.tab} ${mode === "setup" ? styles.tabOn : ""}`}
              onClick={() => setMode("setup")}
            >
              1. Set up
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "solution"}
              className={`${styles.tab} ${mode === "solution" ? styles.tabOn : ""}`}
              onClick={goSolution}
            >
              2. Solution
            </button>
          </div>

          {mode === "setup" ? (
            <>
              <p className={styles.note}>
                Pick a piece, then tap squares to place it. Tap again to remove.
              </p>
              <div className={styles.palette} role="toolbar" aria-label="Pieces">
                {PALETTE.map((p) => {
                  const on = tool && tool !== "erase" && tool.type === p.type && tool.color === p.color;
                  return (
                    <button
                      key={`${p.color}-${p.type}`}
                      type="button"
                      className={`${styles.swatch} ${on ? styles.swatchOn : ""}`}
                      aria-label={`${p.color} ${p.type.toLowerCase()}`}
                      aria-pressed={Boolean(on)}
                      onClick={() => setTool(p)}
                    >
                      <svg
                        viewBox="0 0 100 100"
                        dangerouslySetInnerHTML={{ __html: pieceMarkup(p.type, p.color) }}
                      />
                    </button>
                  );
                })}
              </div>
              <div className={styles.shareRow}>
                <button
                  type="button"
                  className={`${styles.btn} ${tool === "erase" ? styles.btnActive : ""}`}
                  onClick={() => setTool("erase")}
                >
                  Eraser
                </button>
                <button type="button" className={styles.btn} onClick={() => edit(() => setBoard(emptyBoard()))}>
                  Clear
                </button>
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => edit(() => setBoard(fenToBoard(START_FEN)!.board))}
                >
                  Start position
                </button>
              </div>
              <div className={styles.shareRow}>
                <button
                  type="button"
                  className={`${styles.btn} ${turn === "white" ? styles.btnActive : ""}`}
                  onClick={() => edit(() => { setTurn("white"); setFlipped(false); })}
                >
                  White to move
                </button>
                <button
                  type="button"
                  className={`${styles.btn} ${turn === "black" ? styles.btnActive : ""}`}
                  onClick={() => edit(() => { setTurn("black"); setFlipped(true); })}
                >
                  Black to move
                </button>
              </div>
              <p className={styles.note}>Castling counts as available if the king and rook are on their home squares.</p>
              <div className={styles.shareRow}>
                <button type="button" className={`${styles.btn} ${styles.btnInk}`} onClick={goSolution}>
                  Next: the solution →
                </button>
              </div>
            </>
          ) : (
            <>
              <p className={styles.note}>
                Play the winning line on the board: your move, then the reply, and so on. End on
                your own move.
              </p>
              <p className={styles.moves} aria-live="polite">
                {solution.length ? solution.join("  ") : "No moves yet."}
              </p>
              <div className={styles.shareRow}>
                <button
                  type="button"
                  className={styles.btn}
                  disabled={!solution.length}
                  onClick={() => {
                    setSolution(solution.slice(0, -1));
                    setSelected(null);
                    setTargets([]);
                    setCreated(null);
                  }}
                >
                  Undo
                </button>
                <button
                  type="button"
                  className={styles.btn}
                  disabled={!solution.length}
                  onClick={() => {
                    setSolution([]);
                    setSelected(null);
                    setTargets([]);
                    setCreated(null);
                  }}
                >
                  Reset
                </button>
              </div>
              <label className={styles.field}>
                <span className={styles.fieldLabel}>Title (optional)</span>
                <input
                  className={styles.input}
                  value={title}
                  maxLength={60}
                  placeholder="Back-rank surprise"
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setCreated(null);
                  }}
                />
              </label>
              <div className={styles.shareRow}>
                <button type="button" className={`${styles.btn} ${styles.btnInk}`} onClick={create}>
                  Create puzzle
                </button>
              </div>
            </>
          )}

          <div className={styles.shareRow}>
            <button type="button" className={styles.btn} onClick={() => setFlipped((f) => !f)}>
              Flip board
            </button>
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          {created && info && (
            <div data-testid="created">
              <h2 className={styles.h2}>Your puzzle · {goalText(info)}</h2>
              <input className={styles.linkBox} readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
              {previewOk && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className={styles.preview}
                  src={`/puzzle/og?${encodePuzzle(created)}`}
                  alt="How the puzzle looks when shared"
                  onError={() => setPreviewOk(false)}
                />
              )}
              <ShareTools puzzle={created} info={info} />
              <div className={styles.shareRow}>
                <Link className={styles.btn} href={`/puzzle?${encodePuzzle(created)}`}>
                  Try it yourself
                </Link>
              </div>
            </div>
          )}
        </aside>
      </div>
      {dialog}
    </main>
  );
};

export default PuzzleEditor;
