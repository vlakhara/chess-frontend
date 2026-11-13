"use client";

import { SocketMessage, joinGame, onMessage } from "@/lib/socket";
import { TIME_CONTROLS, TimeControl } from "@/lib/clock";
import { FormEvent, useEffect, useState } from "react";
import styles from "@/styles/GameJoinForm.module.css";

interface GameJoinFormProps {
  /** A message to show above the form (for example, "that game has ended"). */
  notice?: string;
}

type Mode = "create" | "join";

const GameJoinForm = ({ notice = "" }: GameJoinFormProps) => {
  const [mode, setMode] = useState<Mode>("create");
  const [username, setUsername] = useState("");
  const [gameId, setGameId] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [timeIndex, setTimeIndex] = useState(3); // 10 | 0
  const [invited, setInvited] = useState(false);

  // Generate initial game ID on component mount, or pick up an invite link
  // (?game=CODE) so a friend only has to type a name.
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("game");
    if (code) {
      setMode("join");
      setGameId(code.trim().toUpperCase().slice(0, 12));
      setInvited(true);
    } else {
      generateGameId();
    }
  }, []);

  useEffect(() => {
    const handleMessage = (data: SocketMessage) => {
      if (data.type === "ERROR") {
        const message = String(data.payload?.message ?? "Something went wrong");
        setError(message.endsWith(".") ? message : `${message}.`);
        setIsJoining(false);
      }
    };

    return onMessage(handleMessage);
  }, []);

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
    setInvited(false);
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

    // Leave the invite code out of the address bar once we are in.
    try {
      window.history.replaceState(null, "", window.location.pathname);
    } catch {
      /* not important */
    }

    const timeControl: TimeControl | undefined =
      mode === "create" ? TIME_CONTROLS[timeIndex].value : undefined;
    joinGame(id, name, timeControl);
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

        {notice && (
          <div className={styles.notice} role="status">
            {notice}
          </div>
        )}
        {invited && (
          <div className={styles.notice} role="status">
            You have been invited to a game. Add your name and jump in.
          </div>
        )}

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
            autoFocus={invited}
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

        {mode === "create" && (
          <div className={styles.formGroup}>
            <span className={styles.label} id="time-label">
              Time control
            </span>
            <div className={styles.chips} role="radiogroup" aria-labelledby="time-label">
              {TIME_CONTROLS.map((tc, i) => (
                <button
                  key={tc.label}
                  type="button"
                  role="radio"
                  aria-checked={timeIndex === i}
                  title={tc.hint}
                  className={`${styles.chip} ${timeIndex === i ? styles.chipActive : ""}`}
                  onClick={() => setTimeIndex(i)}
                >
                  {tc.label}
                </button>
              ))}
            </div>
            <p className={styles.help}>
              {TIME_CONTROLS[timeIndex].value.base === 0
                ? "No clock. Think as long as you like."
                : "Minutes | seconds added per move. Clocks start after both sides have moved."}
            </p>
          </div>
        )}

        {error && (
          <div className={styles.error} role="alert">
            {error}
          </div>
        )}

        <button type="submit" disabled={isJoining} className={styles.button}>
          {isJoining ? "Joining..." : mode === "create" ? "Start game" : "Join game"}
        </button>

        <a className={styles.puzzleLink} href="/puzzle/new">
          <span aria-hidden="true">♞</span>
          <span>
            <b>Make a puzzle</b>
            <small>Set up any position and share it as a link or image</small>
          </span>
        </a>
      </form>
    </div>
  );
};

export default GameJoinForm;
