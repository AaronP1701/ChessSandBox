import { Chess } from "chess.js";
import { ChessPieceData, PlayerColor } from "../types";
import { calculateJumboValidMoves, getJumboAnchorSquare, deletePieceAtSquare, moveJumboPiece, placeJumboPiece, getJumbo2x2Squares } from "./jumboPieceModule";

export interface CustomMoveLog {
  from: string;
  to: string;
  promotion?: string;
  isWizardSwap?: boolean;
  isWizardMove?: boolean;
  flags?: string;
  san?: string;
}

export const getDistinctPieces = (boardMap: Record<string, ChessPieceData>): ChessPieceData[] => {
  const result: ChessPieceData[] = [];
  const jumboKeysSeen = new Set<string>();

  for (const [, piece] of Object.entries(boardMap)) {
    if (!piece) continue;
    if (piece.isExpanded && piece.expandedSquares && piece.expandedSquares.length > 0) {
      const key = `${piece.color}-${piece.type}-${[...piece.expandedSquares].sort().join(",")}`;
      if (!jumboKeysSeen.has(key)) {
        jumboKeysSeen.add(key);
        result.push(piece);
      }
    } else {
      result.push(piece);
    }
  }

  return result;
};

export const STANDARD_SETUP: Record<string, ChessPieceData> = {
  a1: { type: "r", color: "w" }, b1: { type: "n", color: "w" }, c1: { type: "b", color: "w" }, d1: { type: "q", color: "w" }, e1: { type: "k", color: "w" }, f1: { type: "b", color: "w" }, g1: { type: "n", color: "w" }, h1: { type: "r", color: "w" },
  a2: { type: "p", color: "w" }, b2: { type: "p", color: "w" }, c2: { type: "p", color: "w" }, d2: { type: "p", color: "w" }, e2: { type: "p", color: "w" }, f2: { type: "p", color: "w" }, g2: { type: "p", color: "w" }, h2: { type: "p", color: "w" },
  a7: { type: "p", color: "b" }, b7: { type: "p", color: "b" }, c7: { type: "p", color: "b" }, d7: { type: "p", color: "b" }, e7: { type: "p", color: "b" }, f7: { type: "p", color: "b" }, g7: { type: "p", color: "b" }, h7: { type: "p", color: "b" },
  a8: { type: "r", color: "b" }, b8: { type: "n", color: "b" }, c8: { type: "b", color: "b" }, d8: { type: "q", color: "b" }, e8: { type: "k", color: "b" }, f8: { type: "b", color: "b" }, g8: { type: "n", color: "b" }, h8: { type: "r", color: "b" },
};

