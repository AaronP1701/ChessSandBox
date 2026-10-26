import React from "react";
import whiteChessPiecesSheetSvg from "./WhiteChessPieces (1).svg?raw";
import blackChessPiecesSheetSvg from "./blackChessPieces (1).svg?raw";

interface PieceProps {
  color: "w" | "b";
  className?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}

type PieceType = "p" | "q" | "k" | "b" | "n" | "r" | "z";

const SHEET_CELL_WIDTH = 250;
const SHEET_CELL_HEIGHT = 248;
const PIECE_WINDOW_X_PADDING = 10;
const PIECE_WINDOW_Y_PADDING = 8;
const PIECE_WINDOW_WIDTH = SHEET_CELL_WIDTH - PIECE_WINDOW_X_PADDING * 2;
const PIECE_WINDOW_HEIGHT = SHEET_CELL_HEIGHT - PIECE_WINDOW_Y_PADDING * 2;

const PIECE_COLUMN_INDEX: Record<PieceType, number> = {
  b: 0,
  n: 1,
  r: 2,
  z: 3,
  q: 4,
  k: 5,
  p: 6
};

const PIECE_SVG_CACHE: Record<string, string> = {};

function renderSheetPiece(type: PieceType, color: "w" | "b", className = "w-full h-full") {
  const cacheKey = `${color}-${type}`;
  if (!PIECE_SVG_CACHE[cacheKey]) {
    const viewBoxX = PIECE_COLUMN_INDEX[type] * SHEET_CELL_WIDTH + PIECE_WINDOW_X_PADDING;
    const viewBoxY = PIECE_WINDOW_Y_PADDING;
    const sheetSvg = color === "w" ? whiteChessPiecesSheetSvg : blackChessPiecesSheetSvg;

    PIECE_SVG_CACHE[cacheKey] = sheetSvg
      .replace(/^<\?xml[^>]*\?>\s*/u, "")
      .replace(
        '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="1750" height="248">',
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX} ${viewBoxY} ${PIECE_WINDOW_WIDTH} ${PIECE_WINDOW_HEIGHT}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`
      );
  }

  return <span className={className} style={{ display: "block" }} dangerouslySetInnerHTML={{ __html: PIECE_SVG_CACHE[cacheKey] }} />;
}

export const Pawn: React.FC<PieceProps> = React.memo(({ color, className = "w-full h-full" }) => {
  return renderSheetPiece("p", color, className);
});

export const Knight: React.FC<PieceProps> = React.memo(({ color, className = "w-full h-full" }) => {
  return renderSheetPiece("n", color, className);
});

export const Bishop: React.FC<PieceProps> = React.memo(({ color, className = "w-full h-full" }) => {
  return renderSheetPiece("b", color, className);
});

export const Rook: React.FC<PieceProps> = React.memo(({ color, className = "w-full h-full" }) => {
  return renderSheetPiece("r", color, className);
});

export const Queen: React.FC<PieceProps> = React.memo(({ color, className = "w-full h-full" }) => {
  return renderSheetPiece("q", color, className);
});

export const King: React.FC<PieceProps> = React.memo(({ color, className = "w-full h-full" }) => {
  return renderSheetPiece("k", color, className);
});

export const Wizard: React.FC<PieceProps> = React.memo(({ color, className = "w-full h-full" }) => {
  return renderSheetPiece("z", color, className);
});

export const OmniPiece: React.FC<PieceProps> = React.memo(({ color, className = "w-full h-full", draggable, onDragStart, onClick }) => {
  const isWhite = color === "w";
  return (
    <div className={`relative ${className} flex items-center justify-center select-none`}>
      <span
        draggable={draggable}
        onDragStart={onDragStart}
        onClick={onClick}
        className={`text-3xl sm:text-4xl md:text-5xl font-serif leading-none select-none ${
          draggable ? "cursor-grab active:cursor-grabbing hover:scale-110 transition-transform" : ""
        } ${
          isWhite
            ? "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]"
            : "text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]"
        }`}
      >
        {isWhite ? "♚" : "♔"}
      </span>
    </div>
  );
});

interface ChessPieceProps extends PieceProps {
  type: "p" | "r" | "n" | "b" | "q" | "k" | "z" | "x";
}

export const ChessPiece: React.FC<ChessPieceProps> = React.memo(({ type, color, className, draggable, onDragStart, onClick }) => {
  switch (type.toLowerCase()) {
    case "p":
      return <Pawn color={color} className={className} />;
    case "r":
      return <Rook color={color} className={className} />;
    case "n":
      return <Knight color={color} className={className} />;
    case "b":
      return <Bishop color={color} className={className} />;
    case "q":
      return <Queen color={color} className={className} />;
    case "k":
      return <King color={color} className={className} />;
    case "z":
      return <Wizard color={color} className={className} />;
    case "x":
      return <OmniPiece color={color} className={className} draggable={draggable} onDragStart={onDragStart} onClick={onClick} />;
    default:
      return null;
  }
});
