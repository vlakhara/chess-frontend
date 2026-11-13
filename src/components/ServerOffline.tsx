import { useEffect, useState } from "react";
import styles from "./ServerOffline.module.css";
import { getSocketState } from "@/lib/socket";

interface ServerOfflineProps {
  reconnectAttempts: number;
}

export default function ServerOffline({
  reconnectAttempts,
}: ServerOfflineProps) {
  const [dots, setDots] = useState("");
  const [currentFact, setCurrentFact] = useState(0);
  const [countdown, setCountdown] = useState(30);
  const [socketState, setSocketState] = useState<string>("UNKNOWN");

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
    }, 10000);

    // Monitor socket state for debugging
    const socketStateInterval = setInterval(() => {
      const currentState = getSocketState();
      setSocketState(currentState);

      // Log if we see any unexpected state
      if (
        currentState !== "CLOSED" &&
        currentState !== "CONNECTING" &&
        currentState !== "OPEN"
      ) {
        console.warn("Unexpected socket state:", currentState);
      }
    }, 1000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(factInterval);
      clearInterval(socketStateInterval);
    };
  }, [chessFacts.length]);

  // Countdown timer for next reconnection attempt
  useEffect(() => {
    if (reconnectAttempts > 0) {
      setCountdown(30);
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 0) {
            return 30; // Reset to 30 when it reaches 0
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [reconnectAttempts]);

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

      <div className={styles.content}>
        <h1 className={styles.title}>Server is Offline</h1>

        <p className={styles.message}>Trying to reconnect{dots}</p>

        <div className={styles.status}>
          <div className={styles.statusDot}></div>
          <span>Server is not responding</span>
        </div>

        <div className={styles.reconnectInfo}>
          <div className={styles.countdown}>
            <span>Next attempt in: {countdown}s</span>
          </div>
          {/* Debug information - remove in production */}
          {process.env.NODE_ENV === "development" && (
            <div
              style={{
                fontSize: "12px",
                color: "#666",
                marginTop: "10px",
                fontFamily: "monospace",
              }}
            >
              Debug: Socket State: {socketState} | Attempts: {reconnectAttempts}
            </div>
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