// Convert a board with Wizards to a FEN string that chess.js can parse
export const getChessJsFriendlyFen = (
  boardMap: Record<string, ChessPieceData>,
  activeTurn: PlayerColor = "w",
  enPassantSq?: string | null
): string => {
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const fenRanks: string[] = [];

  for (const rank of ranks) {
    let emptyCount = 0;
    let fenRank = "";

    for (const file of files) {
      const sq = `${file}${rank}`;
      const p = boardMap[sq];

      if (p) {
        if (emptyCount > 0) {
          fenRank += emptyCount;
          emptyCount = 0;
        }
        let type = p.type;
        let color = p.color;

        // For 2x2 Jumbo pieces: if it's a King, only top-left anchor uses 'k' so chess.js keeps 1 King;
        // non-anchor squares of a Jumbo King use 'q' of the same color.
        if (p.isExpanded && p.expandedSquares && p.expandedSquares.length > 0) {
          if (type === "k") {
            const topAnchor = getJumboAnchorSquare(p.expandedSquares);
            if (sq !== topAnchor) {
              type = "q";
            }
          }
        }

        // Map Wizard 'z', Omni piece 'x', or standard Pawn 'p' on edge rows to valid Chess.js pieces to avoid FEN errors
        if (type === "x") {
          const hasKing = Object.values(boardMap).some(bp => bp && bp.type === "k" && bp.color === p.color);
          type = hasKing ? "q" : "k"; // Map Omni piece to King if no standard king exists for this color
        } else if (type === "z") {
          // Keep wizard's actual color so opposing turn cannot move it
          color = p.color;
          // Pawns on 1st/8th ranks are invalid, so use Knights on those ranks
          if (rank === "1" || rank === "8") {
            type = "n";
          } else {
            type = "p";
          }
        } else if (type === "p") {
          if (rank === "1" || rank === "8") {
            type = "q"; // Auto-promote standard pawns on edge rows to avoid chess.js parsing errors
          }
        }
        fenRank += color === "w" ? type.toUpperCase() : type.toLowerCase();
      } else {
        emptyCount++;
      }
    }

    if (emptyCount > 0) {
      fenRank += emptyCount;
    }
    fenRanks.push(fenRank);
  }

  // Castling availability validation
  let castling = "";
  if (boardMap.e1?.type === "k" && boardMap.e1?.color === "w") {
    if (boardMap.h1?.type === "r" && boardMap.h1?.color === "w") castling += "K";
    if (boardMap.a1?.type === "r" && boardMap.a1?.color === "w") castling += "Q";
  }
  if (boardMap.e8?.type === "k" && boardMap.e8?.color === "b") {
    if (boardMap.h8?.type === "r" && boardMap.h8?.color === "b") castling += "k";
    if (boardMap.a8?.type === "r" && boardMap.a8?.color === "b") castling += "q";
  }
  if (!castling) castling = "-";

  const ep = enPassantSq || "-";

  return `${fenRanks.join("/")} ${activeTurn} ${castling} ${ep} 0 1`;
};

export const getEnPassantSquare = (
  lastMove?: CustomMoveLog | { from: string; to: string } | null,
  boardMap?: Record<string, ChessPieceData>
): string | null => {
  if (!lastMove || !lastMove.from || !lastMove.to) return null;
  const from = lastMove.from;
  const to = lastMove.to;

  if (boardMap && boardMap[to]) {
    if (boardMap[to].type !== "p") return null;
  }

  // White pawn 2-step: e.g. e2 -> e4
  if (from[0] === to[0] && from[1] === "2" && to[1] === "4") {
    return `${from[0]}3`;
  }
  // Black pawn 2-step: e.g. e7 -> e5
  if (from[0] === to[0] && from[1] === "7" && to[1] === "5") {
    return `${from[0]}6`;
  }

  return null;
};

