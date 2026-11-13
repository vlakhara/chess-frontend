import { useEffect, useState } from "react";
import styles from "./ServerOffline.module.css";
import { reconnectNow } from "@/lib/socket";

interface ServerOfflineProps {
  reconnectAttempts: number;
  phase?: "connecting" | "waking" | "offline";
}

const COPY = {
  connecting: {
    title: "Connecting",
    message: "Setting up the board",
    status: "Connecting to the server",
  },
  waking: {
    title: "Waking the server up",
    message: "Free hosting naps when idle. This can take up to a minute",
    status: "Server is starting",
  },
  offline: {
    title: "Server is offline",
    message: "Still trying in the background",
    status: "Server is not responding",
  },
} as const;

export default function ServerOffline({
  reconnectAttempts,
  phase = "offline",
}: ServerOfflineProps) {
  const [dots, setDots] = useState("");
  const [currentFact, setCurrentFact] = useState(0);
  const copy = COPY[phase];

  const chessFacts = [
    "The longest chess game ever played lasted 269 moves!",
    "While you wait, why not practice some chess tactics?",
    "The queen is the most powerful piece, combining the moves of a rook and bishop!",
    "The shortest possible checkmate is just 2 moves (Fool&apos;s Mate)!",
    "Chess was invented in India around the 6th century AD",
    "The fastest checkmate in tournament play happened in just 3 moves!",
    "There are more possible chess games than atoms in the observable universe!",
    "The current chess piece design was created in the 19th century",
    "A pawn can become a queen if it reaches the opposite end of the board!",
    "The word &quot;checkmate&quot; comes from the Persian phrase &quot;shah mat&quot; meaning &quot;the king is dead&quot;",
    "The first chess computer program was written in 1950",
    "Magnus Carlsen became the youngest chess grandmaster at age 13!",
    "The knight is the only piece that can jump over other pieces",
    "Chess is considered a sport by the International Olympic Committee",
    "The longest chess move possible is 8 squares (queen or rook)",
    "Bobby Fischer was the first American to win the World Chess Championship",
    "The bishop can only move on squares of the same color",
    "Chess clocks were first used in tournament play in 1883",
    "The rook is named after the Persian word for &quot;chariot&quot;",
    "There are exactly 20 possible first moves in chess",
  ];

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    const factInterval = setInterval(() => {
      setCurrentFact((prev) => (prev + 1) % chessFacts.length);
    }, 8000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(factInterval);
    };
  }, [chessFacts.length]);

  return (
    <div className={styles.container}>
      <div className={styles.chessPiece}>
        <div className={styles.kingQueenContainer}>
          <div className={styles.blackKing}>
            <span className={styles.chessSymbol}>♚</span>
          </div>
          <div className={styles.whiteQueen}>
            <span className={styles.chessSymbol}>♛</span>
          </div>
        </div>
      </div>

      <div className={styles.content} role="status" aria-live="polite">
        <h1 className={styles.title}>{copy.title}</h1>

        <p className={styles.message}>
          {copy.message}
          {dots}
        </p>

        <div className={`${styles.status} ${phase === "offline" ? "" : styles.statusOk}`}>
          <div className={styles.statusDot}></div>
          <span>{copy.status}</span>
        </div>

        <div className={styles.reconnectInfo}>
          <div className={styles.countdown}>
            <span>
              {reconnectAttempts > 0 ? `Attempt ${reconnectAttempts}` : "First attempt"}
            </span>
          </div>
          {phase !== "connecting" && (
            <button type="button" className={styles.retry} onClick={reconnectNow}>
              Try again now
            </button>
          )}
        </div>
      </div>

      <div className={styles.funFacts}>
        <p key={currentFact} className={styles.factText}>
          💡 {chessFacts[currentFact]}
        </p>
      </div>
    </div>
  );
}
