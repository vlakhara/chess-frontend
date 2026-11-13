import React from "react";
import { CHARACTER_MAP, Piece } from "@/brain/types";
import styles from "@/styles/BoardLabel.module.css";

interface BoardLabelProps {
  text: string;
  position: "top-left" | "bottom-right";
  color: "white" | "black";
  active?: boolean;
  note?: string;
  /** Pieces this player has captured. */
  captured?: Piece[];
  /** Material advantage in points (0 hides it). */
  lead?: number;
}

const BoardLabel: React.FC<BoardLabelProps> = ({
  text,
  position,
  color,
  active,
  note,
  captured = [],
  lead = 0,
}) => {
  const className = `${styles.label} ${
    position === "top-left" ? styles.topLeft : styles.bottomRight
  } ${active ? styles.active : ""}`;

  return (
    <div className={className}>
      <span className={`${styles.dot} ${color === "white" ? styles.whiteDot : styles.blackDot}`} />
      <span className={styles.name}>{text}</span>
      {captured.length > 0 && (
        <span className={styles.captured} aria-label="Captured pieces">
          {captured.map((p, i) => (
            <span
              key={`${p.id}-${i}`}
              className={p.color === "white" ? styles.capWhite : styles.capBlack}
            >
              {CHARACTER_MAP[p.type].black}
            </span>
          ))}
          {lead > 0 && <b className={styles.lead}>+{lead}</b>}
        </span>
      )}
      {note && <span className={styles.note}>{note}</span>}
    </div>
  );
};

export default BoardLabel;