export const applyMoveToBoard = (
  boardMap: Record<string, ChessPieceData>,
  from: string,
  to: string,
  flags?: string,
  promotion?: string
): Record<string, ChessPieceData> => {
  const updated = { ...boardMap };
  const movingPiece = updated[from];
  if (!movingPiece) return updated;

  // Handle Jumbo 2x2 piece move
  if (movingPiece.isExpanded) {
    const actualFrom = movingPiece.expandedSquares ? getJumboAnchorSquare(movingPiece.expandedSquares) : from;
    return moveJumboPiece(updated, actualFrom, to);
  }

  // Check if this is a Wizard swap
  if (movingPiece.type === "z" && updated[to]?.color === movingPiece.color) {
    const destPiece = updated[to];
    if (destPiece.isExpanded) {
      const destAnchor = destPiece.expandedSquares ? getJumboAnchorSquare(destPiece.expandedSquares) : to;
      deletePieceAtSquare(updated, destAnchor);
      updated[destAnchor] = { ...movingPiece };
      return placeJumboPiece(updated, from, destPiece.type, destPiece.color);
    }
    updated[to] = { ...movingPiece };
    updated[from] = { ...destPiece };

    // Handle Pawn promotion on swap if friendly pawn lands on promotion rank (8th for White, 1st for Black)
    if (destPiece.type === "p") {
      const isWhitePromotion = destPiece.color === "w" && from.endsWith("8");
      const isBlackPromotion = destPiece.color === "b" && from.endsWith("1");
      if (isWhitePromotion || isBlackPromotion) {
        updated[from] = { type: (promotion || "q") as any, color: destPiece.color };
      }
    }
    return updated;
  }

  // Handle standard castling moves
  if (flags && flags.includes("k")) { // Kingside castle
    const r = from[1]; // Rank e.g. "1" or "8"
    const rookFrom = `h${r}`;
    const rookTo = `f${r}`;
    const rookPiece = updated[rookFrom];
    if (rookPiece) {
      updated[rookTo] = { ...rookPiece };
      delete updated[rookFrom];
    }
  } else if (flags && flags.includes("q")) { // Queenside castle
    const r = from[1];
    const rookFrom = `a${r}`;
    const rookTo = `d${r}`;
    const rookPiece = updated[rookFrom];
    if (rookPiece) {
      updated[rookTo] = { ...rookPiece };
      delete updated[rookFrom];
    }
  }

  // En Passant captures the enemy pawn behind
  const isEnPassant = (flags && flags.includes("e")) ||
    (movingPiece.type === "p" && from[0] !== to[0] && !boardMap[to] && Math.abs(parseInt(from[1], 10) - parseInt(to[1], 10)) === 1);

  if (isEnPassant) {
    const toCol = to[0];
    const fromRow = from[1];
    const captureSquare = `${toCol}${fromRow}`;
    deletePieceAtSquare(updated, captureSquare);
  }

  // Ensure Wizards cannot be captured
  if (updated[to]?.type === "z" && updated[to]?.color !== movingPiece.color) {
    return boardMap;
  }

  // Apply move to destination (safely deleting target and source pieces, including jumbo pieces if captured)
  deletePieceAtSquare(updated, to);
  deletePieceAtSquare(updated, from);

  updated[to] = { ...movingPiece };

  // Promotion
  if (promotion) {
    updated[to] = { type: promotion as any, color: movingPiece.color };
  }

  return updated;
};

export const calculateValidMoves = (
  square: string,
  gameInstance: Chess,
  boardMap: Record<string, ChessPieceData>,
  enPassantSq?: string | null
): string[] => {
  const piece = boardMap[square];
  if (!piece) return [];

  const actualSquare = (piece.isExpanded && piece.expandedSquares && piece.expandedSquares.length > 0)
    ? getJumboAnchorSquare(piece.expandedSquares)
    : square;

  const rawMoves = getPseudoLegalMoves(actualSquare, boardMap, enPassantSq);
  const color = piece.color;

  return rawMoves.filter((targetSq) => {
    let simulatedBoard: Record<string, ChessPieceData>;
    if (piece.isExpanded) {
      simulatedBoard = moveJumboPiece(boardMap, actualSquare, targetSq);
    } else {
      simulatedBoard = applyMoveToBoard(boardMap, square, targetSq);
    }
    return !isKingInCheck(simulatedBoard, color);
  });
};

// Returns all squares occupied by the specified King or Omni piece
export const getKingSquares = (boardMap: Record<string, ChessPieceData>, color: PlayerColor): string[] => {
  const kingSquares: string[] = [];
  for (const [sq, p] of Object.entries(boardMap)) {
    if (p && (p.type === "k" || p.type === "x") && p.color === color) {
      if (p.isExpanded && p.expandedSquares && p.expandedSquares.length > 0) {
        kingSquares.push(...p.expandedSquares);
      } else {
        kingSquares.push(sq);
      }
    }
  }
  return kingSquares;
};

