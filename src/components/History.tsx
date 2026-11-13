"use client";

import { getKing, isKingCheckMate, isKingInCheck, movePiece, promote } from "@/brain/move";
import { getInitialBoard } from "@/brain/board";
import { CHARACTER_MAP, Move, PieceType } from "@/brain/types";
import React, { FC, useEffect, useMemo, useRef, useState } from "react";
import styles from "@/styles/History.module.css";

type Props = {
  history: Move[];
  /** Opens the puzzle maker for this game. */
  onMakePuzzle?: () => void;
};

type Entry = {
  glyph: string;
  color: "white" | "black";
  san: string;
  from: string;
  to: string;
  captured?: string;
  capturedColor?: "white" | "black";
  tags: string[];
};

const square = (x: number, y: number) => `${"abcdefgh".charAt(y)}${8 - x}`;

// Replays the game so each move can be marked with check (+) and checkmate (#),
// and builds the full details: piece, from -> to, capture, castle, promotion.
const buildEntries = (history: Move[]): Entry[] => {
  let board = getInitialBoard();

  return history.map((move) => {
    const color = move.piece.color;
    const before = board;
    const isEnPassant =
      move.piece.type === PieceType.PAWN &&
      move.from.y !== move.to.y &&
      !before[move.to.x][move.to.y];

    let after = movePiece(before, move.from, move.to, true);
    if (move.isPromoted && move.promotedTo) {
      after = promote(after, move.promotedTo, move.to, color);
    }
    board = after;

    const enemy = color === "white" ? "black" : "white";
    let suffix = "";
    const king = getKing(after, enemy);
    if (king && isKingInCheck(after, king.position)) {
      suffix = isKingCheckMate(after, enemy) ? "#" : "+";
    }

    const from = square(move.from.x, move.from.y);
    const to = square(move.to.x, move.to.y);
    const captureMark = move.capturedPiece || isEnPassant ? "x" : "";
    const tags: string[] = [];

    let san: string;
    if (move.isCastle) {
      san = move.to.y === 2 ? "O-O-O" : "O-O";
      tags.push("castle");
    } else if (move.piece.type === PieceType.PAWN) {
      san = `${captureMark ? from.charAt(0) + "x" : ""}${to}`;
    } else {
      san = `${move.piece.notation}${captureMark}${to}`;
    }
    if (move.isPromoted && move.promotedTo) {
      san += `=${CHARACTER_MAP[move.promotedTo].notation}`;
      tags.push("promotion");
    }
    if (isEnPassant) tags.push("e.p.");
    san += suffix;

    return {
      glyph: CHARACTER_MAP[move.piece.type].black,
      color,
      san,
      from,
      to,
      captured: move.capturedPiece
        ? CHARACTER_MAP[move.capturedPiece.type].black
        : isEnPassant
        ? CHARACTER_MAP.PAWN.black
        : undefined,
      capturedColor: move.capturedPiece
        ? move.capturedPiece.color
        : isEnPassant
        ? enemy
        : undefined,
      tags,
    };
  });
};

const Cell: FC<{ entry?: Entry; latest: boolean }> = ({ entry, latest }) => {
  if (!entry) return <div className={styles.cell} />;
  return (
    <div className={`${styles.cell} ${latest ? styles.latest : ""}`}>
      <span className={entry.color === "white" ? styles.white : styles.black}>
        {entry.glyph}
      </span>
      <span className={styles.text}>
        <b>{entry.san}</b>
        <small>
          {entry.from}→{entry.to}
          {entry.captured && (
            <>
              {" "}
              <span
                className={entry.capturedColor === "white" ? styles.white : styles.black}
              >
                {entry.captured}
              </span>
            </>
          )}
          {entry.tags.length > 0 && ` ${entry.tags.join(" ")}`}
        </small>
      </span>
    </div>
  );
};

const History: FC<Props> = ({ history, onMakePuzzle }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const entries = useMemo(() => buildEntries(history), [history]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries, open]);

  const rows: { no: number; white: Entry; black?: Entry; whiteIdx: number }[] = [];
  entries.forEach((entry, i) => {
    if (i % 2 === 0) rows.push({ no: i / 2 + 1, white: entry, whiteIdx: i });
    else rows[rows.length - 1].black = entry;
  });

  return (
    <>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Moves <span>{entries.length}</span>
      </button>
      <aside
        className={`${styles.panel} ${open ? styles.open : ""}`}
        aria-label="Move history"
      >
        <h3 className={styles.heading}>
          Moves
          <button
            type="button"
            className={styles.close}
            onClick={() => setOpen(false)}
            aria-label="Close move list"
          >
            ×
          </button>
        </h3>
        <div className={styles.list} ref={listRef}>
          {rows.length === 0 && <p className={styles.empty}>No moves yet. White starts.</p>}
          {rows.map((row) => (
            <div key={row.no} className={styles.row}>
              <span className={styles.no}>{row.no}.</span>
              <Cell entry={row.white} latest={row.whiteIdx === entries.length - 1} />
              <Cell
                entry={row.black}
                latest={Boolean(row.black) && row.whiteIdx + 1 === entries.length - 1}
              />
            </div>
          ))}
        </div>
        {onMakePuzzle && (
          <button
            type="button"
            className={styles.puzzleBtn}
            onClick={onMakePuzzle}
            disabled={entries.length === 0}
          >
            ✎ Make a puzzle from this game
          </button>
        )}
      </aside>
    </>
  );
};

export default History;
