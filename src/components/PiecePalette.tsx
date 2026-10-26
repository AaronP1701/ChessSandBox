import React, { useState } from "react";
import { ChessPiece } from "./ChessPieces";
import { ChessPieceData, UITheme } from "../types";
import { Trash2, RotateCcw, ShieldAlert, Sparkles, Maximize2, X } from "lucide-react";

interface PiecePaletteProps {
  selectedBrush: ChessPieceData | "eraser" | null;
  onSelectBrush: (brush: ChessPieceData | "eraser" | null) => void;
  onClearBoard: () => void;
  onResetBoard: () => void;
  uiTheme?: UITheme;
  onClose?: () => void;
}

export const PiecePalette: React.FC<PiecePaletteProps> = ({
  selectedBrush,
  onSelectBrush,
  onClearBoard,
  onResetBoard,
  uiTheme = "dark",
  onClose,
}) => {
  const isLight = uiTheme === "light";
  const [isJumboMode, setIsJumboMode] = useState(false);

  const pieces: ChessPieceData[] = [
    { type: "p", color: "w" },
    { type: "n", color: "w" },
    { type: "b", color: "w" },
    { type: "r", color: "w" },
    { type: "q", color: "w" },
    { type: "k", color: "w" },
    { type: "z", color: "w" },
    { type: "x", color: "w" },
    { type: "p", color: "b" },
    { type: "n", color: "b" },
    { type: "b", color: "b" },
    { type: "r", color: "b" },
    { type: "q", color: "b" },
    { type: "k", color: "b" },
    { type: "z", color: "b" },
    { type: "x", color: "b" },
  ];

  const getBrushForPiece = (piece: ChessPieceData): ChessPieceData => {
    return isJumboMode && piece.type !== "z" && piece.type !== "x"
      ? { ...piece, isExpanded: true }
      : { ...piece, isExpanded: false };
  };

  const handleDragStart = (e: React.DragEvent, piece: ChessPieceData) => {
    const brush = getBrushForPiece(piece);
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

  const handleSelectPiece = (piece: ChessPieceData) => {
    const brush = getBrushForPiece(piece);
    const isSelected =
      selectedBrush &&
      selectedBrush !== "eraser" &&
      selectedBrush.type === piece.type &&
      selectedBrush.color === piece.color &&
      Boolean(selectedBrush.isExpanded) === Boolean(isJumboMode);

    onSelectBrush(isSelected ? null : brush);
  };

  return (
    <div
      id="piece-palette-container"
      className={`${
        isLight
          ? "bg-white border-slate-200 text-slate-800 shadow-xl"
          : "bg-[#0f1115] border-slate-800 text-slate-200 shadow-2xl"
      } border rounded-2xl p-5 flex flex-col gap-5 w-full transition-colors duration-200`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold tracking-widest text-blue-500 uppercase flex items-center gap-2 mb-1.5 font-sans">
            <Sparkles className="w-4 h-4 text-blue-500" />
            SETUP TOOLS
          </h3>
          <p className={`text-[11px] font-medium ${isLight ? "text-slate-600" : "text-slate-400"}`}>
            Drag chess pieces onto the board, or select any piece brush below to paint custom patterns directly on squares.
          </p>
        </div>
        {onClose && (
          <button
            id="close-palette-modal-btn"
            onClick={onClose}
            className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
              isLight
                ? "border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700"
                : "border-slate-800 bg-slate-800/60 hover:bg-slate-700 text-slate-300"
            }`}
            title="Close Tools"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Jumbo Pieces Mode Toggle */}
      <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
        isJumboMode
          ? "bg-purple-500/10 border-purple-500 text-purple-400"
          : isLight
          ? "bg-slate-50 border-slate-200 text-slate-700"
          : "bg-[#0a0b0d]/80 border-slate-800 text-slate-300"
      }`}>
        <div className="flex items-center gap-2 text-xs font-bold">
          <Maximize2 className={`w-4 h-4 ${isJumboMode ? "text-purple-400 animate-pulse" : "text-blue-500"}`} />
          <span>Jumbo Pieces (2x2)</span>
        </div>
        <button
          id="toggle-jumbo-mode-btn"
          onClick={() => {
            const next = !isJumboMode;
            setIsJumboMode(next);
            if (selectedBrush && selectedBrush !== "eraser") {
              const shouldExpand = next && selectedBrush.type !== "z" && selectedBrush.type !== "x";
              onSelectBrush({ ...selectedBrush, isExpanded: shouldExpand });
            }
          }}
          className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
            isJumboMode
              ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
              : isLight
              ? "bg-slate-200 hover:bg-slate-300 text-slate-800"
              : "bg-slate-800 hover:bg-slate-700 text-slate-300"
          }`}
        >
          {isJumboMode ? "Jumbo ON (2x2)" : "Standard (1x1)"}
        </button>
      </div>

      {/* Brush Tools Selection */}
      <div className="grid grid-cols-8 gap-1 sm:gap-1.5">
        {pieces.map((piece, idx) => {
          const pieceIsJumbo = isJumboMode && piece.type !== "z" && piece.type !== "x";
          const isSelected =
            selectedBrush &&
            selectedBrush !== "eraser" &&
            selectedBrush.type === piece.type &&
            selectedBrush.color === piece.color &&
            Boolean(selectedBrush.isExpanded) === Boolean(pieceIsJumbo);

          return (
            <button
              key={`${piece.color}-${piece.type}-${idx}`}
              id={`palette-piece-${piece.color}-${piece.type}`}
              onClick={() => handleSelectPiece(piece)}
              draggable
              onDragStart={(e) => handleDragStart(e, piece)}
              className={`relative aspect-square rounded-lg border flex items-center justify-center p-0.5 transition-all duration-200 cursor-grab active:cursor-grabbing hover:scale-105 ${
                isSelected
                  ? pieceIsJumbo
                    ? "border-purple-500 bg-purple-500/20 shadow-[0_0_14px_rgba(168,85,247,0.3)] ring-2 ring-purple-400"
                    : "border-blue-500 bg-blue-500/10 shadow-[0_0_14px_rgba(59,130,246,0.2)]"
                  : isLight
                  ? "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
                  : "border-slate-800 bg-[#0a0b0d]/85 hover:border-slate-700 hover:bg-[#1e2128]/60"
              }`}
              title={`${piece.color === "w" ? "White" : "Black"} ${
                piece.type === "p"
                  ? "Pawn"
                  : piece.type === "r"
                  ? "Rook"
                  : piece.type === "n"
                  ? "Knight"
                  : piece.type === "b"
                  ? "Bishop"
                  : piece.type === "q"
                  ? "Queen"
                  : piece.type === "k"
                  ? "King"
                  : piece.type === "z"
                  ? "Wizard"
                  : "Omni Piece (All-In-One)"
              } ${pieceIsJumbo ? "(Jumbo 2x2)" : ""} (Drag or Click to Brush)`}
            >
              <ChessPiece type={piece.type} color={piece.color} className="w-10 h-10" />
              {pieceIsJumbo && (
                <span className="absolute top-0.5 left-0.5 bg-purple-600 text-white text-[8px] font-black px-1 rounded">
                  2x2
                </span>
              )}
              <div
                className={`absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border ${
                  piece.color === "w" ? "bg-white border-slate-900" : "bg-slate-800 border-slate-400"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Action Brushes / Eraser */}
      <div className={`flex flex-col gap-2 pt-2 border-t ${isLight ? "border-slate-200" : "border-slate-800/85"}`}>
        <button
          id="palette-eraser-btn"
          onClick={() => onSelectBrush(selectedBrush === "eraser" ? null : "eraser")}
          className={`w-full py-2.5 px-4 rounded-xl border flex items-center justify-center gap-2.5 text-xs font-bold transition-all duration-200 cursor-pointer ${
            selectedBrush === "eraser"
              ? "bg-rose-500/10 border-rose-500 text-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.15)]"
              : isLight
              ? "bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-100"
              : "bg-[#0a0b0d]/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-[#1e2128]/60"
          }`}
          title="Click to remove pieces from the board"
        >
          <Trash2 className="w-4 h-4" />
          Eraser Tool {selectedBrush === "eraser" ? "(Active)" : ""}
        </button>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            id="palette-reset-btn"
            onClick={onResetBoard}
            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isLight
                ? "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-800"
                : "border-slate-800 bg-[#0a0b0d]/40 hover:bg-[#1e2128]/50 hover:border-slate-700 text-slate-300"
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
            Standard Set
          </button>
          <button
            id="palette-clear-btn"
            onClick={onClearBoard}
            className={`py-2.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isLight
                ? "border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-800"
                : "border-slate-800 bg-[#0a0b0d]/40 hover:bg-[#1e2128]/50 hover:border-slate-700 text-slate-300"
            }`}
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            Clear Board
          </button>
        </div>
      </div>

      <div className={`border rounded-xl p-3 flex flex-col gap-2.5 ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0a0b0d]/60 border-slate-800/60"}`}>
        <div className="flex gap-2.5 items-start">
          <ShieldAlert className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <div className={`text-[11px] leading-relaxed ${isLight ? "text-slate-700" : "text-slate-400"}`}>
            <span className={`font-bold block mb-0.5 ${isLight ? "text-slate-900" : "text-slate-300"}`}>Validation Rules:</span>
            Requires <span className="text-blue-600 font-bold">1 White King (or Omni)</span> and <span className="text-blue-600 font-bold">1 Black King (or Omni)</span> to start.
          </div>
        </div>
      </div>
    </div>
  );
};