// Determines if any square in targetSquaresSet is attacked by attackerColor
export const isSquareAttackedByColor = (
  boardMap: Record<string, ChessPieceData>,
  targetSquaresSet: Set<string>,
  attackerColor: PlayerColor
): boolean => {
  const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const visited = new Set<string>();

  for (const [sq, p] of Object.entries(boardMap)) {
    if (!p || p.color !== attackerColor) continue;

    if (p.isExpanded && p.expandedSquares && p.expandedSquares.length > 0) {
      const anchor = getJumboAnchorSquare(p.expandedSquares);
      if (visited.has(anchor)) continue;
      visited.add(anchor);

      const jumboMoves = calculateJumboValidMoves(anchor, boardMap);
      for (const tAnchor of jumboMoves) {
        const coveredSquares = getJumbo2x2Squares(tAnchor);
        for (const cSq of coveredSquares) {
          if (targetSquaresSet.has(cSq)) {
            return true;
          }
        }
      }
      continue;
    }

    const file = sq[0];
    const fileIdx = FILES.indexOf(file);
    const rank = parseInt(sq[1], 10);
    if (fileIdx < 0 || isNaN(rank)) continue;

    const type = p.type;

    if (type === "p") {
      const dir = attackerColor === "w" ? 1 : -1;
      const targetRank = rank + dir;
      if (targetRank >= 1 && targetRank <= 8) {
        for (const df of [-1, 1]) {
          const tfIdx = fileIdx + df;
          if (tfIdx >= 0 && tfIdx < 8) {
            const attackSq = `${FILES[tfIdx]}${targetRank}`;
            if (targetSquaresSet.has(attackSq)) return true;
          }
        }
      }
    } else if (type === "n") {
      const hops = [
        [2, 1], [2, -1], [-2, 1], [-2, -1],
        [1, 2], [1, -2], [-1, 2], [-1, -2]
      ];
      for (const [df, dr] of hops) {
        const f = fileIdx + df;
        const r = rank + dr;
        if (f >= 0 && f < 8 && r >= 1 && r <= 8) {
          const attackSq = `${FILES[f]}${r}`;
          if (targetSquaresSet.has(attackSq)) return true;
        }
      }
    } else if (type === "b" || type === "r" || type === "q") {
      const dirs: number[][] = [];
      if (type === "r" || type === "q") {
        dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
      }
      if (type === "b" || type === "q") {
        dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
      }
      for (const [df, dr] of dirs) {
        let f = fileIdx + df;
        let r = rank + dr;
        while (f >= 0 && f < 8 && r >= 1 && r <= 8) {
          const attackSq = `${FILES[f]}${r}`;
          if (targetSquaresSet.has(attackSq)) return true;
          if (boardMap[attackSq]) break;
          f += df;
          r += dr;
        }
      }
    } else if (type === "k") {
      const dirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1]
      ];
      for (const [df, dr] of dirs) {
        const f = fileIdx + df;
        const r = rank + dr;
        if (f >= 0 && f < 8 && r >= 1 && r <= 8) {
          const attackSq = `${FILES[f]}${r}`;
          if (targetSquaresSet.has(attackSq)) return true;
        }
      }
    } else if (type === "x") {
      // Omni piece cannot capture Kings ('k') or other Omni pieces ('x').
      for (const tSq of targetSquaresSet) {
        const occupant = boardMap[tSq];
        if (!occupant || (occupant.type !== "k" && occupant.type !== "x")) {
          return true;
        }
      }
    }
  }

  return false;
};

// Checks if specified color's King is in check
export const isKingInCheck = (boardMap: Record<string, ChessPieceData>, color: PlayerColor): boolean => {
  const kingSqList = getKingSquares(boardMap, color);
  if (kingSqList.length === 0) return false;
  return isSquareAttackedByColor(boardMap, new Set(kingSqList), color === "w" ? "b" : "w");
};

