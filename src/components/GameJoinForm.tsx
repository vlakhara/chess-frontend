"use client";

import { GameState, Player } from "@/brain/types";
import { SocketMessage, joinGame, onMessage } from "@/lib/socket";
import { FormEvent, useEffect, useState } from "react";
import styles from "@/styles/GameJoinForm.module.css";

interface GameJoinFormProps {
  setPlayer: (player: Player) => void;
  setGame: (game: GameState) => void;
}

type Mode = "create" | "join";

const GameJoinForm = ({ setPlayer, setGame }: GameJoinFormProps) => {
  const [mode, setMode] = useState<Mode>("create");
  const [username, setUsername] = useState("");
  const [gameId, setGameId] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Generate initial game ID on component mount
  useEffect(() => {
    generateGameId();
  }, []);

  useEffect(() => {
    const handleMessage = (data: SocketMessage) => {
      const { payload } = data;

      if (data.type === "SELF_JOIN" && payload) {
        const { game, player } = payload as { game: GameState; player: Player };
        setGame(game);
        setPlayer(player);
      }

      if (data.type === "ERROR") {
        const message = String(payload?.message ?? "Something went wrong");
        setError(message.endsWith(".") ? message : `${message}.`);
        setIsJoining(false);
      }
    };

    onMessage(handleMessage);

    return () => {
      // Note: In a real implementation, you might want to remove the message listener
      // but for simplicity, we'll keep it active
    };
  }, [setGame, setPlayer]);

  const generateGameId = () => {
    // Generate a random 8-character ID similar to the backend
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGameId(result);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError("");
    setCopied(false);
    if (next === "create") generateGameId();
    else setGameId("");
  };

  const copyGameId = async () => {
    if (!gameId) return;

    try {
      await navigator.clipboard.writeText(gameId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy game ID:", err);
    }
  };

  const handleJoinGame = (e: FormEvent) => {
    e.preventDefault();
    const name = username.trim();
    const id = gameId.trim().toUpperCase();

    if (!name || !id) {
      setError(
        mode === "create"
          ? "Pick a name to start a game."
          : "Enter your name and the game code your friend sent."
      );
      return;
    }

    setIsJoining(true);
    setError("");

    // Join the game
    joinGame(id, name);
  };

  return (
    <div className={styles.container}>
      <form className={styles.formCard} onSubmit={handleJoinGame} noValidate>
        <div className={styles.pieces} aria-hidden="true">
          <span className={styles.white}>♞</span>
          <span className={styles.black}>♞</span>
        </div>
        <h1 className={styles.title}>
          Ch<em>3</em>ss
        </h1>
        <p className={styles.subtitle}>Share a code. Play a friend. No sign-up.</p>

        <div className={styles.tabs} role="tablist" aria-label="Game mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "create"}
            className={`${styles.tab} ${mode === "create" ? styles.tabActive : ""}`}
            onClick={() => switchMode("create")}
          >
            New game
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "join"}
            className={`${styles.tab} ${mode === "join" ? styles.tabActive : ""}`}
            onClick={() => switchMode("join")}
          >
            Join a friend
          </button>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="username" className={styles.label}>
            Your name
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="What should we call you?"
            className={styles.input}
            maxLength={24}
            autoComplete="nickname"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="gameId" className={styles.label}>
            {mode === "create" ? "Your game code" : "Game code"}
          </label>
          <div className={styles.gameIdContainer}>
            <input
              id="gameId"
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value.toUpperCase())}
              placeholder={mode === "create" ? "Game code" : "Paste the code here"}
              className={`${styles.input} ${styles.codeInput}`}
              readOnly={mode === "create"}
              autoComplete="off"
              spellCheck={false}
            />
            {mode === "create" && (
              <>
                <button
                  onClick={generateGameId}
                  className={styles.iconButton}
                  type="button"
                  title="Generate a new code"
                  aria-label="Generate a new code"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M3 21v-5h5" />
                  </svg>
                </button>
                <button
                  onClick={copyGameId}
                  className={`${styles.iconButton} ${styles.copyButton} ${
                    copied ? styles.copied : ""
                  }`}
                  type="button"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </>
            )}
          </div>
          <p className={styles.help}>
            {mode === "create"
              ? "Send this code to a friend. You play white and move first."
              : "You will play black once you are in."}
          </p>
        </div>

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <button type="submit" disabled={isJoining} className={styles.button}>
          {isJoining ? "Joining..." : mode === "create" ? "Start game" : "Join game"}
        </button>
      </form>
    </div>
  );
};

export default GameJoinForm;
