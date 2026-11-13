import React from "react";
import { Piece, Position } from "@/brain/types";
import { CHARACTER_MAP } from "@/brain/types";
import styles from "@/styles/BoardSquare.module.css";

interface BoardSquareProps {
  piece: Piece | null;
  position: Position;
  isCheckMate: boolean;
  isActive: boolean;
  getSquareColor: (position: Position) => string;
  onClick: (position: Position) => void;
  playerColor: "white" | "black";
  isTarget?: boolean;
  isCapture?: boolean;
  isSelected?: boolean;
  isLastTo?: boolean;
  isCheckKing?: boolean;
  isLight?: boolean;
  rank?: number | null;
  file?: string | null;
  canDrag?: boolean;
  onDragStart?: (position: Position) => void;
  onDrop?: (position: Position) => void;
}

const BoardSquare: React.FC<BoardSquareProps> = ({
  piece,
  position,
  isCheckMate,
  isActive,
  getSquareColor,
  onClick,
  playerColor,
  isTarget,
  isCapture,
  isSelected,
  isLastTo,
  isCheckKing,
  isLight,
  rank,
  file,
  canDrag,
  onDragStart,
  onDrop,
}) => {
  const pieceClassName = [
    styles.piece,
    piece?.color === "white" ? styles.whitePiece : styles.blackPiece,
    isActive ? styles.active : "",
    isCheckMate && piece?.color ? styles.checkmate : "",
    isLastTo ? styles.justMoved : "",
    canDrag ? styles.draggable : "",
  ]
    .filter(Boolean)
    .join(" ");

  const squareClassName = [
    styles.square,
    isLight ? styles.light : styles.dark,
    isSelected ? styles.selected : "",
    isTarget ? (isCapture ? styles.capture : styles.target) : "",
    isCheckKing ? styles.checkKing : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={squareClassName}
      style={{
        backgroundColor: getSquareColor(position),
        transform: playerColor === "black" ? "rotate(180deg)" : "none",
      }}
      onClick={() => onClick(position)}
      onDragOver={(e) => {
        if (isTarget) e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop?.(position);
      }}
    >
      {rank != null && <span className={styles.rank}>{rank}</span>}
      {file != null && <span className={styles.file}>{file}</span>}
      {/* Both colours use the solid glyphs; the colour is applied in CSS so
          white pieces stay readable on light squares. */}
      <p
        className={pieceClassName}
        draggable={canDrag}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", "");
          onDragStart?.(position);
        }}
      >
        {piece && CHARACTER_MAP[piece.type].black}
      </p>
    </div>
  );
};

export default BoardSquare;
