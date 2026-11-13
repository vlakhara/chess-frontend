"use client";

import { useState } from "react";
import styles from "@/styles/WaitingRoom.module.css";

interface WaitingRoomProps {
  gameId: string;
  playerName: string;
}

const WaitingRoom = ({ gameId, playerName }: WaitingRoomProps) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(gameId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy game ID:", err);
    }
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-live="polite" aria-label="Waiting for opponent">
      <div className={styles.card}>
        <div className={styles.pieces} aria-hidden="true">
          <span className={styles.white}>♞</span>
          <span className={styles.dots}>
            <i />
            <i />
            <i />
          </span>
          <span className={styles.black}>♞</span>
        </div>
        <h2 className={styles.title}>
          Waiting for your <em>opponent</em>
        </h2>
        <p className={styles.text}>
          Hi {playerName}. Send this code to a friend and the game starts as soon as they join.
        </p>
        <button type="button" className={styles.code} onClick={copy} title="Copy game code">
          <span>{gameId}</span>
          <small>{copied ? "Copied!" : "Tap to copy"}</small>
        </button>
        <p className={styles.hint}>You are playing white, so you move first.</p>
      </div>
    </div>
  );
};

export default WaitingRoom;
