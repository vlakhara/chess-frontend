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
import Celebration from "./Celebration";
import { useEffect, useRef, useState } from "react";
import History from "./History";
import { usePromotionDialog } from "./usePromotionDialog";
import WinnerDialog from "./WinnerDialog";
import GameActions from "./GameActions";
import ConfirmDialog from "./ConfirmDialog";
import { getLatency, onMessage, sendMessage, SocketMessage } from "@/lib/socket";
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
  const [latency, setLatency] = useState<number | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const celebratingRef = useRef(false);
  const [drawState, setDrawState] = useState<"idle" | "offered">("idle");
  const [incomingDraw, setIncomingDraw] = useState(false);
  const [confirm, setConfirm] = useState<"resign" | "exit" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const showNotice = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 3500);
  };

  // Show the live round-trip time so a slow connection is visible.
  useEffect(() => {
    const read = () => setLatency(getLatency());
    read();
    const id = setInterval(read, 2000);
    return () => clearInterval(id);
  }, []);

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

    if (game.status === GameStatus.DRAW) {
      setShowWinnerDialog(true);
      setIncomingDraw(false);
      setDrawState("idle");
    }

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
      // A move lapses any pending draw offer.
      setDrawState("idle");
      setIncomingDraw(false);
      // Send just the move (a few hundred bytes) instead of the whole game.
      // The opponent replays it with the same rules code.
      sendMessage("MOVE", {
        gameId: game.gameId,
        move: {
          from: selectedPosition,
          to: position,
          promotedTo: choice ?? undefined,
          isCastle: Boolean(_history.isCastle),
        },
        check: isCheck,
        checkmate: isCheckMate,
        stalemate: isStalemate,
        winner,
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

  const opponentPlayer = () =>
    opponent ?? (player.color === "white" ? game.black : game.white);

  const resign = () => {
    setConfirm(null);
    sendMessage("RESIGN", { gameId: game.gameId });
    setGame({ ...game, status: GameStatus.RESIGNED, winner: opponentPlayer() });
  };

  const offerDraw = () => {
    sendMessage("DRAW_OFFER", { gameId: game.gameId });
    setDrawState("offered");
    showNotice("Draw offered. Waiting for a reply.");
  };

  const answerDraw = (accept: boolean) => {
    setIncomingDraw(false);
    sendMessage("DRAW_RESPONSE", { gameId: game.gameId, accept });
    if (accept) setGame({ ...game, status: GameStatus.DRAW });
  };

  // Leave for good: tell the server, then go back to the lobby.
  const leaveGame = () => {
    setConfirm(null);
    sendMessage("LEAVE", { gameId: game.gameId });
    resetBoard();
  };

  const requestExit = () => {
    if (isGameReady) setConfirm("exit");
    else leaveGame();
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
    setDrawState("idle");
    setIncomingDraw(false);
    setBoard([]);
    setGame(null);
  };

  const getSquareColor = (position: Position) => {
    const { x, y } = position;

    const last = history[history.length - 1];
    const isLastMove =
      last &&
      ((last.from.x === x && last.from.y === y) ||
        (last.to.x === x && last.to.y === y));
    if (isLastMove) return (x + y) % 2 === 0 ? "#f0cf7a" : "#e3a95a";

    return (x + y) % 2 === 0 ? "#f3e5c4" : "#d98b4d";
  };

  // Captured pieces and material balance, derived from the move list.
  const VALUES: Record<string, number> = {
    PAWN: 1,
    KNIGHT: 3,
    BISHOP: 3,
    ROOK: 5,
    QUEEN: 9,
    KING: 0,
  };
  const takenByWhite: Piece[] = [];
  const takenByBlack: Piece[] = [];
  history.forEach((m) => {
    if (!m.capturedPiece) return;
    (m.piece.color === "white" ? takenByWhite : takenByBlack).push(
      m.capturedPiece
    );
  });
  const sum = (list: Piece[]) =>
    list.reduce((total, p) => total + (VALUES[p.type] ?? 0), 0);
  const whiteLead = sum(takenByWhite) - sum(takenByBlack);
  const orderTaken = (list: Piece[]) =>
    [...list].sort((a, b) => (VALUES[b.type] ?? 0) - (VALUES[a.type] ?? 0));

  const lastMove = history[history.length - 1];
  const canMove = isGameReady && player.color === turn;

  // The winner's celebration (see Celebration.tsx). Triggered from a couple of
  // places; ignore repeats while one is already playing.
  const handleClick = () => {
    if (celebratingRef.current) return;
    celebratingRef.current = true;
    setCelebrating(true);
  };

  const endCelebration = () => {
    celebratingRef.current = false;
    setCelebrating(false);
  };

  // Latest props for the socket handler below, which is registered only once.
  const latest = useRef({ game, player, opponent });
  latest.current = { game, player, opponent };

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

      // The opponent's move, sent as just the move. Replay it on our board.
      if (data.type === "OPPONENT_MOVE" && payload) {
        const { game: current, player: me, opponent: them } = latest.current;
        const m = payload as unknown as {
          move: {
            from: Position;
            to: Position;
            promotedTo?: PieceType;
            isCastle?: boolean;
          };
          check: boolean;
          checkmate: boolean;
          stalemate: boolean;
          winner: "white" | "black" | null;
        };
        const before = current.board.pieces;
        const piece = before[m.move.from.x][m.move.from.y];
        if (!piece) return;

        let after = movePiece(before, m.move.from, m.move.to);
        if (m.move.promotedTo) {
          after = promote(after, m.move.promotedTo, m.move.to, piece.color);
        }
        const played: Move = {
          from: m.move.from,
          to: m.move.to,
          piece,
          capturedPiece: before[m.move.to.x][m.move.to.y],
        };
        if (m.move.promotedTo) {
          played.isPromoted = true;
          played.promotedTo = m.move.promotedTo;
        }
        if (m.move.isCastle) played.isCastle = true;

        setIncomingDraw(false);
        setDrawState("idle");
        setGame({
          ...current,
          history: {
            moves: [...current.history.moves, played],
            lastMove: played,
          },
          board: { pieces: after },
          currentTurn: me,
          winner: m.winner ? them : null,
          status: m.checkmate
            ? GameStatus.CHECKMATE
            : m.stalemate
            ? GameStatus.STALEMATE
            : current.status,
          check: m.check,
          checkmate: m.checkmate,
          stalemate: m.stalemate,
        });
      }

      // The opponent resigned or disconnected: the win is ours, and our
      // board is correct.
      if (data.type === "OPPONENT_LEFT" || data.type === "OPPONENT_RESIGNED") {
        const { game: current, player: me } = latest.current;
        if (current.winner || current.stalemate || current.status === GameStatus.DRAW) return;
        setGame({ ...current, status: GameStatus.RESIGNED, winner: me });
      }

      if (data.type === "DRAW_OFFERED") {
        if (latest.current.game.status === GameStatus.IN_PROGRESS) setIncomingDraw(true);
      }

      if (data.type === "DRAW_ACCEPTED") {
        setGame({ ...latest.current.game, status: GameStatus.DRAW });
      }

      if (data.type === "DRAW_DECLINED") {
        setDrawState("idle");
        showNotice("Draw declined. The game goes on.");
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
          captured={orderTaken(player.color === "white" ? takenByBlack : takenByWhite)}
          lead={Math.max(0, player.color === "white" ? -whiteLead : whiteLead)}
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
          captured={orderTaken(player.color === "white" ? takenByWhite : takenByBlack)}
          lead={Math.max(0, player.color === "white" ? whiteLead : -whiteLead)}
        />
        <GameActions
          inProgress={isGameReady}
          drawState={drawState}
          onOfferDraw={offerDraw}
          onResign={() => setConfirm("resign")}
          onExit={requestExit}
        />
        <div
          className={styles.chessBoard}
          style={{
            transform: player.color === "black" ? "rotate(180deg)" : "none",
          }}
        >
          {/* Chess board squares */}
          {board.map((row, x) =>
            row.map((piece, y) => {
              const isTarget = moves.some((m) => m.x === x && m.y === y);
              const isSelected =
                selectedPosition?.x === x && selectedPosition?.y === y;
              // A capture is a target holding a piece, or a pawn moving
              // diagonally onto an empty square (en passant).
              const isCapture =
                isTarget &&
                (piece !== null ||
                  (activePiece?.type === PieceType.PAWN &&
                    selectedPosition !== null &&
                    selectedPosition.y !== y));
              return (
                <BoardSquare
                  key={`${x}-${y}`}
                  piece={piece}
                  position={{ x, y }}
                  isCheckMate={isCheckMate && piece?.color === turn}
                  isActive={activePiece?.id === piece?.id}
                  getSquareColor={getSquareColor}
                  onClick={handleSquareClick}
                  playerColor={player.color}
                  isTarget={isTarget}
                  isCapture={isCapture}
                  isSelected={isSelected}
                  isLastTo={
                    Boolean(lastMove) && lastMove.to.x === x && lastMove.to.y === y
                  }
                  isCheckKing={
                    isCheck && piece?.type === PieceType.KING && piece.color === turn
                  }
                  isLight={(x + y) % 2 === 0}
                  rank={y === (player.color === "white" ? 0 : 7) ? 8 - x : null}
                  file={
                    x === (player.color === "white" ? 7 : 0)
                      ? "abcdefgh".charAt(y)
                      : null
                  }
                  canDrag={canMove && piece?.color === player.color}
                  onDragStart={(pos) => {
                    // Selecting on drag start; don't toggle an already
                    // selected piece off.
                    if (
                      !(
                        selectedPosition?.x === pos.x &&
                        selectedPosition?.y === pos.y
                      )
                    ) {
                      handleSquareClick(pos);
                    }
                  }}
                  onDrop={(pos) => {
                    if (moves.some((m) => m.x === pos.x && m.y === pos.y)) {
                      handleSquareClick(pos);
                    }
                  }}
                />
              );
            })
          )}
        </div>
      </div>
      {latency !== null && (
        <div
          className={`${styles.latency} ${
            latency < 150 ? styles.good : latency < 400 ? styles.fair : styles.poor
          }`}
          title="Round-trip time to the game server"
        >
          <i /> {latency} ms
        </div>
      )}
      <History history={history} />
      <WinnerDialog
        winner={winner}
        isOpen={showWinnerDialog}
        onClose={leaveGame}
        reason={game.status}
        isStalemate={isStalemate}
        isDraw={game.status === GameStatus.DRAW}
        playerColor={player.color}
        opponentName={opponent?.name}
      />
      {promotionDialog}
      {confirm === "resign" && (
        <ConfirmDialog
          kicker="Resign"
          title={<>Give up this <em>game?</em></>}
          text="Your opponent wins and the game ends right away."
          confirmLabel="Yes, resign"
          cancelLabel="Keep playing"
          danger
          onConfirm={resign}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === "exit" && (
        <ConfirmDialog
          kicker="Exit"
          title={<>Leave the <em>game?</em></>}
          text="Leaving a game in progress counts as a resignation."
          confirmLabel="Leave game"
          cancelLabel="Stay"
          danger
          onConfirm={leaveGame}
          onCancel={() => setConfirm(null)}
        />
      )}
      {incomingDraw && !showWinnerDialog && (
        <ConfirmDialog
          kicker="Draw offer"
          title={<>{opponent?.name ?? "Your opponent"} offers a <em>draw</em></>}
          text="Accept to end the game as a draw, or decline and keep playing."
          confirmLabel="Accept draw"
          cancelLabel="Decline"
          onConfirm={() => answerDraw(true)}
          onCancel={() => answerDraw(false)}
        />
      )}
      {celebrating && <Celebration onDone={endCelebration} />}
      {notice && (
        <div className={styles.toast} role="status">
          {notice}
        </div>
      )}
    </div>
  );
};

export default Board;
