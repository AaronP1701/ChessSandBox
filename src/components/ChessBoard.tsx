import React, { useState, useEffect } from "react";
import { ChessPiece } from "./ChessPieces";
import { ChessPieceData, PlayerColor, GameMode, UITheme } from "../types";
import { ArrowLeftRight, Trash2, RotateCw, Compass, RotateCcw, Sparkles, Menu } from "lucide-react";
import { getJumbo2x2Squares } from "../utils/jumboPieceModule";
import { playWoodenClackSound } from "../utils/audio";

export type BoardTheme = "elegant" | "emerald" | "cosmic" | "walnut" | "olive" | "crimsonNavy";

interface ChessBoardProps {
  board: Record<string, ChessPieceData>;
  isEditor: boolean;
  selectedBrush: ChessPieceData | "eraser" | null;
  onSelectBrush?: (brush: ChessPieceData | "eraser" | null) => void;
  onClearBoard?: () => void;
  onResetBoard?: () => void;
  onOpenAllTools?: () => void;
  flipped: boolean;
  onSquareClick: (square: string) => void;
  onPieceDrop: (fromSquare: string | "palette", toSquare: string, piece?: ChessPieceData) => void;
  onPieceDragOff: (square: string) => void;
  validMoves: string[]; // List of squares the selected piece can move to
  selectedSquare: string | null;
  lastMove: { from: string; to: string } | null;
  kingInCheckSquare: string | null;
  theme: BoardTheme;
  setTheme: (theme: BoardTheme) => void;
  onToggleFlip: () => void;
  currentTurn?: "w" | "b";
  isVsComputer?: boolean;
  difficulty?: string;
  promotionPending: {
    from: string;
    to: string;
    isWizardSwap: boolean;
    color: PlayerColor;
  } | null;
  onSelectPromotion: (pieceType: "q" | "r" | "b" | "n") => void;
  onCancelPromotion?: () => void;
  rotation?: number;
  mode?: GameMode;
  onToggleRotation?: () => void;
  facingPieces?: boolean;
  onToggleFacingPieces?: () => void;
  uiTheme?: UITheme;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  board,
  isEditor,
  selectedBrush,
  onSelectBrush,
  onClearBoard,
  onResetBoard,
  onOpenAllTools,
  flipped,
  onSquareClick,
  onPieceDrop,
  onPieceDragOff,
  validMoves,
  selectedSquare,
  lastMove,
  kingInCheckSquare,
  theme,
  setTheme,
  onToggleFlip,
  currentTurn = "w",
  isVsComputer = true,
  difficulty = "medium",
  promotionPending,
  onSelectPromotion,
  onCancelPromotion,
  rotation = 0,
  mode = "vs_computer",
  onToggleRotation,
  facingPieces = true,
  onToggleFacingPieces,
  uiTheme = "dark",
}) => {
  const [draggedOverSquare, setDraggedOverSquare] = useState<string | null>(null);
  const [hoveredSquare, setHoveredSquare] = useState<string | null>(null);
  const [draggingSquare, setDraggingSquare] = useState<string | null>(null);
  const [isJumboMode, setIsJumboMode] = useState(false);
  const [rotateClickCount, setRotateClickCount] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Empty board click-and-drag state
  const [boardDragOffset, setBoardDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [boardDragRotation, setBoardDragRotation] = useState<number>(0);
  const [isBoardDragging, setIsBoardDragging] = useState(false);
  const [boardDragStart, setBoardDragStart] = useState<{ x: number; y: number; offsetX: number; offsetY: number; rot: number } | null>(null);

  const isEmptyBoard = !Object.values(board).some((piece: ChessPieceData) => Boolean(piece && piece.type));

  useEffect(() => {
    if (!isEmptyBoard) {
      setBoardDragOffset({ x: 0, y: 0 });
      setBoardDragRotation(0);
    }
  }, [isEmptyBoard]);

  const handleBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isEmptyBoard) {
      playWoodenClackSound();
    }
    if (!isEmptyBoard || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("#promotion-backdrop") || target.closest("[id^='palette-']")) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsBoardDragging(true);
    setBoardDragStart({
      x: e.clientX,
      y: e.clientY,
      offsetX: boardDragOffset.x,
      offsetY: boardDragOffset.y,
      rot: boardDragRotation,
    });
  };

  const handleBoardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isBoardDragging || !boardDragStart) return;
    const dx = e.clientX - boardDragStart.x;
    const dy = e.clientY - boardDragStart.y;
    setBoardDragOffset({
      x: boardDragStart.offsetX + dx,
      y: boardDragStart.offsetY + dy,
    });
    setBoardDragRotation(boardDragStart.rot + dx * 0.4);
  };

  const handleBoardPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isBoardDragging) {
      setIsBoardDragging(false);
      setBoardDragStart(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore pointer capture release error
      }
    }
  };

  const getRotateButtonText = () => {
    if (rotateClickCount > 100) return "Help";
    if (rotateClickCount > 50) return "Please";
    if (rotateClickCount > 30) return "Stop";
    return "Rotate 90°";
  };

  const paletteTypes: ("p" | "n" | "b" | "r" | "q" | "k" | "z")[] = [
    "p", "n", "b", "r", "q", "k", "z"
  ];

  const getBrushForPiece = (type: ChessPieceData["type"], color: "w" | "b"): ChessPieceData => {
    const isExpanded = isJumboMode && type !== "z" && type !== "x";
    return { type, color, isExpanded };
  };

  const handleSelectPalettePiece = (type: ChessPieceData["type"], color: "w" | "b") => {
    if (!onSelectBrush) return;
    const brush = getBrushForPiece(type, color);
    const isSelected =
      selectedBrush &&
      selectedBrush !== "eraser" &&
      selectedBrush.type === type &&
      selectedBrush.color === color &&
      Boolean(selectedBrush.isExpanded) === Boolean(brush.isExpanded);

    onSelectBrush(isSelected ? null : brush);
  };

  const handlePalettePieceDragStart = (e: React.DragEvent, type: ChessPieceData["type"], color: "w" | "b") => {
    if (!onSelectBrush) return;
    const brush = getBrushForPiece(type, color);
    onSelectBrush(brush);
    e.dataTransfer.setData("text/plain", JSON.stringify(brush));
    e.dataTransfer.effectAllowed = "all";
    const target = e.currentTarget as HTMLElement;
    if (target && e.dataTransfer.setDragImage) {
      const rect = target.getBoundingClientRect();
      const width = rect.width || target.offsetWidth || 0;
      const height = rect.height || target.offsetHeight || 0;
      if (width > 0 && height > 0) {
        e.dataTransfer.setDragImage(target, width / 2, height / 2);
      }
    }
  };

  const isLight = uiTheme === "light";

  const handlePaletteDragStart = (e: React.DragEvent, piece: ChessPieceData) => {
    onSelectBrush?.(piece);
    e.dataTransfer.setData("text/plain", JSON.stringify(piece));
    e.dataTransfer.effectAllowed = "all";
    const target = e.currentTarget as HTMLElement;
    if (target && e.dataTransfer.setDragImage) {
      const rect = target.getBoundingClientRect();
      const width = rect.width || target.offsetWidth || 0;
      const height = rect.height || target.offsetHeight || 0;
      if (width > 0 && height > 0) {
        e.dataTransfer.setDragImage(target, width / 2, height / 2);
      }
    }
  };

  const handlePaletteClick = (piece: ChessPieceData) => {
    if (!onSelectBrush) return;
    const isSelected =
      selectedBrush &&
      selectedBrush !== "eraser" &&
      selectedBrush.type === piece.type &&
      selectedBrush.color === piece.color;
    onSelectBrush(isSelected ? null : piece);
  };

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const ranks = ["1", "2", "3", "4", "5", "6", "7", "8"];

  // Order of columns/rows based on flip
  const displayFiles = flipped ? [...files].reverse() : files;
  const displayRanks = flipped ? ranks : [...ranks].reverse();

  // Color theme definitions
  const themeClasses = {
    elegant: {
      light: "bg-[#3e444e] text-[#f8fafc]",
      dark: "bg-[#2a2e36] text-[#94a3b8]",
      border: "border-[#1e2128]",
      activeBg: "bg-amber-500/20",
    },
    emerald: {
      light: "bg-[#f0d9b5] text-[#b58863]",
      dark: "bg-[#b58863] text-[#f0d9b5]",
      border: "border-amber-900/10",
      activeBg: "bg-amber-900/30",
    },
    cosmic: {
      light: "bg-slate-300 text-slate-800",
      dark: "bg-indigo-950 text-indigo-300",
      border: "border-indigo-900/30",
      activeBg: "bg-indigo-500/20",
    },
    walnut: {
      light: "bg-amber-100 text-amber-900",
      dark: "bg-amber-800 text-amber-100",
      border: "border-amber-950/20",
      activeBg: "bg-amber-950/25",
    },
    olive: {
      light: "bg-[#E1E1CE] text-[#749158]",
      dark: "bg-[#749158] text-[#E1E1CE]",
      border: "border-[#749158]/30",
      activeBg: "bg-[#749158]/30",
    },
    crimsonNavy: {
      light: "bg-[#BD4040] text-[#07324E]",
      dark: "bg-[#07324E] text-[#BD4040]",
      border: "border-[#07324E]/30",
      activeBg: "bg-[#07324E]/30",
    },
  };

  const handleDragStart = (e: React.DragEvent, square: string) => {
    setDraggingSquare(square);
    e.dataTransfer.setData("text/plain", JSON.stringify({ fromSquare: square }));
    e.dataTransfer.effectAllowed = "all";
    const target = e.currentTarget as HTMLElement;
    if (target && e.dataTransfer.setDragImage) {
      const rect = target.getBoundingClientRect();
      const width = rect.width || target.offsetWidth || 0;
      const height = rect.height || target.offsetHeight || 0;
      if (width > 0 && height > 0) {
        e.dataTransfer.setDragImage(target, width / 2, height / 2);
      }
    }
    if (!isEditor) {
      onSquareClick(square);
    }
  };

  const [pointerDragging, setPointerDragging] = useState<{
    fromSquare: string;
    piece: ChessPieceData;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    hasMoved: boolean;
  } | null>(null);

  useEffect(() => {
    if (!pointerDragging) return;

    const handleGlobalPointerMove = (e: PointerEvent) => {
      setPointerDragging((prev) => {
        if (!prev) return null;
        const dist = Math.hypot(e.clientX - prev.startX, e.clientY - prev.startY);
        return {
          ...prev,
          currentX: e.clientX,
          currentY: e.clientY,
          hasMoved: prev.hasMoved || dist > 4,
        };
      });

      const element = document.elementFromPoint(e.clientX, e.clientY);
      const squareEl = element?.closest("[id^='square-']");
      if (squareEl) {
        const sq = squareEl.id.replace("square-", "");
        setDraggedOverSquare(sq);
        setHoveredSquare(sq);
      } else {
        setDraggedOverSquare(null);
        setHoveredSquare(null);
      }
    };

    const handleGlobalPointerUp = (e: PointerEvent) => {
      const prev = pointerDragging;
      if (prev) {
        const element = document.elementFromPoint(e.clientX, e.clientY);
        const squareEl = element?.closest("[id^='square-']");

        if (squareEl) {
          const toSquare = squareEl.id.replace("square-", "");
          if (prev.fromSquare === "palette") {
            onPieceDrop("palette", toSquare, prev.piece);
          } else if (prev.fromSquare !== toSquare) {
            onPieceDrop(prev.fromSquare, toSquare);
          } else {
            if (!prev.hasMoved) {
              onSquareClick(toSquare);
            }
          }
        } else {
          if (isEditor && prev.fromSquare !== "palette") {
            onPieceDragOff(prev.fromSquare);
          }
        }
      }

      setPointerDragging(null);
      setDraggingSquare(null);
      setDraggedOverSquare(null);
      setHoveredSquare(null);
    };

    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);

    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerUp);
    };
  }, [pointerDragging, isEditor, onPieceDrop, onSquareClick, onPieceDragOff]);

  const handlePiecePointerDown = (e: React.PointerEvent, squareName: string, piece: ChessPieceData) => {
    if (e.button !== 0) return;
    const isTurnPlayerPiece = isEditor || (currentTurn === piece.color);
    const canDrag = isTurnPlayerPiece && !promotionPending;
    if (!canDrag) return;

    e.preventDefault();
    e.stopPropagation();

    const actualFromSq = (piece.isExpanded && piece.expandedSquares)
      ? (piece.expandedSquares[0] || squareName)
      : squareName;

    setPointerDragging({
      fromSquare: actualFromSq,
      piece,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      hasMoved: false,
    });
    setDraggingSquare(actualFromSq);

    if (!isEditor) {
      onSquareClick(actualFromSq);
    }
  };

  const handlePalettePiecePointerDown = (e: React.PointerEvent, pType: ChessPieceData["type"], pColor: "w" | "b") => {
    if (e.button !== 0 || !isEditor) return;
    e.preventDefault();
    e.stopPropagation();

    const brush = getBrushForPiece(pType, pColor);
    onSelectBrush?.(brush);

    setPointerDragging({
      fromSquare: "palette",
      piece: brush,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      hasMoved: false,
    });
  };

  const [touchDragging, setTouchDragging] = useState<{
    fromSquare: string;
    piece: ChessPieceData;
    x: number;
    y: number;
  } | null>(null);

  const handleTouchStart = (e: React.TouchEvent, square: string, piece: ChessPieceData) => {
    if (promotionPending) return;
    const canDrag = isEditor || (currentTurn === piece.color);
    if (!canDrag) return;

    const touch = e.touches[0];
    setTouchDragging({
      fromSquare: square,
      piece,
      x: touch.clientX,
      y: touch.clientY,
    });

    if (!isEditor) {
      onSquareClick(square);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchDragging) return;
    const touch = e.touches[0];
    setTouchDragging((prev) => (prev ? { ...prev, x: touch.clientX, y: touch.clientY } : null));

    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const squareEl = element?.closest("[id^='square-']");
    if (squareEl) {
      const sq = squareEl.id.replace("square-", "");
      if (sq !== draggedOverSquare) {
        setDraggedOverSquare(sq);
      }
    } else {
      setDraggedOverSquare(null);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchDragging) return;
    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const squareEl = element?.closest("[id^='square-']");
    
    if (squareEl) {
      const toSquare = squareEl.id.replace("square-", "");
      onPieceDrop(touchDragging.fromSquare, toSquare);
    }
    setTouchDragging(null);
    setDraggedOverSquare(null);
  };

  const handleDragOver = (e: React.DragEvent, square: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (draggedOverSquare !== square) {
      setDraggedOverSquare(square);
    }
  };

  const handleDragLeave = (e: React.DragEvent, square: string) => {
    setDraggedOverSquare((prev) => (prev === square ? null : prev));
  };

  const handleDrop = (e: React.DragEvent, toSquare: string) => {
    e.preventDefault();
    setDraggedOverSquare(null);
    setDraggingSquare(null);
    try {
      const dataStr = e.dataTransfer.getData("text/plain");
      if (!dataStr) return;

      const data = JSON.parse(dataStr);

      if (data && typeof data === "object" && "fromSquare" in data) {
        // Dragging a piece from another square on the board
        onPieceDrop(data.fromSquare, toSquare);
      } else if (data && typeof data === "object" && "type" in data && "color" in data) {
        // Dragging a new piece from the palette
        const piece = data as ChessPieceData;
        onPieceDrop("palette", toSquare, piece);
      }
    } catch (err) {
      console.error("Drop handling error", err);
    }
  };

  const handleDragEnd = (e: React.DragEvent, square: string) => {
    setDraggedOverSquare(null);
    setDraggingSquare(null);
    // If we dragged a piece off the board in editor mode, remove it
    if (isEditor && e.dataTransfer.dropEffect === "none") {
      onPieceDragOff(square);
    }
  };

  const targetSquare = promotionPending
    ? (promotionPending.isWizardSwap ? promotionPending.from : promotionPending.to)
    : null;

  return (
    <div id="chess-board-wrapper" className="flex flex-col items-center gap-5 w-full max-w-[560px]">
      {/* Board controls & themes */}
      <div className="flex justify-between items-center w-full px-1">
        <div className={`flex gap-1.5 p-1.5 rounded-xl border transition-colors ${
          isLight ? "bg-white border-slate-200 shadow-sm" : "bg-[#0f1115] border-slate-800"
        }`}>
          <button
            id="theme-elegant-btn"
            onClick={() => setTheme("elegant")}
            className={`w-7 h-7 rounded-lg transition-all ${
              theme === "elegant" ? "ring-2 ring-blue-500 scale-105" : "hover:opacity-80"
            }`}
            style={{ background: "linear-gradient(135deg, #3e444e 50%, #2a2e36 50%)" }}
            title="Elegant Dark"
          />
          <button
            id="theme-emerald-btn"
            onClick={() => setTheme("emerald")}
            className={`w-7 h-7 rounded-lg transition-all ${
              theme === "emerald" ? "ring-2 ring-emerald-400 scale-105" : "hover:opacity-80"
            }`}
            style={{ background: "linear-gradient(135deg, #f0d9b5 50%, #b58863 50%)" }}
            title="Emerald Walnut"
          />
          <button
            id="theme-olive-btn"
            onClick={() => setTheme("olive")}
            className={`w-7 h-7 rounded-lg transition-all ${
              theme === "olive" ? "ring-2 ring-lime-500 scale-105" : "hover:opacity-80"
            }`}
            style={{ background: "linear-gradient(135deg, #E1E1CE 50%, #749158 50%)" }}
            title="Olive Green (#749158 / #E1E1CE)"
          />
          <button
            id="theme-crimsonNavy-btn"
            onClick={() => setTheme("crimsonNavy")}
            className={`w-7 h-7 rounded-lg transition-all ${
              theme === "crimsonNavy" ? "ring-2 ring-red-500 scale-105" : "hover:opacity-80"
            }`}
            style={{ background: "linear-gradient(135deg, #BD4040 50%, #07324E 50%)" }}
            title="Crimson Navy (#BD4040 / #07324E)"
          />
        </div>

        <div className="flex gap-2">
          {onToggleRotation && (
            <button
              id="toggle-board-rotate-btn"
              disabled={rotateClickCount > 120}
              onClick={() => {
                if (rotateClickCount > 120) return;
                setRotateClickCount((prev) => prev + 1);
                onToggleRotation();
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold transition-colors shadow-sm ${
                rotateClickCount > 120
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
              } ${
                isLight
                  ? "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
                  : "bg-[#0f1115] border-slate-800 text-slate-300 hover:bg-slate-800"
              }`}
              title="Rotate Board 90° Clockwise"
            >
              <RotateCw className={`w-3.5 h-3.5 text-blue-500 ${rotateClickCount > 120 ? "animate-spin" : ""}`} />
              {getRotateButtonText()}
            </button>
          )}

          {mode === "vs_local" && onToggleFacingPieces && (
            <button
              id="toggle-facing-pieces-btn"
              onClick={onToggleFacingPieces}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold transition-colors shadow-sm cursor-pointer ${
                facingPieces 
                  ? "border-blue-500 bg-blue-500/10 text-blue-600" 
                  : isLight
                  ? "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
                  : "bg-[#0f1115] border-slate-800 text-slate-300 hover:bg-slate-800"
              }`}
              title="Align pieces to face each player"
            >
              <Compass className={`w-3.5 h-3.5 ${facingPieces ? "text-blue-500" : "text-slate-500"}`} />
              {facingPieces ? "Facing Players" : "Standard"}
            </button>
          )}

          <button
            id="toggle-board-flip-btn"
            onClick={onToggleFlip}
            className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer ${
              isLight
                ? "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
                : "bg-[#0f1115] border-slate-800 text-slate-300 hover:bg-slate-800"
            }`}
            title="Flip board view"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
            Flip View
          </button>
        </div>
      </div>      {/* --- TOP SECTION: PLAYER CARD + PILL + ACTION BUTTONS + BLACK PALETTE ROW --- */}
      {(() => {
        const topColor: "w" | "b" = flipped ? "w" : "b";
        const isTopTurn = !isEditor && currentTurn === topColor;
        const isTopOmniSelected =
          selectedBrush &&
          selectedBrush !== "eraser" &&
          selectedBrush.type === "x" &&
          selectedBrush.color === topColor;

        return (
          <div className="w-full flex flex-col gap-1 mb-0.5">
            <div className="w-full flex items-start justify-between gap-3">
              {/* Left Top Group: Player Badge + Menu Button */}
              <div className="flex flex-col gap-1">
                <div className="flex items-stretch gap-2.5">
                  <div className={`p-2.5 px-3.5 sm:p-3 sm:px-4 rounded-xl sm:rounded-2xl border flex items-center gap-3.5 transition-colors duration-200 ${
                    isTopTurn
                      ? "ring-2 ring-emerald-500/80 border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      : isLight
                      ? "bg-white border-slate-200 shadow-sm"
                      : "bg-[#0b0d11] border-slate-800"
                  }`}>
                    <div
                      onClick={() => handleSelectPalettePiece("x", topColor)}
                      draggable
                      onDragStart={(e) => handlePalettePieceDragStart(e, "x", topColor)}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border transition-all cursor-grab active:cursor-grabbing hover:scale-105 shrink-0 ${
                        isTopOmniSelected
                          ? "border-blue-500 bg-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.3)] ring-2 ring-blue-400"
                          : topColor === "w"
                          ? "bg-blue-500/15 border-blue-500/30 text-blue-500 hover:border-blue-400"
                          : "bg-blue-900/30 border-blue-500/40 text-blue-400 hover:border-blue-400"
                      }`}
                      title={`Easter Egg: Drag or Click ${topColor === "w" ? "White" : "Black"} Omni Piece`}
                    >
                      <ChessPiece
                        type="x"
                        color={topColor}
                        className="w-7 h-7 sm:w-8 sm:h-8"
                        draggable
                        onDragStart={(e) => handlePalettePieceDragStart(e, "x", topColor)}
                        onClick={() => handleSelectPalettePiece("x", topColor)}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 min-h-[22px]">
                        <div className="text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
                          {topColor === "w" ? "WHITE" : "BLACK"} {isVsComputer ? "(COMPUTER)" : "(LOCAL)"}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-sm transition-opacity duration-200 ${
                            isTopTurn ? "opacity-100" : "opacity-0 pointer-events-none"
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                          Turn
                        </span>
                      </div>
                      <div className={`text-sm sm:text-base font-extrabold ${isLight ? "text-slate-900" : "text-slate-200"}`}>
                        {isVsComputer
                          ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
                          : topColor === "w" ? "Player 1" : "Player 2"
                        }
                      </div>
                    </div>
                  </div>

                  {/* Hamburger Menu Button */}
                  {isEditor && (
                    <div className="relative flex" ref={menuRef}>
                      <button
                        id="board-actions-menu-btn"
                        onClick={() => setIsMenuOpen((prev) => !prev)}
                        className={`px-3.5 sm:px-4 rounded-xl sm:rounded-2xl border flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-105 ${
                          isMenuOpen
                            ? "border-blue-500 bg-blue-500/20 ring-2 ring-blue-400"
                            : isLight
                            ? "bg-white border-slate-300 text-slate-900 hover:bg-slate-100"
                            : "bg-[#0b0d11] border-slate-700 text-slate-100 hover:bg-slate-800"
                        }`}
                        title="Board Actions Menu"
                      >
                        <Menu className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
                      </button>

                      {/* Dropdown Menu */}
                      {isMenuOpen && (
                        <div
                          id="board-actions-dropdown"
                          className={`absolute left-0 top-12 z-50 w-44 p-1.5 rounded-xl border shadow-xl flex flex-col gap-1 backdrop-blur-md animate-fade-in ${
                            isLight
                              ? "bg-white/95 border-slate-200 text-slate-900 shadow-slate-300/50"
                              : "bg-[#0f1115]/95 border-slate-800 text-slate-100 shadow-black/60"
                          }`}
                        >
                          <button
                            id="action-standard-set-btn"
                            onClick={() => {
                              onResetBoard?.();
                              setIsMenuOpen(false);
                            }}
                            className={`w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
                              isLight ? "hover:bg-slate-100 text-slate-800" : "hover:bg-slate-800 text-slate-200"
                            }`}
                          >
                            <RotateCcw className="w-4 h-4 text-blue-500" />
                            <span>Standard Set</span>
                          </button>

                          <button
                            id="action-eraser-tool-btn"
                            onClick={() => {
                              onSelectBrush?.(selectedBrush === "eraser" ? null : "eraser");
                              setIsMenuOpen(false);
                            }}
                            className={`w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
                              selectedBrush === "eraser"
                                ? "bg-rose-500/20 text-rose-500"
                                : isLight
                                ? "hover:bg-slate-100 text-slate-800"
                                : "hover:bg-slate-800 text-slate-200"
                            }`}
                          >
                            <Trash2 className="w-4 h-4 text-slate-400" />
                            <span>Eraser Tool</span>
                          </button>

                          <button
                            id="action-clear-board-btn"
                            onClick={() => {
                              onClearBoard?.();
                              setIsMenuOpen(false);
                            }}
                            className={`w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
                              isLight ? "hover:bg-rose-50 text-rose-600" : "hover:bg-rose-950/40 text-rose-400"
                            }`}
                          >
                            <Trash2 className="w-4 h-4 text-rose-500" />
                            <span>Clear Board</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Top Piece Palette Row */}
                {isEditor && (
                  <div className="flex items-center gap-1.5 sm:gap-2 pt-0.5">
                    {paletteTypes.map((pType) => {
                      const pieceIsJumbo = isJumboMode && pType !== "z";
                      const isSelected =
                        selectedBrush &&
                        selectedBrush !== "eraser" &&
                        selectedBrush.type === pType &&
                        selectedBrush.color === topColor &&
                        Boolean(selectedBrush.isExpanded) === Boolean(pieceIsJumbo);

                      return (
                        <button
                          key={`top-palette-${pType}`}
                          id={`palette-piece-top-${pType}`}
                          onClick={() => handleSelectPalettePiece(pType, topColor)}
                          draggable
                          onPointerDown={(e) => handlePalettePiecePointerDown(e, pType, topColor)}
                          onDragStart={(e) => handlePalettePieceDragStart(e, pType, topColor)}
                          className={`relative w-11 h-11 sm:w-12 sm:h-12 md:w-13 md:h-13 rounded-xl border flex items-center justify-center p-0.5 transition-all cursor-grab active:cursor-grabbing hover:scale-105 ${
                            isSelected
                              ? "border-blue-500 bg-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.3)] ring-2 ring-blue-400"
                              : isLight
                              ? "border-slate-300 bg-slate-100 hover:border-slate-400"
                              : "border-slate-800 bg-[#0b0d11] hover:border-slate-700 hover:bg-slate-800/80"
                          }`}
                          title={`${topColor === "w" ? "White" : "Black"} ${pType} (Drag or Click to Brush)`}
                        >
                          <ChessPiece type={pType} color={topColor} className="w-9 h-9 sm:w-10 sm:h-10" />
                          <div
                            className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border ${
                              topColor === "w" ? "bg-white border-slate-900" : "bg-slate-800 border-slate-400"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Actual Chess Board Grid */}
      <div
        className={`relative w-full aspect-square ${
          isBoardDragging ? "" : "transition-transform duration-500"
        } ${isEmptyBoard ? "z-50 relative" : ""}`}
        style={{
          transform: `translate(${boardDragOffset.x}px, ${boardDragOffset.y}px)`,
        }}
      >
        <div
          id="chess-grid"
          onPointerDown={handleBoardPointerDown}
          onPointerMove={handleBoardPointerMove}
          onPointerUp={handleBoardPointerUp}
          onPointerCancel={handleBoardPointerUp}
          className={`relative w-full h-full p-2.5 rounded-2xl border-[12px] select-none ${
            isBoardDragging ? "" : "transition-transform duration-500"
          } ${
            rotateClickCount > 120 ? "animate-spin" : ""
          } ${
            isEmptyBoard
              ? isBoardDragging
                ? "cursor-grabbing shadow-[0_25px_60px_rgba(0,0,0,0.5)]"
                : "cursor-grab hover:shadow-2xl"
              : ""
          } ${
            isLight
              ? "bg-slate-100 border-slate-300 shadow-xl"
              : "bg-[#12141a] border-[#1e2128] shadow-2xl"
          }`}
          style={
            rotateClickCount > 120
              ? undefined
              : {
                  transform: `rotate(${rotation + boardDragRotation}deg)`,
                }
          }
        >
        <div className="w-full h-full grid grid-cols-8 grid-rows-8 rounded overflow-visible border border-slate-950/20">
          {(() => {
            // Pre-calculate Jumbo piece sets for selection, valid moves, and drag previews
            const selectedPiece = selectedSquare ? board[selectedSquare] : null;
            const draggedPiece = draggingSquare ? board[draggingSquare] : null;
            const isDraggingJumbo = Boolean(draggedPiece?.isExpanded);
            const isSelectedJumbo = Boolean(selectedPiece?.isExpanded);
            const selectedJumboSquares = new Set<string>(
              isSelectedJumbo && selectedPiece?.expandedSquares ? selectedPiece.expandedSquares : []
            );

            const isBrushJumbo = Boolean(selectedBrush && selectedBrush !== "eraser" && selectedBrush?.isExpanded);
            const isTouchJumbo = Boolean(touchDragging?.piece?.isExpanded);
            const isMovingJumbo = isSelectedJumbo || isDraggingJumbo || isBrushJumbo || isTouchJumbo;

            // Map of squareName -> block 2x2 squares array for valid jumbo move target
            const validJumboBlockMap = new Map<string, string[]>();
            const validJumboRedDotSet = new Set<string>();

            if (isSelectedJumbo || isDraggingJumbo) {
              for (const anchor of validMoves) {
                const block = getJumbo2x2Squares(anchor);
                let minR = 999;
                let minF = 999;
                let redDotSq = block[0];
                for (const sq of block) {
                  const fIdx = displayFiles.indexOf(sq[0]);
                  const rIdx = displayRanks.indexOf(sq[1]);
                  if (rIdx < minR || (rIdx === minR && fIdx < minF)) {
                    minR = rIdx;
                    minF = fIdx;
                    redDotSq = sq;
                  }
                }
                validJumboRedDotSet.add(redDotSq);
                for (const sq of block) {
                  validJumboBlockMap.set(sq, block);
                }
              }
            }

            const activeHoverSquare = draggedOverSquare || hoveredSquare;

            let hoveredJumboSquares: string[] = [];
            let hoveredRedDotSquare: string | null = null;

            if (activeHoverSquare && (isMovingJumbo || (isEditor && isBrushJumbo))) {
              hoveredJumboSquares = getJumbo2x2Squares(activeHoverSquare);
              if (hoveredJumboSquares.length === 4) {
                let minR = 999;
                let minF = 999;
                for (const sq of hoveredJumboSquares) {
                  const fIdx = displayFiles.indexOf(sq[0]);
                  const rIdx = displayRanks.indexOf(sq[1]);
                  if (rIdx < minR || (rIdx === minR && fIdx < minF)) {
                    minR = rIdx;
                    minF = fIdx;
                    hoveredRedDotSquare = sq;
                  }
                }
              }
            }

            // Edge helper to draw 2x2 block outer border
            const get2x2BlockEdgeClasses = (blockSquares: string[], squareName: string, borderColorClass: string) => {
              if (!blockSquares || blockSquares.length < 4) return borderColorClass;

              const file = squareName[0];
              const rank = squareName[1];
              const fIdx = displayFiles.indexOf(file);
              const rIdx = displayRanks.indexOf(rank);

              const topSq = rIdx - 1 >= 0 ? `${displayFiles[fIdx]}${displayRanks[rIdx - 1]}` : null;
              const botSq = rIdx + 1 < 8 ? `${displayFiles[fIdx]}${displayRanks[rIdx + 1]}` : null;
              const leftSq = fIdx - 1 >= 0 ? `${displayFiles[fIdx - 1]}${displayRanks[rIdx]}` : null;
              const rightSq = fIdx + 1 < 8 ? `${displayFiles[fIdx + 1]}${displayRanks[rIdx]}` : null;

              const borderT = !topSq || !blockSquares.includes(topSq) ? "border-t-2" : "";
              const borderB = !botSq || !blockSquares.includes(botSq) ? "border-b-2" : "";
              const borderL = !leftSq || !blockSquares.includes(leftSq) ? "border-l-2" : "";
              const borderR = !rightSq || !blockSquares.includes(rightSq) ? "border-r-2" : "";

              return `${borderT} ${borderB} ${borderL} ${borderR} ${borderColorClass}`;
            };

            const validMovesSet = new Set(validMoves);

            return displayRanks.map((rank, rIdx) => {
              return displayFiles.map((file, fIdx) => {
                const squareName = `${file}${rank}`;
                const piece = board[squareName];
                
                // Determine if tile is light or dark
                const isLight = (parseInt(rank) + file.charCodeAt(0)) % 2 !== 0;
                const tileTheme = isLight ? themeClasses[theme].light : themeClasses[theme].dark;

                const isSelected = selectedSquare === squareName;
                const isValidTarget = validMovesSet.has(squareName);
                const hasPiece = !!piece;
                const isCheckSquare = kingInCheckSquare ? (kingInCheckSquare === squareName || Boolean(piece?.isExpanded && piece.expandedSquares?.includes(kingInCheckSquare))) : false;
                
                const isLastMoveSrc = lastMove?.from === squareName;
                const isLastMoveDst = lastMove?.to === squareName;
                const isDraggedOver = draggedOverSquare === squareName;
                const isLegalDragTarget = isDraggedOver && isValidTarget;
                const isIllegalDragTarget = isDraggedOver && !isValidTarget;

                // Jumbo Highlights
                const isHoveredJumboSquare = hoveredJumboSquares.includes(squareName);
                const isHoveredJumboValid = activeHoverSquare && (
                  isEditor || 
                  validMoves.includes(activeHoverSquare) || 
                  ((selectedPiece?.isExpanded || isDraggingJumbo) && validMoves.some(anchor => getJumbo2x2Squares(anchor).includes(activeHoverSquare)))
                );
                const isSelectedJumboSquare = selectedJumboSquares.has(squareName);

                const isPartOfValidJumboMove = validJumboBlockMap.has(squareName);
                const validJumboBlock = validJumboBlockMap.get(squareName);
                const isRedDotSquare = validJumboRedDotSet.has(squareName);
                const isHoveredRedDotSquare = hoveredJumboSquares.length === 4 && squareName === hoveredRedDotSquare;
                const showRedDot = (isSelectedJumbo && isRedDotSquare) || isHoveredRedDotSquare;

                let jumboHighlightClasses = "";
                if (isHoveredJumboSquare) {
                  jumboHighlightClasses = isHoveredJumboValid
                    ? get2x2BlockEdgeClasses(hoveredJumboSquares, squareName, "border-emerald-400 bg-emerald-500/35 z-30 shadow-[0_0_20px_rgba(52,211,153,0.5)]")
                    : get2x2BlockEdgeClasses(hoveredJumboSquares, squareName, "border-rose-500 bg-rose-500/25 z-30");
                } else if (isSelectedJumboSquare && selectedPiece?.expandedSquares) {
                  jumboHighlightClasses = get2x2BlockEdgeClasses(selectedPiece.expandedSquares, squareName, "border-purple-400 bg-purple-500/25 z-20");
                } else if (isPartOfValidJumboMove && validJumboBlock) {
                  jumboHighlightClasses = get2x2BlockEdgeClasses(validJumboBlock, squareName, "border-teal-400 bg-teal-500/30 z-10");
                }

                return (
                  <div
                    key={squareName}
                    id={`square-${squareName}`}
                    onDragOver={(e) => handleDragOver(e, squareName)}
                    onDragLeave={(e) => handleDragLeave(e, squareName)}
                    onDrop={(e) => handleDrop(e, squareName)}
                    onMouseEnter={() => {
                      if (isMovingJumbo || isBrushJumbo) {
                        setHoveredSquare(squareName);
                      }
                    }}
                    onMouseLeave={() => {
                      if (hoveredSquare) {
                        setHoveredSquare(null);
                      }
                    }}
                    onClick={() => onSquareClick(squareName)}
                    className={`relative flex items-center justify-center cursor-pointer transition-colors duration-150 ${tileTheme} ${
                      isLastMoveSrc || isLastMoveDst
                        ? "ring-4 ring-blue-450/40 ring-inset bg-blue-500/10"
                        : ""
                    } ${
                      isSelected && !isSelectedJumboSquare
                        ? "ring-4 ring-blue-500/60 ring-inset bg-blue-500/10"
                        : ""
                    } ${
                      isLegalDragTarget && !isHoveredJumboSquare
                        ? "ring-4 ring-emerald-400/90 bg-emerald-500/25 scale-95 z-20 transition-all"
                        : isIllegalDragTarget && !isHoveredJumboSquare
                        ? "ring-2 ring-rose-500/50 bg-rose-500/15 z-20 transition-all"
                        : isDraggedOver && !isHoveredJumboSquare
                        ? "bg-slate-100/30 scale-95 transition-all"
                        : ""
                    } ${jumboHighlightClasses} ${
                      promotionPending && targetSquare === squareName ? "z-50" : ""
                    } ${
                      rIdx === 0 && fIdx === 0 ? "rounded-tl" : ""
                    } ${
                      rIdx === 0 && fIdx === 7 ? "rounded-tr" : ""
                    } ${
                      rIdx === 7 && fIdx === 0 ? "rounded-bl" : ""
                    } ${
                      rIdx === 7 && fIdx === 7 ? "rounded-br" : ""
                    }`}
                  >
                  {/* Pieces */}
                  {hasPiece && (() => {
                    if (piece.isExpanded && piece.expandedSquares) {
                      let minRowIdx = 999;
                      let minColIdx = 999;
                      let anchorSq = piece.expandedSquares[0];
                      for (const sq of piece.expandedSquares) {
                        const f = sq[0];
                        const r = sq[1];
                        const rowI = displayRanks.indexOf(r);
                        const colI = displayFiles.indexOf(f);
                        if (rowI < minRowIdx || (rowI === minRowIdx && colI < minColIdx)) {
                          minRowIdx = rowI;
                          minColIdx = colI;
                          anchorSq = sq;
                        }
                      }
                      if (squareName !== anchorSq) {
                        return null;
                      }
                    }

                    let pieceRotation = -rotation;
                    if (mode === "vs_local" && facingPieces) {
                      if (piece.color === "w") {
                        pieceRotation = flipped ? 180 : 0;
                      } else {
                        pieceRotation = flipped ? 0 : 180;
                      }
                    }

                    const isTurnPlayerPiece = isEditor || (currentTurn === piece.color);
                    const canDrag = isTurnPlayerPiece && !promotionPending;
                    const isExpanded = piece.isExpanded;

                    return (
                      <div
                        key={`${piece.color}-${piece.type}-${squareName}${isExpanded ? "-exp" : ""}`}
                        id={`piece-${piece.color}-${piece.type}-${squareName}`}
                        draggable={canDrag}
                        onPointerDown={(e) => handlePiecePointerDown(e, squareName, piece)}
                        onDragStart={(e) => {
                          if (!canDrag) {
                            e.preventDefault();
                            return;
                          }
                          handleDragStart(e, squareName);
                        }}
                        onDragEnd={(e) => handleDragEnd(e, squareName)}
                        onTouchStart={(e) => handleTouchStart(e, squareName, piece)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className={`${
                          isExpanded
                            ? "absolute top-0 left-0 w-[200%] h-[200%] z-30 p-1"
                            : "w-4/5 h-4/5 z-10"
                        } flex items-center justify-center transition-transform duration-150 ${
                          canDrag ? "cursor-grab active:cursor-grabbing hover:scale-105" : "cursor-pointer"
                        } ${
                          draggingSquare === squareName || pointerDragging?.fromSquare === squareName || touchDragging?.fromSquare === squareName
                            ? "opacity-20 scale-90"
                            : ""
                        }`}
                        style={{ transform: `rotate(${pieceRotation}deg)` }}
                      >
                        <ChessPiece type={piece.type} color={piece.color} className="w-full h-full drop-shadow-md" />
                      </div>
                    );
                  })()}

                  {/* King Check Red Pulse */}
                  {isCheckSquare && (
                    <div className="absolute inset-0 bg-red-600/30 ring-4 ring-red-600/60 ring-inset animate-pulse z-0 rounded-sm" />
                  )}

                  {/* Move Helper Overlay for 1x1 pieces */}
                  {!isSelectedJumbo && isValidTarget && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                      {hasPiece ? (
                        // Captured indicator: Blue outer circle
                        <div className="w-4/5 h-4/5 border-4 border-blue-500/80 rounded-full animate-ping" />
                      ) : (
                        // Regular move: translucent blue circle
                        <div className="w-3.5 h-3.5 bg-blue-500/60 rounded-full shadow-sm" />
                      )}
                    </div>
                  )}

                  {/* Red Dot at center intersection of 2x2 target block */}
                  {showRedDot && (
                    <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 bg-red-600 rounded-full z-40 shadow-[0_0_12px_rgba(220,38,38,0.9)] ring-2 ring-white pointer-events-none animate-pulse flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full opacity-90" />
                    </div>
                  )}

                  {/* Chess Notation Coordinates */}
                  {/* File labels on bottom rank */}
                  {rIdx === 7 && (
                    <span 
                      className="absolute bottom-1 right-1.5 text-[9px] font-bold leading-none opacity-50 select-none uppercase"
                      style={{ transform: `rotate(${-rotation}deg)` }}
                    >
                      {file}
                    </span>
                  )}
                  {/* Rank labels on left-most column */}
                  {fIdx === 0 && (
                    <span 
                      className="absolute top-1 left-1.5 text-[9px] font-bold leading-none opacity-50 select-none"
                      style={{ transform: `rotate(${-rotation}deg)` }}
                    >
                      {rank}
                    </span>
                  )}

                  {/* Comic Speech Bubble Promotion Popup */}
                  {promotionPending && targetSquare === squareName && (() => {
                    let promoRotation = -rotation;
                    if (mode === "vs_local" && facingPieces) {
                      if (promotionPending.color === "w") {
                        promoRotation = flipped ? 180 : 0;
                      } else {
                        promoRotation = flipped ? 0 : 180;
                      }
                    }
                    return (
                      <>
                        <div
                          id="promotion-backdrop"
                          className="fixed inset-0 z-40 bg-black/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onCancelPromotion) onCancelPromotion();
                          }}
                        />
                        <div
                          className={`absolute z-50 ${
                            rIdx === 0 ? "top-full mt-3" : "bottom-full mb-3"
                          } ${
                            fIdx === 0 
                              ? "left-0 translate-x-0" 
                              : fIdx === 7 
                              ? "right-0 left-auto translate-x-0" 
                              : "left-1/2 -translate-x-1/2"
                          } bg-white border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_#000000] text-black animate-fade-in`}
                          style={{ transform: `rotate(${promoRotation}deg)` }}
                          onClick={(e) => e.stopPropagation()}
                        >
                        {/* Tail */}
                        {rIdx === 0 ? (
                          <div className={`absolute top-0 -translate-y-1/2 ${
                            fIdx === 0 ? "left-6" : fIdx === 7 ? "right-6 left-auto" : "left-1/2 -translate-x-1/2"
                          } w-4 h-4 bg-white border-l-[3px] border-t-[3px] border-black rotate-45 z-0`} />
                        ) : (
                          <div className={`absolute bottom-0 translate-y-1/2 ${
                            fIdx === 0 ? "left-6" : fIdx === 7 ? "right-6 left-auto" : "left-1/2 -translate-x-1/2"
                          } w-4 h-4 bg-white border-r-[3px] border-b-[3px] border-black rotate-45 z-0`} />
                        )}
                        
                        {/* Speech Bubble Content */}
                        <div className="relative z-10 flex flex-col items-center gap-1.5 p-2.5 min-w-[190px]">
                          <span className="text-[10px] font-black tracking-wider text-black uppercase font-mono">
                            PROMOTE PAWN!
                          </span>
                          <div className="flex gap-2">
                            {(["q", "r", "b", "n"] as const).map((type) => (
                              <button
                                key={type}
                                id={`promote-to-${type}-btn`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectPromotion(type);
                                }}
                                className="w-10 h-10 flex items-center justify-center bg-blue-50 hover:bg-blue-200 border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000000] active:translate-y-0 active:shadow-[1px_1px_0px_0px_#000000] transition-all cursor-pointer"
                                title={type === "q" ? "Queen" : type === "r" ? "Rook" : type === "b" ? "Bishop" : "Knight"}
                              >
                                <div className="w-7 h-7">
                                  <ChessPiece type={type} color={promotionPending.color} />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                  })()}
                </div>
              );
            });
          });
        })()}
        </div>
      </div>
    </div>

      {/* --- BOTTOM SECTION: WHITE PALETTE ROW + PLAYER CARD + PILL --- */}
      {(() => {
        const bottomColor: "w" | "b" = flipped ? "b" : "w";
        const isBottomTurn = !isEditor && currentTurn === bottomColor;
        const isBottomOmniSelected =
          selectedBrush &&
          selectedBrush !== "eraser" &&
          selectedBrush.type === "x" &&
          selectedBrush.color === bottomColor;

        return (
          <div className="w-full flex flex-col gap-1 mt-0.5">
            {/* Bottom Piece Palette Row */}
            {isEditor && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {paletteTypes.map((pType) => {
                  const pieceIsJumbo = isJumboMode && pType !== "z";
                  const isSelected =
                    selectedBrush &&
                    selectedBrush !== "eraser" &&
                    selectedBrush.type === pType &&
                    selectedBrush.color === bottomColor &&
                    Boolean(selectedBrush.isExpanded) === Boolean(pieceIsJumbo);

                  return (
                    <button
                      key={`bottom-palette-${pType}`}
                      id={`palette-piece-bottom-${pType}`}
                      onClick={() => handleSelectPalettePiece(pType, bottomColor)}
                      draggable
                      onPointerDown={(e) => handlePalettePiecePointerDown(e, pType, bottomColor)}
                      onDragStart={(e) => handlePalettePieceDragStart(e, pType, bottomColor)}
                      className={`relative w-11 h-11 sm:w-12 sm:h-12 md:w-13 md:h-13 rounded-xl border flex items-center justify-center p-0.5 transition-all cursor-grab active:cursor-grabbing hover:scale-105 ${
                        isSelected
                          ? "border-blue-500 bg-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.3)] ring-2 ring-blue-400"
                          : isLight
                          ? "border-slate-300 bg-slate-100 hover:border-slate-400"
                          : "border-slate-800 bg-[#0b0d11] hover:border-slate-700 hover:bg-slate-800/80"
                      }`}
                      title={`${bottomColor === "w" ? "White" : "Black"} ${pType} (Drag or Click to Brush)`}
                    >
                      <ChessPiece type={pType} color={bottomColor} className="w-9 h-9 sm:w-10 sm:h-10" />
                      <div
                        className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border ${
                          bottomColor === "w" ? "bg-white border-slate-900" : "bg-slate-800 border-slate-400"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Bottom Player Card + Pill */}
            <div className="flex items-center gap-2.5">
              <div className={`p-2.5 px-3.5 sm:p-3 sm:px-4 rounded-xl sm:rounded-2xl border flex items-center gap-3.5 transition-colors duration-200 ${
                isBottomTurn
                  ? "ring-2 ring-emerald-500/80 border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  : isLight
                  ? "bg-white border-slate-200 shadow-sm"
                  : "bg-[#0b0d11] border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.15)]"
              }`}>
                <div
                  onClick={() => handleSelectPalettePiece("x", bottomColor)}
                  draggable
                  onDragStart={(e) => handlePalettePieceDragStart(e, "x", bottomColor)}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center border transition-all cursor-grab active:cursor-grabbing hover:scale-105 shrink-0 ${
                    isBottomOmniSelected
                      ? "border-blue-500 bg-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.3)] ring-2 ring-blue-400"
                      : "bg-red-900/30 border border-red-500/50 hover:border-red-400"
                  }`}
                  title={`Easter Egg: Drag or Click ${bottomColor === "w" ? "White" : "Black"} Omni Piece`}
                >
                  <ChessPiece
                    type="x"
                    color={bottomColor}
                    className="w-7 h-7 sm:w-8 sm:h-8"
                    draggable
                    onDragStart={(e) => handlePalettePieceDragStart(e, "x", bottomColor)}
                    onClick={() => handleSelectPalettePiece("x", bottomColor)}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 min-h-[22px]">
                    <div className="text-[11px] sm:text-xs text-blue-500 font-bold uppercase tracking-wider">
                      {bottomColor === "w" ? "WHITE (YOU)" : "BLACK (YOU)"}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-sm transition-opacity duration-200 ${
                        isBottomTurn ? "opacity-100" : "opacity-0 pointer-events-none"
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                      Turn
                    </span>
                  </div>
                  <div className={`text-sm sm:text-base font-extrabold ${isLight ? "text-slate-900" : "text-slate-200"}`}>
                    {mode === "vs_local" ? (bottomColor === "w" ? "Player 1" : "Player 2") : "User_Active_Chess"}
                  </div>
                </div>
              </div>


            </div>
          </div>
        );
      })()}

      {/* Editor trash zone helper */}
      {isEditor && (
        <div
          id="editor-trash-zone"
          className={`w-full py-3.5 px-4 border border-dashed rounded-xl flex items-center justify-center gap-2 text-xs text-center transition-colors hover:bg-rose-500/5 hover:border-rose-500/40 hover:text-rose-500 group ${
            isLight
              ? "bg-slate-50 border-slate-300 text-slate-600"
              : "bg-slate-900/50 border-slate-800 text-slate-500"
          }`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            try {
              const dataStr = e.dataTransfer.getData("text/plain");
              if (!dataStr) return;
              const data = JSON.parse(dataStr);
              if (data.fromSquare) {
                onPieceDragOff(data.fromSquare);
              }
            } catch (err) {
              console.error(err);
            }
          }}
        >
          <Trash2 className="w-4 h-4 group-hover:text-rose-500 transition-colors" />
          <span>Drag board pieces here to delete them</span>
        </div>
      )}
      {/* Floating Pointer Drag Preview (Snapped to Cursor) */}
      {pointerDragging && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)] scale-110"
          style={{
            left: pointerDragging.currentX,
            top: pointerDragging.currentY,
            width: pointerDragging.piece.isExpanded ? "120px" : "60px",
            height: pointerDragging.piece.isExpanded ? "120px" : "60px",
          }}
        >
          <ChessPiece
            type={pointerDragging.piece.type}
            color={pointerDragging.piece.color}
            className="w-full h-full drop-shadow-lg"
          />
        </div>
      )}
      {/* Floating Touch Drag Preview */}
      {touchDragging && (
        <div
          className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-blue-500/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-blue-400 shadow-2xl animate-pulse"
          style={{ left: touchDragging.x, top: touchDragging.y }}
        >
          <div className="w-10 h-10">
            <ChessPiece type={touchDragging.piece.type} color={touchDragging.piece.color} />
          </div>
        </div>
      )}
    </div>
  );
};
