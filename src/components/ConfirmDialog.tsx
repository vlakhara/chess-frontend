"use client";

import type { ReactNode } from "react";
import styles from "@/styles/Dialog.module.css";

interface ConfirmDialogProps {
  kicker: string;
  title: ReactNode;
  text: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({
  kicker,
  title,
  text,
  confirmLabel,
  cancelLabel = "Cancel",
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => (
  <div className={styles.backdrop} onClick={onCancel} role="dialog" aria-label={kicker}>
    <div className={`${styles.card} ${styles.confirm}`} onClick={(e) => e.stopPropagation()}>
      <p className={styles.kicker}>{kicker}</p>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.text}>{text}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={`${styles.button} ${danger ? styles.danger : ""}`}
          onClick={onConfirm}
          autoFocus
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

export default ConfirmDialog;
