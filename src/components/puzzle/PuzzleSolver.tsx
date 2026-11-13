"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getKing, getValidMoves, isKingInCheck } from "@/brain/move";
import { Board, Move, PieceType, Position } from "@/brain/types";
import {
  Puzzle,
  applyMove,
  describePuzzle,
  goalText,
  needsPromotion,
  otherColor,
  parseUci,
  replayPuzzle,
  toUci,
} from "@/lib/puzzle/puzzle";
import Celebration from "@/components/Celebration";
import { usePromotionDialog } from "@/components/usePromotionDialog";
import PuzzleBoard from "./PuzzleBoard";
import ShareTools from "./ShareTools";
import styles from "@/styles/Puzzle.module.css";

type Status = "solving" | "solved" | "revealed";

const PuzzleSolver = ({ puzzle }: { puzzle: Puzzle }) => {
  const replay = useMemo(() => replayPuzzle(puzzle)!, [puzzle]);
  const info = useMemo(() => describePuzzle(puzzle)!, [puzzle]);
  const solverColor = replay.turn;
  const total = puzzle.solution.length;

  const [board, setBoard] = useState<Board>(replay.start);
  const [history, setHistory] = useState<Move[]>([]);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState<Status>("solving");
  const [selected, setSelected] = useState<Position | null>(null);
  const [targets, setTargets] = useState<Position[]>([]);
  const [hintLevel, setHintLevel] = useState(0);
  const [tries, setTries] = useState(0);
  const [message, setMessage] = useState("");
  const [shake, setShake] = useState(false);
  const [busy, setBusy] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const { askPromotion, dialog } = usePromotionDialog();

  const turn = step % 2 === 0 ? solverColor : otherColor(solverColor);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setBoard(replay.start);
    setHistory([]);
    setStep(0);
    setStatus("solving");
    setSelected(null);
    setTargets([]);
    setHintLevel(0);
    setMessage("");
    setBusy(false);
    setCelebrating(false);
  };

  // Plays one move of the stored line on the board.
  const playLine = (
    b: Board,
    h: Move[],
    i: number
  ): { board: Board; history: Move[] } | null => {
    const m = parseUci(puzzle.solution[i]);
    if (!m) return null;
    const played = applyMove(b, h, i % 2 === 0 ? solverColor : otherColor(solverColor), m.from, m.to, m.promo);
    return played ? { board: played.board, history: [...h, played.move] } : null;
  };

  const finish = (kind: Status) => {
    setStatus(kind);
    setBusy(false);
    if (kind === "solved") {
      setMessage("Solved!");
      setCelebrating(true);
    }
  };

  const handleSquare = async (p: Position) => {
    if (status !== "solving" || busy || turn !== solverColor) return;

    const piece = board[p.x][p.y];
    if (selected && targets.some((t) => t.x === p.x && t.y === p.y)) {
      let promo: PieceType | undefined;
      if (needsPromotion(board, selected, p)) {
        const choice = await askPromotion(solverColor);
        if (!choice) return;
        promo = choice;
      }
      const uci = toUci(selected, p, promo);
      const played = applyMove(board, history, solverColor, selected, p, promo);
      if (!played) return;

      const expected = puzzle.solution[step];
      const lastIndex = total - 1;
      const altMate =
        step === lastIndex &&
        lastIndex % 2 === 0 &&
        played.checkmate &&
        replay.plays[lastIndex].checkmate;
      const wanted = promo ? expected : expected.slice(0, 4);
      const isIt = uci === expected || (!promo && uci === wanted) || altMate;

      setSelected(null);
      setTargets([]);
      if (!isIt) {
        setTries((t) => t + 1);
        setShake(true);
        setMessage("Not that one. Try again.");
        later(() => setShake(false), 450);
        return;
      }

      const nextHistory = [...history, played.move];
      setBoard(played.board);
      setHistory(nextHistory);
      setHintLevel(0);
      setStep(step + 1);

      if (step + 1 >= total || altMate) {
        finish("solved");
        return;
      }
      setMessage("Good move.");
      setBusy(true);
      later(() => {
        const reply = playLine(played.board, nextHistory, step + 1);
        if (!reply) return;
        setBoard(reply.board);
        setHistory(reply.history);
        setStep(step + 2);
        setMessage("Your move.");
        setBusy(false);
      }, 550);
      return;
    }

    if (piece && piece.color === solverColor) {
      setSelected(p);
      setTargets(getValidMoves(board, p, history));
      setMessage("");
    } else {
      setSelected(null);
      setTargets([]);
    }
  };

  const reveal = () => {
    if (status !== "solving") return;
    setStatus("revealed");
    setBusy(true);
    setSelected(null);
    setTargets([]);
    setMessage("Here is the solution.");
    let b = board;
    let h = history;
    for (let i = step; i < total; i++) {
      const at = (i - step + 1) * 800;
      later(() => {
        const next = playLine(b, h, i);
        if (!next) return;
        b = next.board;
        h = next.history;
        setBoard(next.board);
        setHistory(next.history);
        setStep(i + 1);
        if (i === total - 1) {
          setBusy(false);
          setMessage("That was the line.");
        }
      }, at);
    }
  };

  const hintSquares: Position[] = [];
  if (hintLevel > 0 && status === "solving" && turn === solverColor) {
    const m = parseUci(puzzle.solution[step]);
    if (m) {
      hintSquares.push(m.from);
      if (hintLevel > 1) hintSquares.push(m.to);
    }
  }

  const king = getKing(board, turn);
  const checkKing = king && isKingInCheck(board, king.position) ? king.position : null;
  const lastMove = history.length
    ? { from: history[history.length - 1].from, to: history[history.length - 1].to }
    : null;

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <Link href="/" className={styles.logo}>
          Ch<em>3</em>ss
        </Link>
        <span className={styles.tag}>Puzzle</span>
      </header>

      <div className={styles.layout}>
        <div className={styles.boardCol}>
          <PuzzleBoard
            board={board}
            flipped={solverColor === "black"}
            selected={selected}
            targets={targets}
            lastMove={lastMove}
            hint={hintSquares}
            checkKing={checkKing}
            shake={shake}
            onSquare={handleSquare}
          />
        </div>

        <aside className={styles.panel}>
          {puzzle.title && <p className={styles.puzzleTitle}>{puzzle.title}</p>}
          <h1 className={styles.goal}>{goalText(info)}</h1>
          <p className={styles.sub}>
            {info.solverMoves > 1 ? `${info.solverMoves} moves to find.` : "One move to find."}
            {tries > 0 && status === "solving" && ` Wrong tries: ${tries}.`}
          </p>

          <p
            className={`${styles.status} ${
              status === "solved" ? styles.good : message.startsWith("Not") ? styles.bad : ""
            }`}
            role="status"
          >
            {message || (turn === solverColor ? `${solverColor === "white" ? "White" : "Black"} to play.` : "")}
          </p>

          {status === "solving" && (
            <div className={styles.shareRow}>
              <button
                type="button"
                className={styles.btn}
                onClick={() => setHintLevel((l) => Math.min(2, l + 1))}
                disabled={busy || hintLevel >= 2}
              >
                {hintLevel === 0 ? "Hint" : hintLevel === 1 ? "Show square" : "Hint shown"}
              </button>
              <button type="button" className={styles.btn} onClick={reveal} disabled={busy}>
                Show solution
              </button>
              <button type="button" className={styles.btn} onClick={reset} disabled={busy}>
                Restart
              </button>
            </div>
          )}

          {status !== "solving" && (
            <>
              <div className={styles.result}>
                <p>
                  {status === "solved"
                    ? tries === 0
                      ? "Clean solve, first try."
                      : `Solved after ${tries} wrong ${tries === 1 ? "try" : "tries"}.`
                    : "Better luck on the next one."}
                </p>
              </div>
              <h2 className={styles.h2}>Share it</h2>
              <ShareTools puzzle={puzzle} info={info} />
              <div className={styles.shareRow}>
                <button type="button" className={styles.btn} onClick={reset} disabled={busy}>
                  Play again
                </button>
                <Link className={styles.btn} href="/puzzle/new">
                  Make your own
                </Link>
              </div>
            </>
          )}

          <Link href="/" className={styles.back}>
            ← Play a game of Ch3ss
          </Link>
        </aside>
      </div>
      {dialog}
      {celebrating && <Celebration onDone={() => setCelebrating(false)} />}
    </main>
  );
};

export default PuzzleSolver;