// Generates pseudo-legal candidate moves for any piece on boardMap
export const getPseudoLegalMoves = (
  square: string,
  boardMap: Record<string, ChessPieceData>,
  enPassantSq?: string | null
): string[] => {
  const p = boardMap[square];
  if (!p) return [];

  if (p.isExpanded) {
    const actualAnchor = p.expandedSquares ? getJumboAnchorSquare(p.expandedSquares) : square;
    return calculateJumboValidMoves(actualAnchor, boardMap);
  }

  const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const file = square[0];
  const fileIdx = FILES.indexOf(file);
  const rank = parseInt(square[1], 10);
  const color = p.color;
  const moves: string[] = [];

  if (p.type === "x") {
    for (const f of FILES) {
      for (let r = 1; r <= 8; r++) {
        const sq = `${f}${r}`;
        if (sq !== square && boardMap[sq]?.color !== color) {
          const targetPiece = boardMap[sq];
          if (targetPiece && (targetPiece.type === "k" || targetPiece.type === "x")) {
            continue; // Omni piece cannot capture Kings or other Omni pieces
          }
          moves.push(sq);
        }
      }
    }
    return moves;
  }

  if (p.type === "z") {
    const dir = color === "w" ? 1 : -1;
    const nextRank = rank + dir;
    if (nextRank >= 1 && nextRank <= 8) {
      const nextSquare = `${FILES[fileIdx]}${nextRank}`;
      if (!boardMap[nextSquare]) {
        moves.push(nextSquare);
        const startRank = color === "w" ? 2 : 7;
        if (rank === startRank) {
          const doubleRank = rank + 2 * dir;
          const doubleSquare = `${FILES[fileIdx]}${doubleRank}`;
          if (!boardMap[doubleSquare]) {
            moves.push(doubleSquare);
          }
        }
      }
    }
    for (const [sq, piece] of Object.entries(boardMap)) {
      if (sq !== square && piece.color === color) {
        moves.push(sq);
      }
    }
    return moves;
  }

  if (p.type === "p") {
    const dir = color === "w" ? 1 : -1;
    const nextRank = rank + dir;
    if (nextRank >= 1 && nextRank <= 8) {
      const nextSquare = `${FILES[fileIdx]}${nextRank}`;
      if (!boardMap[nextSquare]) {
        moves.push(nextSquare);
        const startRank = color === "w" ? 2 : 7;
        if (rank === startRank) {
          const doubleRank = rank + 2 * dir;
          const doubleSquare = `${FILES[fileIdx]}${doubleRank}`;
          if (!boardMap[doubleSquare]) {
            moves.push(doubleSquare);
          }
        }
      }
      for (const df of [-1, 1]) {
        const tfIdx = fileIdx + df;
        if (tfIdx >= 0 && tfIdx < 8) {
          const diagSq = `${FILES[tfIdx]}${nextRank}`;
          const targetP = boardMap[diagSq];
          if (targetP && targetP.color !== color && targetP.type !== "z") {
            moves.push(diagSq);
          } else if (enPassantSq && diagSq === enPassantSq) {
            const enemySquare = `${FILES[tfIdx]}${rank}`;
            const enemyP = boardMap[enemySquare];
            if (enemyP && enemyP.color !== color && enemyP.type === "p") {
              moves.push(diagSq);
            }
          }
        }
      }
    }
    return moves;
  }

  if (p.type === "n") {
    const hops = [
      [2, 1], [2, -1], [-2, 1], [-2, -1],
      [1, 2], [1, -2], [-1, 2], [-1, -2]
    ];
    for (const [df, dr] of hops) {
      const f = fileIdx + df;
      const r = rank + dr;
      if (f >= 0 && f < 8 && r >= 1 && r <= 8) {
        const targetSq = `${FILES[f]}${r}`;
        const targetP = boardMap[targetSq];
        if (!targetP || (targetP.color !== color && targetP.type !== "z")) {
          moves.push(targetSq);
        }
      }
    }
    return moves;
  }

  if (p.type === "b" || p.type === "r" || p.type === "q") {
    const dirs: number[][] = [];
    if (p.type === "r" || p.type === "q") {
      dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
    }
    if (p.type === "b" || p.type === "q") {
      dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
    }
    for (const [df, dr] of dirs) {
      let f = fileIdx + df;
      let r = rank + dr;
      while (f >= 0 && f < 8 && r >= 1 && r <= 8) {
        const targetSq = `${FILES[f]}${r}`;
        const targetP = boardMap[targetSq];
        if (!targetP) {
          moves.push(targetSq);
        } else {
          if (targetP.color !== color && targetP.type !== "z") {
            moves.push(targetSq);
          }
          break;
        }
        f += df;
        r += dr;
      }
    }
    return moves;
  }

  if (p.type === "k") {
    const dirs = [
      [1, 0], [-1, 0], [0, 1], [0, -1],
      [1, 1], [1, -1], [-1, 1], [-1, -1]
    ];
    for (const [df, dr] of dirs) {
      const f = fileIdx + df;
      const r = rank + dr;
      if (f >= 0 && f < 8 && r >= 1 && r <= 8) {
        const targetSq = `${FILES[f]}${r}`;
        const targetP = boardMap[targetSq];
        if (!targetP || (targetP.color !== color && targetP.type !== "z")) {
          moves.push(targetSq);
        }
      }
    }
    // Castling for 1x1 King
    const enemyColor = color === "w" ? "b" : "w";
    if (square === (color === "w" ? "e1" : "e8")) {
      const rStr = color === "w" ? "1" : "8";
      if (boardMap[`h${rStr}`]?.type === "r" && boardMap[`h${rStr}`]?.color === color) {
        if (!boardMap[`f${rStr}`] && !boardMap[`g${rStr}`]) {
          if (!isSquareAttackedByColor(boardMap, new Set([`e${rStr}`, `f${rStr}`, `g${rStr}`]), enemyColor)) {
            moves.push(`g${rStr}`);
          }
        }
      }
      if (boardMap[`a${rStr}`]?.type === "r" && boardMap[`a${rStr}`]?.color === color) {
        if (!boardMap[`b${rStr}`] && !boardMap[`c${rStr}`] && !boardMap[`d${rStr}`]) {
          if (!isSquareAttackedByColor(boardMap, new Set([`e${rStr}`, `d${rStr}`, `c${rStr}`]), enemyColor)) {
            moves.push(`c${rStr}`);
          }
        }
      }
    }
    return moves;
  }

  return [];
};

