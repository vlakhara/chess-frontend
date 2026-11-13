import React from "react";
import styles from "@/styles/BoardLabel.module.css";

interface BoardLabelProps {
  text: string;
  position: "top-left" | "bottom-right";
  color: "white" | "black";
  active?: boolean;
  note?: string;
}

const BoardLabel: React.FC<BoardLabelProps> = ({ text, position, color, active, note }) => {
  const className = `${styles.label} ${
    position === "top-left" ? styles.topLeft : styles.bottomRight
  } ${active ? styles.active : ""}`;

  return (
    <div className={className}>
      <span className={`${styles.dot} ${color === "white" ? styles.whiteDot : styles.blackDot}`} />
      <span className={styles.name}>{text}</span>
      {note && <span className={styles.note}>{note}</span>}
    </div>
  );
};

export default BoardLabel;
