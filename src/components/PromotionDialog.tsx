"use client";

import React, { useEffect } from "react";
import { PieceType } from "@/brain/types";
import styles from "@/styles/Dialog.module.css";

interface PromotionDialogProps {
  isOpen: boolean;
  color: "white" | "black";
  onChoose: (pieceType: PieceType) => void;
  onClose: () => void;
}

// Solid glyphs for both colours; colour comes from CSS.
const GLYPHS: Record<
  Exclude<PieceType, PieceType.KING | PieceType.PAWN>,
  { glyph: string; name: string }
> = {
  [PieceType.QUEEN]: { glyph: "♛", name: "Queen" },
  [PieceType.ROOK]: { glyph: "♜", name: "Rook" },
  [PieceType.BISHOP]: { glyph: "♝", name: "Bishop" },
  [PieceType.KNIGHT]: { glyph: "♞", name: "Knight" },
};

const PromotionDialog: React.FC<PromotionDialogProps> = ({
  isOpen,
  color,
  onChoose,
  onClose,
}) => {
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

  if (!isOpen) return null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-label="Choose promotion">
      <div className={`${styles.card} ${styles.promo}`} onClick={(e) => e.stopPropagation()}>
        <p className={styles.kicker}>Pawn made it across</p>
        <h2 className={styles.title}>
          Promote to <em>?</em>
        </h2>
        <div className={styles.choices}>
          {(
            [
              PieceType.QUEEN,
              PieceType.ROOK,
              PieceType.BISHOP,
              PieceType.KNIGHT,
            ] as const
          ).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChoose(type)}
              className={styles.choice}
              aria-label={GLYPHS[type].name}
              title={GLYPHS[type].name}
            >
              <span className={color === "white" ? styles.whiteGlyph : styles.blackGlyph}>
                {GLYPHS[type].glyph}
              </span>
              <small>{GLYPHS[type].name}</small>
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} className={styles.secondary}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default PromotionDialog;