export const hasAnyLegalMoves = (
  boardMap: Record<string, ChessPieceData>,
  color: PlayerColor,
  enPassantSq?: string | null
): boolean => {
  const visited = new Set<string>();
  for (const [sq, p] of Object.entries(boardMap)) {
    if (!p || p.color !== color) continue;
    let actualSq = sq;
    if (p.isExpanded && p.expandedSquares && p.expandedSquares.length > 0) {
      actualSq = getJumboAnchorSquare(p.expandedSquares);
      if (visited.has(actualSq)) continue;
      visited.add(actualSq);
    }
    const moves = calculateValidMoves(actualSq, {} as Chess, boardMap, enPassantSq);
    if (moves.length > 0) return true;
  }
  return false;
};

export const reconstructFromHistory = (initialBoard: Record<string, ChessPieceData>, history: CustomMoveLog[]): Record<string, ChessPieceData> => {
  let currentBoard = { ...initialBoard };
  for (const move of history) {
    currentBoard = applyMoveToBoard(currentBoard, move.from, move.to, move.flags, move.promotion);
  }
  return currentBoard;
};

// Locate current square location of specified King or Omni piece
export const getKingSquare = (boardMapOrGame: Record<string, ChessPieceData> | Chess, color: PlayerColor): string | null => {
  if (boardMapOrGame && typeof boardMapOrGame === "object" && !("board" in boardMapOrGame)) {
    const boardMap = boardMapOrGame as Record<string, ChessPieceData>;
    for (const [sq, p] of Object.entries(boardMap)) {
      if (p && (p.type === "k" || p.type === "x") && p.color === color) {
        const sqList = p.isExpanded && p.expandedSquares && p.expandedSquares.length > 0 ? p.expandedSquares : [sq];
        if (isSquareAttackedByColor(boardMap, new Set(sqList), color === "w" ? "b" : "w")) {
          return p.isExpanded && p.expandedSquares ? getJumboAnchorSquare(p.expandedSquares) : sq;
        }
      }
    }
    for (const [sq, p] of Object.entries(boardMap)) {
      if (p && (p.type === "k" || p.type === "x") && p.color === color) {
        if (p.isExpanded && p.expandedSquares && p.expandedSquares.length > 0) {
          return getJumboAnchorSquare(p.expandedSquares);
        }
        return sq;
      }
    }
    return null;
  }
  const chessObj = boardMapOrGame as Chess;
  if (chessObj && typeof chessObj.board === "function") {
    try {
      const bMatrix = chessObj.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const cell = bMatrix[r][c];
          if (cell && (cell.type === "k" || (cell.type as string) === "x") && cell.color === color) {
            return cell.square;
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
  return null;
};

export const getAdjacentSquares = (sq: string): string[] => {
  const fileStr = sq[0];
  const rankNum = parseInt(sq[1], 10);
  const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
  const fileIdx = files.indexOf(fileStr);

  const neighbors: string[] = [];
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (df === 0 && dr === 0) continue;
      const nfIdx = fileIdx + df;
      const nr = rankNum + dr;
      if (nfIdx >= 0 && nfIdx < 8 && nr >= 1 && nr <= 8) {
        neighbors.push(`${files[nfIdx]}${nr}`);
      }
    }
  }
  return neighbors;
};

export const checkAndRemoveSameTypeChain = (
  boardMap: Record<string, ChessPieceData>,
  landedSquare: string
): { updatedBoard: Record<string, ChessPieceData>; removed: boolean } => {
  const landedPiece = boardMap[landedSquare];
  if (!landedPiece) return { updatedBoard: boardMap, removed: false };

  const targetType = landedPiece.type;

  const getPieceId = (sq: string): string | null => {
    const p = boardMap[sq];
    if (!p) return null;
    if (p.isExpanded && p.expandedSquares && p.expandedSquares.length > 0) {
      return `jumbo_${getJumboAnchorSquare(p.expandedSquares)}`;
    }
    return `single_${sq}`;
  };

  const landedPieceId = getPieceId(landedSquare);
  if (!landedPieceId) return { updatedBoard: boardMap, removed: false };

  const getPieceSquares = (sq: string): string[] => {
    const p = boardMap[sq];
    if (p?.isExpanded && p.expandedSquares && p.expandedSquares.length > 0) {
      return p.expandedSquares;
    }
    return [sq];
  };

  const landedSquares = getPieceSquares(landedSquare);
  let hasDistinctNeighbor = false;

  for (const lSq of landedSquares) {
    const adjSquares = getAdjacentSquares(lSq);
    for (const nbr of adjSquares) {
      const nbrPiece = boardMap[nbr];
      const nbrPieceId = getPieceId(nbr);
      if (nbrPiece && nbrPiece.type === targetType && nbrPieceId !== landedPieceId) {
        hasDistinctNeighbor = true;
        break;
      }
    }
    if (hasDistinctNeighbor) break;
  }

  if (!hasDistinctNeighbor) {
    return { updatedBoard: boardMap, removed: false };
  }

  const queue = [landedSquare];
  const visitedPieces = new Set<string>([landedPieceId]);
  const piecesToRemove = new Set<string>([landedPieceId]);
  const squaresInChain: string[] = [...landedSquares];

  while (queue.length > 0) {
    const currSq = queue.shift()!;
    const currSquares = getPieceSquares(currSq);

    for (const cSq of currSquares) {
      const adj = getAdjacentSquares(cSq);
      for (const nbr of adj) {
        const nbrPiece = boardMap[nbr];
        const nbrPieceId = getPieceId(nbr);
        if (nbrPiece && nbrPiece.type === targetType && nbrPieceId && !visitedPieces.has(nbrPieceId)) {
          visitedPieces.add(nbrPieceId);
          piecesToRemove.add(nbrPieceId);
          queue.push(nbr);
          squaresInChain.push(...getPieceSquares(nbr));
        }
      }
    }
  }

  if (piecesToRemove.size > 1) {
    const updatedBoard = { ...boardMap };
    for (const sq of squaresInChain) {
      deletePieceAtSquare(updatedBoard, sq);
    }
    return { updatedBoard, removed: true };
  }

  return { updatedBoard: boardMap, removed: false };
};

