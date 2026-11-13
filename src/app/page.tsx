"use client";

import { GameState, GameStatus, Player } from "@/brain/types";
import Board from "@/components/Board";
import GameJoinForm from "@/components/GameJoinForm";
import ServerOffline from "@/components/ServerOffline";
import WaitingRoom from "@/components/WaitingRoom";
import { useEffect, useState } from "react";
import styles from "./page.module.css";
import {
  initializeSocket,
  getReconnectAttempts,
  getSocketState,
} from "@/lib/socket";

export default function Home() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [opponent, setOpponent] = useState<Player | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState<boolean>(false);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  // Seconds since we last had a working connection (0 while connected).
  const [downFor, setDownFor] = useState<number>(0);

  useEffect(() => {
    initializeSocket();

    // Poll the socket: it is replaced on every reconnect, so listening on one
    // instance would miss later changes.
    const sync = () => {
      const connected = getSocketState() === "OPEN";
      setIsSocketConnected(connected);
      setReconnectAttempts(getReconnectAttempts());
      setDownFor((prev) => (connected ? 0 : prev));
    };
    sync();
    const poll = setInterval(sync, 300);
    const clock = setInterval(() => {
      setDownFor((prev) => (getSocketState() === "OPEN" ? 0 : prev + 1));
    }, 1000);

    return () => {
      clearInterval(poll);
      clearInterval(clock);
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

  if (!isSocketConnected) {
    // Don't flash "offline" while the first connection is still being made or a
    // sleeping server is waking up.
    const phase = downFor < 6 ? "connecting" : downFor < 45 ? "waking" : "offline";
    return <ServerOffline reconnectAttempts={reconnectAttempts} phase={phase} />;
  }

  if (!game || !player) {
    return (
      <>
        <GameJoinForm setPlayer={setPlayer} setGame={setGame} />

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
      {game.status === GameStatus.WAITING_FOR_PLAYER && (
        <WaitingRoom gameId={game.gameId} playerName={player.name} />
      )}

      <Board
        player={player}
        opponent={opponent as Player}
        game={game}
        setGame={setGame}
        isGameReady={
          game.status === GameStatus.IN_PROGRESS &&
          Boolean(player) &&
          Boolean(opponent)
        }
      />
    </div>
  );
}
