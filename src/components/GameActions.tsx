"use client";

import styles from "@/styles/GameActions.module.css";

interface GameActionsProps {
  /** True while the game is being played (resign / draw make sense). */
  inProgress: boolean;
  drawState: "idle" | "offered";
  onOfferDraw: () => void;
  onResign: () => void;
  onExit: () => void;
}

const GameActions = ({
  inProgress,
  drawState,
  onOfferDraw,
  onResign,
  onExit,
}: GameActionsProps) => (
  <div className={styles.bar} role="toolbar" aria-label="Game actions">
    {inProgress && (
      <>
        <button
          type="button"
          className={styles.btn}
          onClick={onOfferDraw}
          disabled={drawState === "offered"}
          title="Offer your opponent a draw"
        >
          <span aria-hidden="true">½</span>
          {drawState === "offered" ? "Draw offered" : "Draw"}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.warn}`}
          onClick={onResign}
          title="Give up this game"
        >
          <span aria-hidden="true">⚑</span>
          Resign
        </button>
      </>
    )}
    <button type="button" className={styles.btn} onClick={onExit} title="Leave this game">
      <span aria-hidden="true">←</span>
      Exit
    </button>
  </div>
);

export default GameActions;
