"use client";

import { GameStatus } from "@/brain/types";
import { useEffect, type ReactNode } from "react";
import styles from "@/styles/Dialog.module.css";

interface WinnerDialogProps {
  winner: "white" | "black" | null;
  isOpen: boolean;
  onClose: () => void;
  isStalemate?: boolean;
  reason: GameStatus;
  playerColor: "white" | "black";
  opponentName?: string;
}

const WinnerDialog = ({
  winner,
  isOpen,
  onClose,
  isStalemate,
  reason,
  playerColor,
  opponentName,
}: WinnerDialogProps) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || (!winner && !isStalemate)) return null;

  const opponent = opponentName || "Your opponent";

  let tone: "win" | "lose" | "draw";
  let kicker: string;
  let title: ReactNode;
  let text: string;
  let glyph: string;

  if (isStalemate && !winner) {
    tone = "draw";
    kicker = "Stalemate";
    title = (
      <>
        It&apos;s a <em>draw</em>
      </>
    );
    text = "No legal moves are left, and the king is not in check. Nobody wins this one.";
    glyph = "♚";
  } else if (winner === playerColor) {
    tone = "win";
    kicker = reason === GameStatus.RESIGNED ? "Opponent left" : "Checkmate";
    title = (
      <>
        You <em>won!</em>
      </>
    );
    text =
      reason === GameStatus.RESIGNED
        ? `${opponent} left the game, so the win is yours.`
        : `Checkmate. ${opponent} has nowhere left to run.`;
    glyph = "♚";
  } else {
    tone = "lose";
    kicker = reason === GameStatus.RESIGNED ? "You left" : "Checkmate";
    title = (
      <>
        You <em>lost</em>
      </>
    );
    text =
      reason === GameStatus.RESIGNED
        ? "You left the game, so it counts as a loss."
        : `Checkmate. ${opponent} got you this time. Time for a rematch?`;
    glyph = "♚";
  }

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-live="assertive" aria-label={kicker}>
      <div
        className={`${styles.card} ${styles[tone]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.badge} aria-hidden="true">
          {glyph}
        </div>
        <p className={styles.kicker}>{kicker}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.text}>{text}</p>
        <button type="button" onClick={onClose} className={styles.button} autoFocus>
          Back to lobby
        </button>
      </div>
    </div>
  );
};

export default WinnerDialog;
