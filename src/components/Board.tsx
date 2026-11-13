"use client";

import {
  getKing,
  getValidMoves,
  isAnyMoveLeft,
  isKingCheckMate,
  isKingInCheck,
  movePiece,
  promote,
} from "@/brain/move";
import {
  Board as BoardType,
  GameState,
  GameStatus,
  Move,
  Piece,
  PieceType,
  Player,
  Position,
} from "@/brain/types";
import confetti from "canvas-confetti";
import { useEffect, useState } from "react";
import History from "./History";
import { usePromotionDialog } from "./usePromotionDialog";
import WinnerDialog from "./WinnerDialog";
import { onMessage, sendMessage, SocketMessage } from "@/lib/socket";
import BoardLabel from "./BoardLabel";
import BoardSquare from "./BoardSquare";
import styles from "@/styles/Board.module.css";

interface BoardProps {
  player: Player;
  opponent: Player;
  isGameReady?: boolean;
  game: GameState;
  setGame: (game: GameState | null) => void;
}

const Board = ({
  player,
  opponent,
  isGameReady = true,
  game,
  setGame,
}: BoardProps) => {
  const [board, setBoard] = useState<BoardType>([]);
  const [turn, setTurn] = useState<"white" | "black">(player.color);
  const [activePiece, setActivePiece] = useState<Piece | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(
    null
  );
  const [moves, setMoves] = useState<Position[]>([]);
  const [history, setHistory] = useState<Move[]>([]);
  const [isCheck, setIsCheck] = useState<boolean>(false);
  const [isCheckMate, setIsCheckMate] = useState<boolean>(false);
  const [winner, setWinner] = useState<"white" | "black" | null>(null);
  const [showWinnerDialog, setShowWinnerDialog] = useState(false);
  const [isStalemate, setIsStalemate] = useState(false);
  const { askPromotion, dialog: promotionDialog } = usePromotionDialog();

  useEffect(() => {
    if (game.board) {
      setBoard(game.board.pieces);
    }
    if (game.currentTurn) {
      setTurn(game.currentTurn.color);
    }
    if (game.history) {
      setHistory(game.history.moves);
    }
    if (game.winner) {
      setWinner(game.winner.color);
    }
    setIsCheck(game.check);
    setIsCheckMate(game.checkmate);
    setIsStalemate(game.stalemate);

    if (game.winner) {
      setShowWinnerDialog(true);
      // Only celebrate if you are the one who won.
      if (game.winner.color === player.color) {
        setTimeout(() => {
          handleClick();
        }, 100);
      }
    }
  }, [game]);

  const handleSquareClick = async (position: Position) => {
    if (!isGameReady || player.color !== turn) {
      return;
    }

    const { x, y } = position;
    if (selectedPosition?.x === x && selectedPosition?.y === y) {
      setSelectedPosition(null);
      setActivePiece(null);
      setMoves([]);
      return;
    }

    const piece = board[x][y];

    const isHighlightedSquare = moves.find(
      (move) => move.x === x && move.y === y
    );

    if (isHighlightedSquare) {
      if (!activePiece || !selectedPosition) return;

      let _board = movePiece(board, selectedPosition, position);
      let choice = null;
      let isCheck = false;
      let isCheckMate = false;
      let winner = null;
      let isStalemate = false;
      const nextTurn = turn === "white" ? "black" : "white";
      const kingPiece = getKing(board, nextTurn);
      const capturedPiece = board[position.x][position.y];
      const _history: Move = {
        from: selectedPosition,
        to: position,
        piece: activePiece,
        capturedPiece: capturedPiece,
      };

      if (
        activePiece.type === PieceType.PAWN &&
        ((activePiece.color === "white" && position.x === 0) ||
          (activePiece.color === "black" && position.x === 7))
      ) {
        choice = await askPromotion(activePiece.color);
      }

      if (choice) {
        _board = promote(_board, choice, position, activePiece.color);
      }

      if (choice) {
        _history.isPromoted = Boolean(choice);
        _history.promotedTo = choice;
      }

      if (
        activePiece.type === PieceType.KING &&
        Math.abs(position.y - selectedPosition.y) === 2
      ) {
        _history.isCastle = true;
      }

      if (kingPiece?.piece && kingPiece?.position) {
        isCheck = isKingInCheck(_board, kingPiece?.position);
      }

      if (isCheck) {
        setIsCheck(isCheck);
        isCheckMate = isKingCheckMate(_board, nextTurn);
      } else {
        if (!isAnyMoveLeft(_board, nextTurn)) {
          isStalemate = true;
        }
      }

      if (isCheckMate) {
        winner = turn;
        setTimeout(() => {
          handleClick();
        }, 100);
      }

      // The mover's copy of the game must carry the final status too,
      // otherwise the winner never sees "You won" (only the opponent got it
      // back from the server).
      let status = game.status;
      if (isCheckMate) status = GameStatus.CHECKMATE;
      else if (isStalemate) status = GameStatus.STALEMATE;

      if (winner) {
        setShowWinnerDialog(true);
      }
      if (isStalemate) {
        setShowWinnerDialog(true);
      }

      const _game: GameState = {
        ...game,
        history: {
          moves: [...game.history.moves, _history],
          lastMove: _history,
        },
        board: { pieces: _board },
        status,
        currentTurn: nextTurn === player.color ? player : opponent,
        winner: winner ? game.currentTurn : null,
        check: isCheck,
        checkmate: isCheckMate,
        stalemate: isStalemate,
      };

      setGame(_game);
      sendMessage("MOVE", {
        game: _game,
      });
      resetStates();
    } else if (piece && piece.color === turn) {
      setActivePiece(piece);
      setSelectedPosition(position);
      const moves = getValidMoves(board, position, history);
      setMoves(moves);
    } else {
      resetStates();
    }
  };

  const resetStates = () => {
    setActivePiece(null);
    setSelectedPosition(null);
    setMoves([]);
  };

  const resetBoard = () => {
    resetStates();
    setIsCheck(false);
    setIsCheckMate(false);
    setWinner(null);
    setShowWinnerDialog(false);
    setHistory([]);
    setTurn("white");
    setIsStalemate(false);
    setBoard([]);
    setGame(null);
  };

  const getSquareColor = (position: Position) => {
    const { x, y } = position;
    const piece = board[x][y];
    const isKing = piece?.type === PieceType.KING;

    if (isCheck && isKing && piece.color === turn) {
      return "#8E1616";
    }

    const isHighlight = moves.find((move) => move.x === x && move.y === y);
    if (isHighlight) return "#f6b800";

    const last = history[history.length - 1];
    const isLastMove =
      last &&
      ((last.from.x === x && last.from.y === y) ||
        (last.to.x === x && last.to.y === y));
    if (isLastMove) return (x + y) % 2 === 0 ? "#f0cf7a" : "#e3a95a";

    return (x + y) % 2 === 0 ? "#f3e5c4" : "#d98b4d";
  };

  const handleClick = () => {
    const end = Date.now() + 3 * 1000;
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];

    const frame = () => {
      if (Date.now() > end) return;

      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        startVelocity: 60,
        origin: { x: 0, y: 0.5 },
        colors: colors,
        zIndex: 9999, // Ensure confetti appears above dialog
      });

      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        startVelocity: 60,
        origin: { x: 1, y: 0.5 },
        colors: colors,
        zIndex: 9999, // Ensure confetti appears above dialog
      });

      requestAnimationFrame(frame);
    };

    frame();
  };

  useEffect(() => {
    const handleMessage = (data: SocketMessage) => {
      const { payload } = data;

      if (data.type === "MOVED" && payload) {
        const { game } = payload as { game: GameState };
        setGame(game);
      }

      if (data.type === "OPPONENT_JOINED" && payload) {
        const { game } = payload as { game: GameState };
        setGame(game);
      }
    };

    onMessage(handleMessage);

    return () => {
      // offMessage(handleMessage);
    };
  }, [setGame]);

  return (
    <div className={styles.container}>
      <div className={styles.boardWrapper}>
        {/* Opponent name - top left, outside board */}
        <BoardLabel
          text={opponent ? opponent.name : "Waiting for opponent..."}
          position="top-left"
          color={opponent?.color ?? (player.color === "white" ? "black" : "white")}
          active={isGameReady && turn !== player.color}
          note={isGameReady && turn !== player.color ? "thinking" : undefined}
        />
        {/* Player name - bottom right, outside board */}
        <BoardLabel
          text={`${player.name} (you)`}
          position="bottom-right"
          color={player.color}
          active={isGameReady && turn === player.color}
          note={
            isGameReady && turn === player.color
              ? isCheck
                ? "you're in check"
                : "your move"
              : undefined
          }
        />
        <div
          className={styles.chessBoard}
          style={{
            transform: player.color === "black" ? "rotate(180deg)" : "none",
          }}
        >
          {/* Chess board squares */}
          {board.map((row, x) =>
            row.map((piece, y) => (
              <BoardSquare
                key={`${x}-${y}`}
                piece={piece}
                position={{ x, y }}
                isCheckMate={isCheckMate && piece?.color === turn}
                isActive={activePiece?.id === piece?.id}
                getSquareColor={getSquareColor}
                onClick={handleSquareClick}
                playerColor={player.color}
              />
            ))
          )}
        </div>
      </div>
      <div className={styles.hideOnMobile}>
        <History history={history} />
      </div>
      <WinnerDialog
        winner={winner}
        isOpen={showWinnerDialog}
        onClose={resetBoard}
        reason={game.status}
        isStalemate={isStalemate}
        playerColor={player.color}
        opponentName={opponent?.name}
      />
      {promotionDialog}
    </div>
  );
};

export default Board;
