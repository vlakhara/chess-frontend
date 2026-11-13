"use client";

import { useMemo, useState } from "react";
import { getInitialBoard } from "@/brain/board";
import { Board, Move } from "@/brain/types";
import { replayMove } from "@/lib/replay";
import { boardToFen } from "@/lib/puzzle/fen";
import { encodePuzzle, toUci } from "@/lib/puzzle/puzzle";
import { boardSvg, svgDataUri } from "@/lib/puzzle/svg";
import dialog from "@/styles/Dialog.module.css";
import styles from "@/styles/Puzzle.module.css";

interface Props {
  history: Move[];
  onClose: () => void;
}

/** Pick a moment from the game and turn the moves that followed into a puzzle. */
const MakePuzzleDialog = ({ history, onClose }: Props) => {
  const boards = useMemo(() => {
    const list: Board[] = [getInitialBoard()];
    for (const m of history) {
      const r = replayMove(list[list.length - 1], {
        from: m.from,
        to: m.to,
        promotedTo: m.promotedTo,
        isCastle: m.isCastle,
      }, true);
      if (!r) break;
      list.push(r.after);
    }
    return list;
  }, [history]);

  const len = boards.length - 1;
  const [solverMoves, setSolverMoves] = useState(Math.min(2, Math.max(1, Math.ceil(len / 2))));
  const maxStart = Math.max(0, len - 1);
  const [start, setStart] = useState(Math.max(0, Math.min(maxStart, len - (2 * solverMoves - 1))));

  // Plies available after the chosen position; the line must end on the solver's move.
  const available = len - start;
  const plies = Math.min(2 * solverMoves - 1, available % 2 === 0 ? available - 1 : available);
  const turn = start % 2 === 0 ? "white" : "black";
  const fen = boardToFen(boards[start], turn);
  const solution = history.slice(start, start + Math.max(plies, 0)).map((m) => toUci(m.from, m.to, m.promotedTo));

  const open = () => {
    const url = `/puzzle/new?${encodePuzzle({ fen, solution })}`;
    window.open(url, "_blank", "noopener");
    onClose();
  };

  const img = svgDataUri(boardSvg(boards[start], { size: 300, flipped: turn === "black" }));

  return (
    <div className={dialog.backdrop} role="dialog" aria-label="Make a puzzle" onClick={onClose}>
      <div
        className={dialog.card}
        style={{ maxHeight: "94vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className={dialog.kicker}>Puzzle</p>
        <h2 className={dialog.title}>
          Turn this into a <em>puzzle</em>
        </h2>
        <p className={dialog.text}>
          Pick the position, and the moves that follow become the solution. You can still edit
          everything in the puzzle maker.
        </p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="Puzzle position" width={150} height={150} className={styles.dialogBoard} />

        <label className={styles.field}>
          <span className={styles.fieldLabel}>
            Position after move {start} · {turn === "white" ? "White" : "Black"} to move
          </span>
          <input
            type="range"
            min={0}
            max={maxStart}
            value={start}
            onChange={(e) => setStart(Number(e.target.value))}
            className={styles.range}
          />
        </label>

        <div className={styles.shareRow} style={{ justifyContent: "center" }}>
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              className={`${styles.btn} ${solverMoves === n ? styles.btnActive : ""}`}
              onClick={() => setSolverMoves(n)}
            >
              {n === 1 ? "1 move" : `${n} moves`}
            </button>
          ))}
        </div>

        <button
          type="button"
          className={dialog.button}
          onClick={open}
          disabled={solution.length === 0}
          style={{ marginTop: 14 }}
        >
          Open puzzle maker
        </button>
        <button type="button" className={dialog.secondary} onClick={onClose}>
          Not now
        </button>
      </div>
    </div>
  );
};

export default MakePuzzleDialog;
