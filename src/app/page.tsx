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
  const [socketState, setSocketState] = useState<string>("UNKNOWN");

  useEffect(() => {
    const socket = initializeSocket();

    if (socket) {
      const currentState = getSocketState();
      setSocketState(currentState);
      setIsSocketConnected(socket.readyState === WebSocket.OPEN);

      // Add event listeners for connection state changes
      const handleOpen = () => {
        console.log("Socket connected");
        setIsSocketConnected(true);
        setSocketState("OPEN");
        setReconnectAttempts(0);
      };

      const handleClose = () => {
        console.log("Socket disconnected");
        setIsSocketConnected(false);
        setSocketState("CLOSED");
      };

      const handleError = (error: Event) => {
        console.error("Socket error:", error);
        setIsSocketConnected(false);
        setSocketState("ERROR");
      };

      socket.addEventListener("open", handleOpen);
      socket.addEventListener("close", handleClose);
      socket.addEventListener("error", handleError);

      // If socket is already open, set connected state
      if (socket.readyState === WebSocket.OPEN) {
        setIsSocketConnected(true);
        setSocketState("OPEN");
      } else if (socket.readyState === WebSocket.CONNECTING) {
        // Socket is connecting, show as connected to avoid "server offline" message
        setIsSocketConnected(true);
        setSocketState("CONNECTING");
      }

      // Cleanup function
      return () => {
        socket.removeEventListener("open", handleOpen);
        socket.removeEventListener("close", handleClose);
        socket.removeEventListener("error", handleError);
      };
    } else {
      setIsSocketConnected(false);
      setSocketState("NULL");
    }
  }, []);

  // Monitor reconnection attempts and socket state
  useEffect(() => {
    const interval = setInterval(() => {
      setReconnectAttempts(getReconnectAttempts());
      const currentState = getSocketState();
      setSocketState(currentState);

      // Update connection status based on current state
      if (currentState === "OPEN") {
        setIsSocketConnected(true);
      } else if (currentState === "CLOSED" || currentState === "ERROR") {
        setIsSocketConnected(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Debug logging for socket state changes
  useEffect(() => {
    console.log("Socket state changed to:", socketState);
  }, [socketState]);

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
    return <ServerOffline reconnectAttempts={reconnectAttempts} />;
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
