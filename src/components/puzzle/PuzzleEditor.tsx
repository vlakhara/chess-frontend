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

  const toolLabel =
    tool === "erase"
      ? "Eraser. Tap a piece to remove it."
      : tool
      ? `Placing a ${tool.color} ${tool.type.toLowerCase()}. Tap a square.`
      : "Pick a piece, then tap a square.";

  const swatches = (color: "white" | "black") =>
    PALETTE.filter((p) => p.color === color).map((p) => {
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
          <svg viewBox="0 0 100 100" dangerouslySetInnerHTML={{ __html: pieceMarkup(p.type, p.color) }} />
        </button>
      );
    });

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
          <div className={styles.steps} role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "setup"}
              className={`${styles.step} ${mode === "setup" ? styles.stepOn : ""}`}
              onClick={() => setMode("setup")}
            >
              <i>1</i> Set up
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "solution"}
              className={`${styles.step} ${mode === "solution" ? styles.stepOn : ""}`}
              onClick={goSolution}
            >
              <i>2</i> Solution
            </button>
          </div>

          {mode === "setup" ? (
            <>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Pieces</h2>
                <p className={styles.placing}>{toolLabel}</p>
                <div className={styles.paletteRow}>
                  <span className={styles.rowLabel}>White</span>
                  <div className={styles.palette} role="toolbar" aria-label="White pieces">
                    {swatches("white")}
                  </div>
                </div>
                <div className={styles.paletteRow}>
                  <span className={styles.rowLabel}>Black</span>
                  <div className={styles.palette} role="toolbar" aria-label="Black pieces">
                    {swatches("black")}
                  </div>
                </div>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSm} ${tool === "erase" ? styles.btnActive : ""}`}
                  onClick={() => setTool("erase")}
                >
                  Eraser
                </button>
              </section>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Who moves first</h2>
                <div className={styles.seg} role="group" aria-label="Side to move">
                  <button
                    type="button"
                    className={`${styles.segBtn} ${turn === "white" ? styles.segOn : ""}`}
                    onClick={() => edit(() => { setTurn("white"); setFlipped(false); })}
                  >
                    <i className={styles.dotWhite} /> White
                  </button>
                  <button
                    type="button"
                    className={`${styles.segBtn} ${turn === "black" ? styles.segOn : ""}`}
                    onClick={() => edit(() => { setTurn("black"); setFlipped(true); })}
                  >
                    <i className={styles.dotBlack} /> Black
                  </button>
                </div>
              </section>

              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Board</h2>
                <div className={styles.row3}>
                  <button type="button" className={`${styles.btn} ${styles.btnSm}`} onClick={() => edit(() => setBoard(emptyBoard()))}>
                    Clear
                  </button>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSm}`}
                    onClick={() => edit(() => setBoard(fenToBoard(START_FEN)!.board))}
                  >
                    Start position
                  </button>
                  <button type="button" className={`${styles.btn} ${styles.btnSm}`} onClick={() => setFlipped((f) => !f)}>
                    Flip
                  </button>
                </div>
                <p className={styles.note}>
                  Castling counts as available when the king and rook are on their home squares.
                </p>
              </section>

              <button type="button" className={`${styles.btn} ${styles.btnInk} ${styles.btnFull}`} onClick={goSolution}>
                Next: record the solution →
              </button>
            </>
          ) : (
            <>
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Play the solution</h2>
                <p className={styles.note}>
                  <b>{mover === "white" ? "White" : "Black"} to play.</b> Make the winning move, then
                  the reply, and so on. Finish on the solver&apos;s move.
                </p>
                <div className={styles.moveList} aria-live="polite">
                  {solution.length === 0 && <span className={styles.noMoves}>No moves yet. Tap a piece on the board.</span>}
                  {solution.map((m, i) => (
                    <span key={`${i}-${m}`} className={`${styles.pill} ${i % 2 === 0 ? styles.pillSolver : styles.pillReply}`}>
                      <small>{i % 2 === 0 ? `${i / 2 + 1}.` : "↩"}</small> {m}
                    </span>
                  ))}
                </div>
                {solution.length > 0 && (
                  <p className={styles.legend}>
                    <i className={styles.pillSolver} /> solver <i className={styles.pillReply} /> reply
                  </p>
                )}
                <div className={styles.row3}>
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSm}`}
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
                    className={`${styles.btn} ${styles.btnSm}`}
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
                  <button type="button" className={`${styles.btn} ${styles.btnSm}`} onClick={() => setFlipped((f) => !f)}>
                    Flip
                  </button>
                </div>
              </section>

              <section className={styles.section}>
                <label className={styles.fieldLabel} htmlFor="puzzle-title">
                  Title <span className={styles.optional}>optional</span>
                </label>
                <input
                  id="puzzle-title"
                  className={styles.input}
                  value={title}
                  maxLength={60}
                  placeholder="Back-rank surprise"
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setCreated(null);
                  }}
                />
              </section>

              <button type="button" className={`${styles.btn} ${styles.btnInk} ${styles.btnFull}`} onClick={create}>
                Create puzzle
              </button>
            </>
          )}

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          {created && info && (
            <section className={`${styles.section} ${styles.created}`} data-testid="created">
              <h2 className={styles.sectionTitle}>Your puzzle is ready</h2>
              <p className={styles.createdGoal}>{goalText(info)}</p>
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
              <Link className={`${styles.btn} ${styles.btnFull}`} href={`/puzzle?${encodePuzzle(created)}`}>
                Try it yourself
              </Link>
            </section>
          )}
        </aside>
      </div>
      {dialog}
    </main>
  );
};

export default PuzzleEditor;
