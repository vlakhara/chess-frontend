"use client";

import { reconnectNow } from "@/lib/socket";
import styles from "@/styles/ConnectionPill.module.css";

interface ConnectionPillProps {
  connected: boolean;
  /** Seconds since the connection was last working. */
  downFor: number;
}

// A small, unobtrusive note instead of a full-screen dialog. The lobby and the
// board stay usable; actions are queued and sent once the connection is up.
const ConnectionPill = ({ connected, downFor }: ConnectionPillProps) => {
  // Stay quiet for the first few seconds of a normal connect.
  if (connected || downFor < 4) return null;

  const text =
    downFor < 45
      ? "Waking the server up…"
      : "Can't reach the server. Still trying…";

  return (
    <div className={styles.pill} role="status" aria-live="polite">
      <i />
      <span>{text}</span>
      {downFor >= 45 && (
        <button type="button" onClick={reconnectNow}>
          Retry
        </button>
      )}
    </div>
  );
};

export default ConnectionPill;
