"use client";

import { useState } from "react";
import { TimeControl, describeTimeControl } from "@/lib/clock";
import styles from "@/styles/WaitingRoom.module.css";

interface WaitingRoomProps {
  gameId: string;
  playerName: string;
  timeControl?: TimeControl;
  onCancel: () => void;
}

const WaitingRoom = ({ gameId, playerName, timeControl, onCancel }: WaitingRoomProps) => {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const inviteLink = () => `${window.location.origin}/?game=${gameId}`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink());
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy invite link:", err);
    }
  };

  const share = async () => {
    try {
      await navigator.share({
        title: "Play chess with me",
        text: `${playerName} invited you to a game of chess.`,
        url: inviteLink(),
      });
    } catch {
      /* the share sheet was dismissed */
    }
  };

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
        <div className={styles.invite}>
          <button type="button" className={styles.inviteBtn} onClick={copyLink}>
            {linkCopied ? "Link copied!" : "Copy invite link"}
          </button>
          {canShare && (
            <button type="button" className={styles.inviteBtn} onClick={share}>
              Share…
            </button>
          )}
        </div>
        <p className={styles.hint}>
          You are playing white, so you move first.
          {timeControl && timeControl.base > 0 && <> Time: {describeTimeControl(timeControl)}.</>}
        </p>
        <button type="button" className={styles.cancel} onClick={onCancel}>
          Cancel game
        </button>
      </div>
    </div>
  );
};

export default WaitingRoom;
