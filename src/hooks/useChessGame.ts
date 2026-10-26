import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { GameMode, Difficulty, PlayerColor, ChessPieceData } from "../types";
import { BoardTheme } from "../components/ChessBoard";
import { getBestComputerMove } from "../utils/chessEngine";
import { playPieceSound, playDingSound } from "../utils/audio";
import {
  CustomMoveLog,
  STANDARD_SETUP,
  getChessJsFriendlyFen,
  getEnPassantSquare,
  applyMoveToBoard,
  calculateValidMoves,
  getPseudoLegalMoves,
  reconstructFromHistory,
  getKingSquare,
  checkAndRemoveSameTypeChain,
  getDistinctPieces,
  isKingInCheck,
  hasAnyLegalMoves,
} from "../utils/chessBoardUtils";
import { placeJumboPiece, moveJumboPiece, getJumbo2x2Squares, getJumboAnchorSquare, snapToMeta2x2Anchor } from "../utils/jumboPieceModule";

interface UseChessGameOptions {
  onSendOnlineMove?: (move: any, nextTurn: PlayerColor) => void;
  onlineColor?: PlayerColor;
}

export function useChessGame(options: UseChessGameOptions = {}) {
  const { onSendOnlineMove, onlineColor = "w" } = options;

  // Game Setup & Modes
  const [mode, setMode] = useState<GameMode>("vs_computer");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [playerColor, setPlayerColor] = useState<PlayerColor>("w");
  const [status, setStatus] = useState<"setup" | "playing" | "checkmate" | "stalemate" | "draw" | "check">("setup");

  // Board configuration (Editor mode or custom setups)
  const [editorBoard, setEditorBoard] = useState<Record<string, ChessPieceData>>(STANDARD_SETUP);
  // Active visual board rendering state
  const [activeBoard, setActiveBoard] = useState<Record<string, ChessPieceData>>(STANDARD_SETUP);
  const [selectedBrush, setSelectedBrush] = useState<ChessPieceData | "eraser" | null>(null);

  // Playing attributes
  const [currentTurn, setCurrentTurn] = useState<PlayerColor>("w");
  const [winner, setWinner] = useState<PlayerColor | "draw" | null>(null);
  const [isKingCaptured, setIsKingCaptured] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [kingInCheckSquare, setKingInCheckSquare] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [theme, setTheme] = useState<BoardTheme>("emerald");
  const [isComputerThinking, setIsComputerThinking] = useState(false);
  const [boardRotation, setBoardRotation] = useState<number>(0);
  const [facingPieces, setFacingPieces] = useState<boolean>(true);

  // In-app validation message banner state
  const [validationError, setValidationError] = useState<string | null>(null);

  // Active chess.js game engine reference
  const chessRef = useRef<Chess | null>(null);

  // Custom move history tracking state (independent of chess.js to survive FEN loads)
  const [customHistory, setCustomHistory] = useState<CustomMoveLog[]>([]);

  // Track whether the board setup has been manually modified by the user
  const [hasUserModifiedBoard, setHasUserModifiedBoard] = useState(false);

  // Automated 30-second random piece move when in setup mode and unmodified by user
  useEffect(() => {
    if (status !== "setup" || hasUserModifiedBoard) return;

    const intervalId = setInterval(() => {
      setEditorBoard((currentBoard) => {
        // 1/20 chance (5%) for a jumbo piece to spawn on top of its normal counterpart
        const isJumboSpawn = Math.random() < 0.05;

        if (isJumboSpawn) {
          const nonJumboEntries = Object.entries(currentBoard).filter(
            ([_, p]) => {
              const piece = p as ChessPieceData | undefined;
              return piece && !piece.isExpanded && piece.type !== "z" && piece.type !== "x";
            }
          );

          if (nonJumboEntries.length > 0) {
            const [randomSq, p] = nonJumboEntries[
              Math.floor(Math.random() * nonJumboEntries.length)
            ];
            const piece = p as ChessPieceData;
            const anchorSq = snapToMeta2x2Anchor(randomSq);
            // placeJumboPiece clears all pieces in the 2x2 footprint, erasing any existing pieces
            const updated = placeJumboPiece(currentBoard, anchorSq, piece.type, piece.color);

            playPieceSound(piece.type, false, false);
            setCurrentTurn(currentTurn === "w" ? "b" : "w");
            setActiveBoard(updated);
            return updated;
          }
        }

        // Standard move logic: pieces can make legal/pseudo-legal moves and capture enemy pieces including Kings
        const getMovesForColor = (color: PlayerColor) => {
          const moves: { from: string; to: string }[] = [];
          for (const [sq, p] of Object.entries(currentBoard)) {
            const piece = p as ChessPieceData | undefined;
            if (!piece || piece.color !== color) continue;
            // Use getPseudoLegalMoves so kings can be captured and pieces can move freely in board editor
            const targets = getPseudoLegalMoves(sq, currentBoard, null);
            for (const to of targets) {
              moves.push({ from: sq, to });
            }
          }
          return moves;
        };

        let turn: PlayerColor = currentTurn;
        let legalMoves = getMovesForColor(turn);

        if (legalMoves.length === 0) {
          turn = turn === "w" ? "b" : "w";
          legalMoves = getMovesForColor(turn);
        }

        if (legalMoves.length === 0) {
          return currentBoard;
        }

        const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        const updated = applyMoveToBoard(currentBoard, randomMove.from, randomMove.to);

        const movingPiece = currentBoard[randomMove.from];
        if (movingPiece) {
          playPieceSound(movingPiece.type, false, false);
        }

        setCurrentTurn(turn === "w" ? "b" : "w");
        setActiveBoard(updated);
        return updated;
      });
    }, 30000);

    return () => clearInterval(intervalId);
  }, [status, hasUserModifiedBoard, currentTurn]);

  // Interactive promotion state for user selections
  const [promotionPending, setPromotionPending] = useState<{
    from: string;
    to: string;
    isWizardSwap: boolean;
    color: PlayerColor;
  } | null>(null);

  // Auto-flip orientation based on side selection and manage rotation
  useEffect(() => {
    if (status === "playing" && mode === "vs_computer") {
      setFlipped(playerColor === "b");
      setBoardRotation(0);
    } else if (status === "playing" && mode === "vs_online") {
      setFlipped(onlineColor === "b");
      setBoardRotation(0);
    } else if (status === "playing" && mode === "vs_local") {
      // In local 1v1 mode, only the user can rotate the board
    } else if (status === "setup") {
      setFlipped(false);
      setBoardRotation(0);
    }
  }, [playerColor, onlineColor, status, mode]);

  const handleToggleRotation = () => {
    setBoardRotation((prev) => (prev + 90) % 360);
  };

  const handleToggleFacingPieces = () => {
    setFacingPieces((prev) => !prev);
  };

  const getEditorFen = (activeTurn: PlayerColor = "w"): string => {
    return getChessJsFriendlyFen(editorBoard, activeTurn);
  };

  const checkKingCaptured = (currentBoard: Record<string, ChessPieceData>): boolean => {
    let hasWhiteKing = false;
    let hasBlackKing = false;

    for (const piece of Object.values(currentBoard)) {
      if (piece && (piece.type === "k" || piece.type === "x")) {
        if (piece.color === "w") hasWhiteKing = true;
        if (piece.color === "b") hasBlackKing = true;
      }
    }

    if (!hasWhiteKing && !hasBlackKing) {
      setStatus("draw");
      setWinner("draw");
      setKingInCheckSquare(null);
      setIsKingCaptured(true);
      return true;
    } else if (!hasWhiteKing) {
      setStatus("checkmate");
      setWinner("b");
      setKingInCheckSquare(null);
      setIsKingCaptured(true);
      return true;
    } else if (!hasBlackKing) {
      setStatus("checkmate");
      setWinner("w");
      setKingInCheckSquare(null);
      setIsKingCaptured(true);
      return true;
    }

    setIsKingCaptured(false);
    return false;
  };

  const updateGameStatus = (
    gameInstance: Chess,
    currentBoard?: Record<string, ChessPieceData>,
    targetTurnColor?: PlayerColor,
    enPassantSq?: string | null
  ) => {
    const boardToTest = currentBoard || activeBoard;
    if (checkKingCaptured(boardToTest)) {
      return;
    }

    const turnColor = targetTurnColor || currentTurn;
    const inCheck = isKingInCheck(boardToTest, turnColor);
    const hasMoves = hasAnyLegalMoves(boardToTest, turnColor, enPassantSq);

    if (inCheck && !hasMoves) {
      setStatus("checkmate");
      setWinner(turnColor === "w" ? "b" : "w");
      setKingInCheckSquare(getKingSquare(boardToTest, turnColor));
    } else if (!inCheck && !hasMoves) {
      setStatus("stalemate");
      setWinner("draw");
      setKingInCheckSquare(null);
    } else if (inCheck) {
      setStatus("check");
      setKingInCheckSquare(getKingSquare(boardToTest, turnColor));
    } else {
      setStatus("playing");
      setKingInCheckSquare(null);
    }
  };

  const triggerComputerMove = async (gameInstance: Chess, currentBoard: Record<string, ChessPieceData>, currentHistory: CustomMoveLog[]) => {
    setIsComputerThinking(true);
    try {
      if (checkKingCaptured(currentBoard)) return;

      const wizardSquares = Object.entries(currentBoard)
        .filter(([_, p]) => p.type === "z" && p.color === gameInstance.turn())
        .map(([sq, _]) => sq);

      const bestMove = await getBestComputerMove(gameInstance.fen(), difficulty, wizardSquares);
      if (bestMove && !gameInstance.isGameOver()) {
        let moveResult;
        let selectedFrom = bestMove.from;
        let selectedTo = bestMove.to;
        let selectedPromo = bestMove.promotion || "q";

        try {
          moveResult = gameInstance.move({
            from: selectedFrom,
            to: selectedTo,
            promotion: selectedPromo
          });
        } catch (e) {
          const legalMoves = gameInstance.moves({ verbose: true });
          if (legalMoves.length > 0) {
            const fallback = legalMoves[Math.floor(Math.random() * legalMoves.length)];
            selectedFrom = fallback.from;
            selectedTo = fallback.to;
            selectedPromo = fallback.promotion || "q";
            moveResult = gameInstance.move({
              from: selectedFrom,
              to: selectedTo,
              promotion: selectedPromo
            });
          }
        }

        if (moveResult) {
          const movingPiece = currentBoard[selectedFrom];
          const isCap = Boolean(currentBoard[selectedTo]);
          if (movingPiece) {
            playPieceSound(movingPiece.type, isCap, Boolean(movingPiece.isExpanded));
          }

          const updatedBoard = applyMoveToBoard(currentBoard, selectedFrom, selectedTo, moveResult.flags, moveResult.promotion);
          
          setActiveBoard(updatedBoard);
          setLastMove({ from: selectedFrom, to: selectedTo });

          const nextTurnColor = gameInstance.turn();
          setCurrentTurn(nextTurnColor);

          const moveLog: CustomMoveLog = {
            from: selectedFrom,
            to: selectedTo,
            promotion: moveResult.promotion,
            flags: moveResult.flags,
            san: moveResult.san
          };
          const newHistory = [...currentHistory, moveLog];
          setCustomHistory(newHistory);
          setMoveHistory(newHistory.map(h => h.san || ""));

          if (!checkKingCaptured(updatedBoard)) {
            try {
              const epSq = getEnPassantSquare(moveLog, updatedBoard);
              const friendlyFen = getChessJsFriendlyFen(updatedBoard, nextTurnColor, epSq);
              gameInstance.load(friendlyFen);
              updateGameStatus(gameInstance, updatedBoard, nextTurnColor, epSq);
            } catch (e) {
              console.error("Error loading FEN after computer move:", e);
            }
          }
        }
      }
    } catch (err) {
      console.error("AI engine move error", err);
    } finally {
      setIsComputerThinking(false);
    }
  };

  const executeMove = (from: string, to: string, promotion?: string) => {
    const gameInstance = chessRef.current;
    if (!gameInstance) return;

    const movingPiece = activeBoard[from];
    if (!movingPiece) return;

    const isCapture = Boolean(activeBoard[to]);
    playPieceSound(movingPiece.type, isCapture, Boolean(movingPiece.isExpanded));

    let updatedBoard = { ...activeBoard };
    const activeColor = gameInstance.turn();
    const nextColor = activeColor === "w" ? "b" : "w";

    // 0. Handle Jumbo 2x2 Piece Move
    if (movingPiece.isExpanded) {
      const actualFrom = movingPiece.expandedSquares ? getJumboAnchorSquare(movingPiece.expandedSquares) : from;
      updatedBoard = moveJumboPiece(activeBoard, actualFrom, to);

      setActiveBoard(updatedBoard);
      setLastMove({ from: actualFrom, to });
      setCurrentTurn(nextColor);

      const moveLog: CustomMoveLog = {
        from: actualFrom,
        to,
        san: `🐘 ${movingPiece.type.toUpperCase()} ${actualFrom}→${to}`
      };
      const newHistory = [...customHistory, moveLog];
      setCustomHistory(newHistory);
      setMoveHistory(newHistory.map(h => h.san || ""));

      const isGameOverByKingCap = checkKingCaptured(updatedBoard);

      if (!isGameOverByKingCap) {
        try {
          const epSq = getEnPassantSquare(moveLog, updatedBoard);
          const friendlyFen = getChessJsFriendlyFen(updatedBoard, nextColor, epSq);
          gameInstance.load(friendlyFen);
          updateGameStatus(gameInstance, updatedBoard, nextColor, epSq);
        } catch (e) {
          console.error("Error loading FEN after jumbo move:", e);
        }

        if (mode === "vs_computer" && nextColor !== playerColor && !gameInstance.isGameOver()) {
          triggerComputerMove(gameInstance, updatedBoard, newHistory);
        }
        if (mode === "vs_online") {
          onSendOnlineMove?.({ from, to, boardMap: updatedBoard }, nextColor);
        }
      }
      return;
    }

    // 0. Intercept promotions for human players
    const isComputerTurn = mode === "vs_computer" && activeColor !== playerColor;
    if (!isComputerTurn && !promotion) {
      const isStandardPawnPromotion =
        movingPiece.type === "p" &&
        ((movingPiece.color === "w" && to.endsWith("8")) || (movingPiece.color === "b" && to.endsWith("1")));

      const isWizardSwapPromotion =
        movingPiece.type === "z" &&
        activeBoard[to]?.type === "p" &&
        activeBoard[to]?.color === movingPiece.color &&
        ((activeBoard[to]?.color === "w" && from.endsWith("8")) || (activeBoard[to]?.color === "b" && from.endsWith("1")));

      if (isStandardPawnPromotion || isWizardSwapPromotion) {
        setPromotionPending({
          from,
          to,
          isWizardSwap: isWizardSwapPromotion,
          color: isWizardSwapPromotion ? activeBoard[to].color : movingPiece.color
        });
        return;
      }
    }

    // 1. Handle Omni Piece ('x') Move (Can go to any square except capturing Kings or other Omni pieces)
    if (movingPiece.type === "x") {
      const targetP = activeBoard[to];
      if (targetP && (targetP.type === "k" || targetP.type === "x")) {
        return; // Cannot capture Kings or other Omni pieces
      }
      updatedBoard = applyMoveToBoard(activeBoard, from, to);

      setActiveBoard(updatedBoard);
      setLastMove({ from, to });
      setCurrentTurn(nextColor);

      const isCap = Boolean(activeBoard[to]);
      const moveLog: CustomMoveLog = {
        from,
        to,
        san: `👑 ${from}${isCap ? "x" : "→"}${to}`
      };
      const newHistory = [...customHistory, moveLog];
      setCustomHistory(newHistory);
      setMoveHistory(newHistory.map(h => h.san || ""));

      const isGameOverByKingCap = checkKingCaptured(updatedBoard);

      if (!isGameOverByKingCap) {
        try {
          const epSq = getEnPassantSquare(moveLog, updatedBoard);
          const friendlyFen = getChessJsFriendlyFen(updatedBoard, nextColor, epSq);
          gameInstance.load(friendlyFen);
          updateGameStatus(gameInstance, updatedBoard, nextColor, epSq);
        } catch (e) {
          console.error("Error loading FEN after Omni piece move:", e);
        }
        if (mode === "vs_computer" && nextColor !== playerColor && !gameInstance.isGameOver()) {
          triggerComputerMove(gameInstance, updatedBoard, newHistory);
        }
        if (mode === "vs_online") {
          onSendOnlineMove?.({ from, to, boardMap: updatedBoard }, nextColor);
        }
      }
      return;
    }

    // 2. Handle Wizard Swap Gimmick
    if (movingPiece.type === "z" && activeBoard[to]?.color === activeColor) {
      updatedBoard = applyMoveToBoard(activeBoard, from, to, undefined, promotion);

      setActiveBoard(updatedBoard);
      setLastMove({ from, to });
      setCurrentTurn(nextColor);

      const moveLog: CustomMoveLog = {
        from,
        to,
        isWizardSwap: true,
        promotion,
        san: `🧙 Swap ${from}⇄${to}${promotion ? `(=${promotion.toUpperCase()})` : ""}`
      };
      const newHistory = [...customHistory, moveLog];
      setCustomHistory(newHistory);
      setMoveHistory(newHistory.map(h => h.san || ""));

      const isGameOverByKingCap = checkKingCaptured(updatedBoard);

      if (!isGameOverByKingCap) {
        try {
          const epSq = getEnPassantSquare(moveLog, updatedBoard);
          const friendlyFen = getChessJsFriendlyFen(updatedBoard, nextColor, epSq);
          gameInstance.load(friendlyFen);
          updateGameStatus(gameInstance, updatedBoard, nextColor, epSq);
        } catch (e) {
          console.error("Error loading FEN after wizard swap:", e);
        }
        if (mode === "vs_computer" && nextColor !== playerColor && !gameInstance.isGameOver()) {
          triggerComputerMove(gameInstance, updatedBoard, newHistory);
        }
        if (mode === "vs_online") {
          onSendOnlineMove?.({ from, to, isWizardSwap: true, promotion, boardMap: updatedBoard }, nextColor);
        }
      }
      return;
    }

    // 2. Handle Wizard Pawn-like Move
    if (movingPiece.type === "z") {
      updatedBoard = applyMoveToBoard(activeBoard, from, to);

      setActiveBoard(updatedBoard);
      setLastMove({ from, to });
      setCurrentTurn(nextColor);

      const moveLog: CustomMoveLog = {
        from,
        to,
        isWizardMove: true,
        san: `🧙 ${from}→${to}`
      };
      const newHistory = [...customHistory, moveLog];
      setCustomHistory(newHistory);
      setMoveHistory(newHistory.map(h => h.san || ""));

      const isGameOverByKingCap = checkKingCaptured(updatedBoard);

      if (!isGameOverByKingCap) {
        try {
          const epSq = getEnPassantSquare(moveLog, updatedBoard);
          const friendlyFen = getChessJsFriendlyFen(updatedBoard, nextColor, epSq);
          gameInstance.load(friendlyFen);
          updateGameStatus(gameInstance, updatedBoard, nextColor, epSq);
        } catch (e) {
          console.error("Error loading FEN after wizard move:", e);
        }
        if (mode === "vs_computer" && nextColor !== playerColor && !gameInstance.isGameOver()) {
          triggerComputerMove(gameInstance, updatedBoard, newHistory);
        }
        if (mode === "vs_online") {
          onSendOnlineMove?.({ from, to, isWizardMove: true, boardMap: updatedBoard }, nextColor);
        }
      }
      return;
    }

    // 3. Handle Standard Chess Move
    try {
      let moveResult: any = null;
      try {
        moveResult = gameInstance.move({
          from,
          to,
          promotion: promotion || "q"
        });
      } catch (err) {
        console.warn("chess.js move failed, using custom board fallback", err);
      }

      const isCap = Boolean(activeBoard[to]);
      updatedBoard = moveResult
        ? applyMoveToBoard(activeBoard, from, to, moveResult.flags, moveResult.promotion)
        : applyMoveToBoard(activeBoard, from, to, undefined, promotion);
        
      setActiveBoard(updatedBoard);
      setLastMove({ from, to });

      const nextTurnColor = activeColor === "w" ? "b" : "w";
      setCurrentTurn(nextTurnColor);

      const moveLog: CustomMoveLog = {
        from,
        to,
        promotion: moveResult?.promotion || promotion,
        flags: moveResult?.flags,
        san: moveResult?.san || `${movingPiece.type.toUpperCase()}${from}${isCap ? "x" : "→"}${to}`
      };
      const newHistory = [...customHistory, moveLog];
      setCustomHistory(newHistory);
      setMoveHistory(newHistory.map(h => h.san || ""));

      const isGameOverByKingCap = checkKingCaptured(updatedBoard);

      if (!isGameOverByKingCap) {
        const epSq = getEnPassantSquare(moveLog, updatedBoard);
        try {
          const friendlyFen = getChessJsFriendlyFen(updatedBoard, nextTurnColor, epSq);
          gameInstance.load(friendlyFen);
          updateGameStatus(gameInstance, updatedBoard, nextTurnColor, epSq);
        } catch (e) {
          console.error("Error loading FEN after standard move:", e);
          updateGameStatus(gameInstance, updatedBoard, nextTurnColor, epSq);
        }

        if (mode === "vs_computer" && !gameInstance.isGameOver()) {
          triggerComputerMove(gameInstance, updatedBoard, newHistory);
        }
        if (mode === "vs_online") {
          onSendOnlineMove?.({ from, to, promotion: moveResult?.promotion || promotion, boardMap: updatedBoard }, nextTurnColor);
        }
      }
    } catch (err) {
      console.error("Illegal move execution", err);
    }
  };

  const handleSelectPromotion = (pieceType: "q" | "r" | "b" | "n") => {
    if (!promotionPending) return;
    const { from, to } = promotionPending;
    setPromotionPending(null);
    executeMove(from, to, pieceType);
  };

  const handleStartGame = () => {
    const piecesArray = getDistinctPieces(editorBoard);
    const whiteKingsOrOmni = piecesArray.filter(p => (p.type === "k" || p.type === "x") && p.color === "w").length;
    const blackKingsOrOmni = piecesArray.filter(p => (p.type === "k" || p.type === "x") && p.color === "b").length;

    if (whiteKingsOrOmni !== 1 || blackKingsOrOmni !== 1) {
      setValidationError(
        `Invalid board setup! You must have exactly 1 White King or 1 White Omni piece and 1 Black King or 1 Black Omni piece to begin a match. Currently: White (${whiteKingsOrOmni}), Black (${blackKingsOrOmni}).`
      );
      return;
    }

    setValidationError(null);
    setSelectedBrush(null);
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setCustomHistory([]);
    setMoveHistory([]);

    const startingTurn: PlayerColor = mode === "vs_computer" ? playerColor : "w";
    const friendlyFen = getChessJsFriendlyFen(editorBoard, startingTurn);

    try {
      const chessObj = new Chess(friendlyFen);
      chessRef.current = chessObj;

      setActiveBoard(editorBoard);
      setCurrentTurn(chessObj.turn());
      setWinner(null);
      setStatus("playing");

      updateGameStatus(chessObj);

      if (mode === "vs_computer" && chessObj.turn() !== playerColor) {
        triggerComputerMove(chessObj, editorBoard, []);
      }
    } catch (err) {
      setValidationError("Failed to load custom board placement. Please make sure pieces do not result in immediate illegal check states.");
      console.error(err);
    }
  };

  const handleStartOnlineGame = (color: PlayerColor, customBoard?: Record<string, ChessPieceData>) => {
    setMode("vs_online");
    setValidationError(null);
    setSelectedBrush(null);
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setCustomHistory([]);
    setMoveHistory([]);

    const initialBoard = customBoard && Object.keys(customBoard).length > 0 ? customBoard : STANDARD_SETUP;
    const friendlyFen = getChessJsFriendlyFen(initialBoard, "w");
    
    try {
      const chessObj = new Chess(friendlyFen);
      chessRef.current = chessObj;
    } catch (e) {
      console.warn("Could not load FEN into chess engine for custom online board setup:", e);
      chessRef.current = new Chess();
    }

    setActiveBoard(initialBoard);
    setCurrentTurn("w");
    setWinner(null);
    setStatus("playing");
    setKingInCheckSquare(null);
  };

  const handleOpponentMove = (data: { move: any; nextTurn: PlayerColor }) => {
    const gameInstance = chessRef.current;
    if (!gameInstance) return;

    const { from, to, isWizardSwap, isWizardMove, promotion, boardMap } = data.move;

    if (!isWizardSwap && !isWizardMove) {
      try {
        gameInstance.move({
          from,
          to,
          promotion: promotion || "q"
        });
      } catch (e) {
        console.error("Error synchronizing standard move from opponent:", e);
      }
    }

    const movingPiece = boardMap[to];
    if (movingPiece) {
      playPieceSound(movingPiece.type, false, Boolean(movingPiece.isExpanded));
    }

    setActiveBoard(boardMap);

    let moveSan = "";
    if (isWizardSwap) {
      moveSan = `🧙 Swap ${from}⇄${to}${promotion ? `(=${promotion.toUpperCase()})` : ""}`;
    } else if (isWizardMove) {
      moveSan = `🧙 ${from}→${to}`;
    } else {
      moveSan = `${from}→${to}`;
    }

    setCustomHistory((prev) => {
      const moveLog: CustomMoveLog = {
        from,
        to,
        promotion,
        isWizardSwap,
        isWizardMove,
        san: moveSan
      };
      const updated = [...prev, moveLog];
      setMoveHistory(updated.map(h => h.san || ""));
      return updated;
    });

    setCurrentTurn(data.nextTurn);

    if (!checkKingCaptured(boardMap)) {
      try {
        const moveLog: CustomMoveLog = {
          from,
          to,
          promotion,
          isWizardSwap,
          isWizardMove,
          san: moveSan
        };
        const epSq = getEnPassantSquare(moveLog, boardMap);
        const friendlyFen = getChessJsFriendlyFen(boardMap, data.nextTurn, epSq);
        gameInstance.load(friendlyFen);
        updateGameStatus(gameInstance, boardMap, data.nextTurn, epSq);
      } catch (e) {
        console.error("Error loading FEN after opponent move:", e);
      }
    }
  };

  const deletePieceAtSquare = (boardMap: Record<string, ChessPieceData>, sq: string) => {
    const p = boardMap[sq];
    if (p?.isExpanded && p.expandedSquares) {
      for (const s of p.expandedSquares) {
        delete boardMap[s];
      }
    } else {
      delete boardMap[sq];
    }
  };

  const handleSquareClick = (square: string) => {
    if (promotionPending) return;
    if (status === "setup") {
      setHasUserModifiedBoard(true);
      let updated = { ...editorBoard };

      if (selectedBrush === "eraser") {
        deletePieceAtSquare(updated, square);
        setSelectedSquare(null);
      } else if (selectedSquare) {
        if (selectedSquare === square) {
          setSelectedSquare(null);
        } else {
          const movingPiece = updated[selectedSquare];
          if (movingPiece) {
            if (movingPiece.isExpanded) {
              updated = moveJumboPiece(updated, selectedSquare, square);
            } else {
              deletePieceAtSquare(updated, selectedSquare);
              deletePieceAtSquare(updated, square);
              updated[square] = { ...movingPiece };
            }
            playPieceSound(movingPiece.type, false, Boolean(movingPiece.isExpanded));
          }
          setSelectedSquare(null);
          setSelectedBrush(null);
        }
      } else if (updated[square]) {
        const p = updated[square];
        const anchor = (p.isExpanded && p.expandedSquares)
          ? getJumboAnchorSquare(p.expandedSquares)
          : square;
        setSelectedSquare(anchor);
        setSelectedBrush(null);
      } else if (selectedBrush) {
        if (selectedBrush.isExpanded) {
          updated = placeJumboPiece(updated, square, selectedBrush.type, selectedBrush.color);
        } else {
          deletePieceAtSquare(updated, square);
          updated[square] = { ...selectedBrush };
        }
        playPieceSound(selectedBrush.type, false, Boolean(selectedBrush.isExpanded));
      }
      setEditorBoard(updated);
      setActiveBoard(updated);
    } else {
      if (isComputerThinking) return;

      const gameInstance = chessRef.current;
      if (!gameInstance || winner) return;

      const activeColor = gameInstance.turn();
      if (mode === "vs_computer" && activeColor !== playerColor) return;
      if (mode === "vs_online" && activeColor !== onlineColor) return;

      if (selectedSquare) {
        const selectedPiece = activeBoard[selectedSquare];
        if (selectedPiece?.isExpanded) {
          let matchedAnchor: string | null = null;
          for (const anchor of validMoves) {
            if (getJumbo2x2Squares(anchor).includes(square)) {
              matchedAnchor = anchor;
              break;
            }
          }
          if (matchedAnchor) {
            executeMove(selectedSquare, matchedAnchor);
            setSelectedSquare(null);
            setValidMoves([]);
            return;
          }
        } else {
          let matchedTarget: string | null = null;
          if (validMoves.includes(square)) {
            matchedTarget = square;
          } else {
            const targetPiece = activeBoard[square];
            if (targetPiece?.isExpanded && targetPiece.expandedSquares) {
              for (const validSq of validMoves) {
                if (targetPiece.expandedSquares.includes(validSq)) {
                  matchedTarget = validSq;
                  break;
                }
              }
            }
          }
          if (matchedTarget) {
            executeMove(selectedSquare, matchedTarget);
            setSelectedSquare(null);
            setValidMoves([]);
            return;
          }
        }
      }

      const piece = activeBoard[square];
      if (piece && piece.color === activeColor) {
        const actualSquare = (piece.isExpanded && piece.expandedSquares)
          ? getJumboAnchorSquare(piece.expandedSquares)
          : square;
        setSelectedSquare(actualSquare);
        const lastLog = customHistory[customHistory.length - 1];
        const epSq = getEnPassantSquare(lastLog, activeBoard);
        const moves = calculateValidMoves(actualSquare, gameInstance, activeBoard, epSq);
        setValidMoves(moves);
      } else {
        setSelectedSquare(null);
        setValidMoves([]);
      }
    }
  };

  const handlePieceDrop = (fromSquare: string | "palette", toSquare: string, piece?: ChessPieceData) => {
    if (promotionPending) return;
    if (status === "setup") {
      setHasUserModifiedBoard(true);
      let updated = { ...editorBoard };

      const pieceToPlace = piece || (selectedBrush && selectedBrush !== "eraser" ? selectedBrush : undefined);

      if (fromSquare === "palette" && pieceToPlace) {
        if (pieceToPlace.isExpanded) {
          updated = placeJumboPiece(updated, toSquare, pieceToPlace.type, pieceToPlace.color);
        } else {
          deletePieceAtSquare(updated, toSquare);
          updated[toSquare] = { ...pieceToPlace };
        }
        playPieceSound(pieceToPlace.type, false, Boolean(pieceToPlace.isExpanded));
      } else if (fromSquare !== "palette") {
        const movingPiece = updated[fromSquare];
        if (movingPiece) {
          if (movingPiece.isExpanded) {
            updated = moveJumboPiece(updated, fromSquare, toSquare);
          } else {
            deletePieceAtSquare(updated, fromSquare);
            deletePieceAtSquare(updated, toSquare);
            updated[toSquare] = { type: movingPiece.type, color: movingPiece.color };
          }
          playPieceSound(movingPiece.type, false, Boolean(movingPiece.isExpanded));
        }
      }
      setEditorBoard(updated);
      setActiveBoard(updated);
    } else {
      if (isComputerThinking || fromSquare === "palette") return;

      const gameInstance = chessRef.current;
      if (!gameInstance || winner) return;

      const activeColor = gameInstance.turn();
      if (mode === "vs_computer" && activeColor !== playerColor) return;
      if (mode === "vs_online" && activeColor !== onlineColor) return;

      const movingPiece = activeBoard[fromSquare];
      if (!movingPiece || movingPiece.color !== activeColor) return;

      const actualFrom = (movingPiece.isExpanded && movingPiece.expandedSquares)
        ? getJumboAnchorSquare(movingPiece.expandedSquares)
        : fromSquare;

      const lastLog = customHistory[customHistory.length - 1];
      const epSq = getEnPassantSquare(lastLog, activeBoard);
      const moves = calculateValidMoves(actualFrom, gameInstance, activeBoard, epSq);

      if (movingPiece.isExpanded) {
        let matchedAnchor: string | null = null;
        for (const anchor of moves) {
          if (getJumbo2x2Squares(anchor).includes(toSquare)) {
            matchedAnchor = anchor;
            break;
          }
        }
        if (matchedAnchor) {
          executeMove(actualFrom, matchedAnchor);
          setSelectedSquare(null);
          setValidMoves([]);
          return;
        }
      } else {
        let matchedTarget: string | null = null;
        if (moves.includes(toSquare)) {
          matchedTarget = toSquare;
        } else {
          const targetPiece = activeBoard[toSquare];
          if (targetPiece?.isExpanded && targetPiece.expandedSquares) {
            for (const validSq of moves) {
              if (targetPiece.expandedSquares.includes(validSq)) {
                matchedTarget = validSq;
                break;
              }
            }
          }
        }
        if (matchedTarget) {
          executeMove(fromSquare, matchedTarget);
          setSelectedSquare(null);
          setValidMoves([]);
          return;
        }
      }
    }
  };

  const handlePieceDragOff = (square: string) => {
    if (status === "setup") {
      setHasUserModifiedBoard(true);
      const updated = { ...editorBoard };
      deletePieceAtSquare(updated, square);
      setEditorBoard(updated);
      setActiveBoard(updated);
    }
  };

  const handleUndoMove = () => {
    const gameInstance = chessRef.current;
    if (!gameInstance || isComputerThinking) return;

    let steps = 1;
    if (mode === "vs_computer") {
      steps = 2;
    }

    if (customHistory.length < steps) return;

    const newHistory = customHistory.slice(0, -steps);
    setCustomHistory(newHistory);
    setMoveHistory(newHistory.map(h => h.san || ""));

    const reconstructed = reconstructFromHistory(editorBoard, newHistory);
    setActiveBoard(reconstructed);

    const nextTurn = newHistory.length % 2 === 0 ? "w" : "b";

    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(newHistory.length > 0 ? { from: newHistory[newHistory.length - 1].from, to: newHistory[newHistory.length - 1].to } : null);
    setCurrentTurn(nextTurn);
    setWinner(null);

    if (!checkKingCaptured(reconstructed)) {
      try {
        const lastLog = newHistory[newHistory.length - 1];
        const epSq = getEnPassantSquare(lastLog, reconstructed);
        const friendlyFen = getChessJsFriendlyFen(reconstructed, nextTurn, epSq);
        gameInstance.load(friendlyFen);
        updateGameStatus(gameInstance, reconstructed, nextTurn, epSq);
      } catch (e) {
        console.error("Error loading FEN after undo move:", e);
      }
    }
  };

  const handleRestartGame = () => {
    handleStartGame();
  };

  const handleBackToSetup = () => {
    setEditorBoard(activeBoard);
    setStatus("setup");
    setWinner(null);
    setLastMove(null);
    setKingInCheckSquare(null);
    setSelectedSquare(null);
    setValidMoves([]);
  };

  const handleLoadFen = (fenString: string) => {
    try {
      const chessObj = new Chess(fenString);
      const synced: Record<string, ChessPieceData> = {};
      const bMatrix = chessObj.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const sq = bMatrix[r][c];
          if (sq) {
            synced[sq.square] = { type: sq.type, color: sq.color };
          }
        }
      }
      setEditorBoard(synced);
      setActiveBoard(synced);
      setHasUserModifiedBoard(true);
      setValidationError(null);
    } catch (err) {
      setValidationError("Failed to load specified FEN string. Please double-check formatting.");
    }
  };

  const handleClearBoard = () => {
    setEditorBoard({});
    setActiveBoard({});
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setKingInCheckSquare(null);
    setMoveHistory([]);
    setCustomHistory([]);
    setHasUserModifiedBoard(true);
  };

  const handleResetBoard = () => {
    setEditorBoard(STANDARD_SETUP);
    setActiveBoard(STANDARD_SETUP);
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setKingInCheckSquare(null);
    setMoveHistory([]);
    setCustomHistory([]);
    setHasUserModifiedBoard(false);
  };

  return {
    mode,
    setMode,
    difficulty,
    setDifficulty,
    playerColor,
    setPlayerColor,
    status,
    setStatus,
    editorBoard,
    activeBoard,
    selectedBrush,
    setSelectedBrush,
    currentTurn,
    winner,
    isKingCaptured,
    selectedSquare,
    validMoves,
    moveHistory,
    lastMove,
    kingInCheckSquare,
    flipped,
    setFlipped,
    theme,
    setTheme,
    isComputerThinking,
    boardRotation,
    facingPieces,
    validationError,
    setValidationError,
    promotionPending,
    setPromotionPending,
    chessRef,
    getEditorFen,
    handleToggleRotation,
    handleToggleFacingPieces,
    handleSelectPromotion,
    handleStartGame,
    handleStartOnlineGame,
    handleOpponentMove,
    handleSquareClick,
    handlePieceDrop,
    handlePieceDragOff,
    handleUndoMove,
    handleRestartGame,
    handleBackToSetup,
    handleLoadFen,
    handleClearBoard,
    handleResetBoard,
  };
}
