"use client";

import { Move, PieceType } from "@/brain/types";
import React, { FC, useEffect, useRef } from "react";
import styles from "@/styles/History.module.css";

type Props = {
  history: Move[];
};

const notate = (move: Move) => {
  if (move.isCastle) return move.to.y === 2 ? "o-o-o" : "o-o";
  return `${move.piece.notation}${
    move.capturedPiece ? (move.piece.type === PieceType.PAWN ? "dx" : "x") : ""
  }${"abcdefgh".charAt(move.to.y)}${8 - move.to.x}`;
};

const History: FC<Props> = ({ history }) => {
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [history]);

  const rows: { no: number; white: string; black?: string }[] = [];
  history.forEach((move, i) => {
    if (i % 2 === 0) rows.push({ no: i / 2 + 1, white: notate(move) });
    else rows[rows.length - 1].black = notate(move);
  });

  return (
    <aside className={styles.panel} aria-label="Move history">
      <h3 className={styles.heading}>Moves</h3>
      <div className={styles.list} ref={historyRef}>
        {rows.length === 0 && <p className={styles.empty}>No moves yet.</p>}
        {rows.map((row) => (
          <div key={row.no} className={styles.row}>
            <span className={styles.no}>{row.no}.</span>
            <span>{row.white}</span>
            <span>{row.black ?? ""}</span>
          </div>
        ))}
      </div>
    </aside>
  );
};

export default History;
