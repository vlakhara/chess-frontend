"use client";

import { GameState, GameStatus, Player } from "@/brain/types";
import Board from "@/components/Board";
import GameJoinForm from "@/components/GameJoinForm";
import ConnectionPill from "@/components/ConnectionPill";
import WaitingRoom from "@/components/WaitingRoom";
import { useCallback, useEffect, useState } from "react";
import styles from "./page.module.css";
import {
  initializeSocket,
  getSocketState,
  onMessage,
  onOpen,
  sendMessage,
  SocketMessage,
} from "@/lib/socket";
import { clearSession, loadSession, saveSession } from "@/lib/session";
import { ClockState, TimeControl } from "@/lib/clock";
import { MovePayload, rebuildGame } from "@/lib/replay";

const UNTIMED: TimeControl = { base: 0, inc: 0 };

export default function Home() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [opponent, setOpponent] = useState<Player | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);
  // Seconds since we last had a working connection (0 while connected).
  const [downFor, setDownFor] = useState<number>(0);

  const [booting, setBooting] = useState(true);
  const [rejoining, setRejoining] = useState(false);
  const [lobbyNotice, setLobbyNotice] = useState("");
  const [timeControl, setTimeControl] = useState<TimeControl>(UNTIMED);
  const [clock, setClock] = useState<ClockState | null>(null);
  const [opponentAway, setOpponentAway] = useState(false);
  const [rematchOffered, setRematchOffered] = useState(false);
  const [opponentGone, setOpponentGone] = useState(false);
  const [boardKey, setBoardKey] = useState(0);

  const resetExtras = () => {
    setOpponentAway(false);
    setRematchOffered(false);
    setOpponentGone(false);
  };

  // Board calls this with null to go back to the lobby.
  const updateGame = useCallback((next: GameState | null) => {
    if (!next) {
      clearSession();
      setPlayer(null);
      setOpponent(null);
      setClock(null);
      setTimeControl(UNTIMED);
      setOpponentAway(false);
      setRematchOffered(false);
      setOpponentGone(false);
    }
    setGame(next);
  }, []);

  useEffect(() => {
    // An invite link for a different game means the visitor wants that one.
    const invited = new URLSearchParams(window.location.search).get("game");
    const stored = loadSession();
    if (stored && invited && invited.toUpperCase() !== stored.gameId) clearSession();
    setRejoining(Boolean(loadSession()));
    setBooting(false);

    const tryRejoin = () => {
      const session = loadSession();
      if (session) sendMessage("REJOIN", { gameId: session.gameId, token: session.token });
    };

    const handle = (data: SocketMessage) => {
      const p = (data.payload ?? {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
      if (p.clock) setClock({ ...p.clock, at: Date.now() });

      switch (data.type) {
        case "SELF_JOIN": {
          saveSession({ gameId: p.game.gameId, token: p.token });
          setTimeControl(p.timeControl ?? UNTIMED);
          resetExtras();
          setPlayer(p.player);
          setGame(p.game);
          setLobbyNotice("");
          break;
        }
        case "REJOINED": {
          const rebuilt = rebuildGame(p.game as GameState, (p.moves ?? []) as MovePayload[]);
          setTimeControl(p.timeControl ?? UNTIMED);
          setPlayer(p.player);
          setGame(rebuilt);
          setOpponentAway(Boolean(p.opponentAway));
          setRematchOffered(Boolean(p.rematchOffered));
          setOpponentGone(false);
          setRejoining(false);
          setLobbyNotice("");
          break;
        }
        case "REJOIN_FAILED": {
          if (loadSession()) {
            setLobbyNotice("That game has ended. Start a new one whenever you like.");
          }
          clearSession();
          setRejoining(false);
          setGame(null);
          setPlayer(null);
          setOpponent(null);
          setClock(null);
          resetExtras();
          break;
        }
        case "OPPONENT_AWAY":
          setOpponentAway(true);
          break;
        case "OPPONENT_BACK":
          setOpponentAway(false);
          break;
        case "REMATCH_OFFERED":
          setRematchOffered(true);
          break;
        case "OPPONENT_GONE":
          setOpponentGone(true);
          break;
        case "REMATCH_STARTED": {
          saveSession({ gameId: p.game.gameId, token: p.token });
          setTimeControl(p.timeControl ?? UNTIMED);
          resetExtras();
          setPlayer(p.player);
          setGame(p.game);
          setBoardKey((k) => k + 1);
          break;
        }
        case "OPPONENT_JOINED":
        case "OPPONENT_LEFT":
        case "OPPONENT_RESIGNED":
          setOpponentAway(false);
          break;
      }
    };

    const offMessage = onMessage(handle);
    const offOpen = onOpen(tryRejoin);
    initializeSocket();
    if (getSocketState() === "OPEN") tryRejoin();

    // Poll the socket: it is replaced on every reconnect, so listening on one
    // instance would miss later changes.
    const sync = () => {
      const connected = getSocketState() === "OPEN";
      setIsSocketConnected(connected);
      setDownFor((prev) => (connected ? 0 : prev));
    };
    sync();
    const poll = setInterval(sync, 300);
    const ticker = setInterval(() => {
      setDownFor((prev) => (getSocketState() === "OPEN" ? 0 : prev + 1));
    }, 1000);

    return () => {
      offMessage();
      offOpen();
      clearInterval(poll);
      clearInterval(ticker);
    };
  }, []);

  useEffect(() => {
    if (game && game.black && game.white) {
      if (player?.color === "white") {
        setOpponent(game.black as Player);
      } else {
        setOpponent(game.white as Player);
      }
    }
  }, [game, player]);

  const pill = <ConnectionPill connected={isSocketConnected} downFor={downFor} />;

  if (booting) return null;

  if (rejoining && (!game || !player)) {
    return (
      <>
        {pill}
        <div className={styles.rejoin} role="status" aria-live="polite">
          <div className={styles.rejoinCard}>
            <span className={styles.spinner} aria-hidden="true" />
            <h1>
              Getting you back <em>in</em>
            </h1>
            <p>Picking up your game where you left it.</p>
            <button
              type="button"
              onClick={() => {
                clearSession();
                setRejoining(false);
              }}
            >
              Start fresh instead
            </button>
          </div>
        </div>
      </>
    );
  }

  if (!game || !player) {
    return (
      <>
        {pill}
        <GameJoinForm notice={lobbyNotice} />

        <a
          className={styles.credit}
          href="https://github.com/vlakhara"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>Built by</span>
          <strong>Vipul Lakhara</strong>
        </a>
      </>
    );
  }

  return (
    <div className={styles.container}>
      {pill}
      {game.status === GameStatus.WAITING_FOR_PLAYER && (
        <WaitingRoom
          gameId={game.gameId}
          playerName={player.name}
          timeControl={timeControl}
          onCancel={() => {
            sendMessage("LEAVE", { gameId: game.gameId });
            updateGame(null);
          }}
        />
      )}

      <Board
        key={boardKey}
        player={player}
        opponent={opponent as Player}
        game={game}
        setGame={updateGame}
        timeControl={timeControl}
        clock={clock}
        opponentAway={opponentAway}
        rematchOffered={rematchOffered}
        opponentGone={opponentGone}
        isGameReady={
          game.status === GameStatus.IN_PROGRESS &&
          Boolean(player) &&
          Boolean(opponent)
        }
      />
    </div>
  );
}
