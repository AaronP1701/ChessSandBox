import { ChessPieceData } from "../types";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8"];

/**
 * Snaps any 8x8 square to the top-left anchor of its 2x2 cell on a 4x4 meta-grid.
 * Meta grid columns: files (a,b -> a), (c,d -> c), (e,f -> e), (g,h -> g)
 * Meta grid rows: ranks (8,7 -> 8), (6,5 -> 6), (4,3 -> 4), (2,1 -> 2)
 */
export function snapToMeta2x2Anchor(sq: string): string {
  if (!sq || sq.length < 2) return sq;
  const fileChar = sq[0];
  const rankNum = parseInt(sq[1], 10);
  const fileIdx = FILES.indexOf(fileChar);
  if (fileIdx < 0) return sq;

  const metaX = Math.floor(fileIdx / 2); // 0, 1, 2, 3
  const snappedFileIdx = Math.min(metaX * 2, 6); // 0, 2, 4, 6

  let snappedRank = 8;
  if (rankNum <= 2) snappedRank = 2;
  else if (rankNum <= 4) snappedRank = 4;
  else if (rankNum <= 6) snappedRank = 6;
  else snappedRank = 8;

  return `${FILES[snappedFileIdx]}${snappedRank}`;
}

/**
 * Given an anchor square on an 8x8 board, calculates a 2x2 block of squares.
 * Ensures the 2x2 box is aligned to the 4x4 meta-grid cells.
 */
export function getJumbo2x2Squares(anchorSq: string): string[] {
  if (!anchorSq || anchorSq.length < 2) return [anchorSq];

  const snapped = snapToMeta2x2Anchor(anchorSq);
  const fileChar = snapped[0];
  const rankNum = parseInt(snapped[1], 10);

  const fileIdx = FILES.indexOf(fileChar);
  const f1 = FILES[fileIdx];
  const f2 = FILES[fileIdx + 1];
  const r2 = rankNum;
  const r1 = rankNum - 1;

  // Return squares in order: [f1r2, f2r2, f1r1, f2r1] (top-left to bottom-right order)
  return [`${f1}${r2}`, `${f2}${r2}`, `${f1}${r1}`, `${f2}${r1}`];
}

/**
 * Returns the primary top-left anchor square of a Jumbo piece given its expandedSquares.
 */
export function getJumboAnchorSquare(expandedSquares: string[]): string {
  if (!expandedSquares || expandedSquares.length === 0) return "";
  let minFile = 999;
  let maxRank = -1;
  let topSquare = expandedSquares[0];

  for (const sq of expandedSquares) {
    const fIdx = FILES.indexOf(sq[0]);
    const rNum = parseInt(sq[1], 10);
    if (rNum > maxRank || (rNum === maxRank && fIdx < minFile)) {
      maxRank = rNum;
      minFile = fIdx;
      topSquare = sq;
    }
  }

  return snapToMeta2x2Anchor(topSquare);
}

/**
 * Safely removes a piece (whether standard 1x1 or Jumbo 2x2) at a given square from boardMap.
 */
export function deletePieceAtSquare(boardMap: Record<string, ChessPieceData>, square: string): void {
  const piece = boardMap[square];
  if (!piece) return;

  if (piece.isExpanded && piece.expandedSquares && piece.expandedSquares.length > 0) {
    for (const sq of piece.expandedSquares) {
      delete boardMap[sq];
    }
  } else {
    delete boardMap[square];
  }
}

/**
 * Places a 2x2 Jumbo piece on the board Map anchored at anchorSquare.
 * Overwrites/deletes any existing pieces occupying those 4 squares.
 */
export function placeJumboPiece(
  boardMap: Record<string, ChessPieceData>,
  anchorSquare: string,
  type: ChessPieceData["type"],
  color: ChessPieceData["color"]
): Record<string, ChessPieceData> {
  const updated = { ...boardMap };

  // Wizards and Omni pieces cannot be jumbo
  if (type === "z" || type === "x") {
    deletePieceAtSquare(updated, anchorSquare);
    updated[anchorSquare] = { type, color, isExpanded: false };
    return updated;
  }

  const expSquares = getJumbo2x2Squares(anchorSquare);

  // Clear existing pieces in target 2x2 region
  for (const sq of expSquares) {
    deletePieceAtSquare(updated, sq);
  }

  // Populate 4 squares
  for (const sq of expSquares) {
    updated[sq] = {
      type,
      color,
      isExpanded: true,
      expandedSquares: expSquares,
    };
  }

  return updated;
}

/**
 * Moves a Jumbo piece from fromSquare to toSquare on boardMap.
 */
export function moveJumboPiece(
  boardMap: Record<string, ChessPieceData>,
  fromSquare: string,
  toSquare: string
): Record<string, ChessPieceData> {
  const updated = { ...boardMap };
  const sourcePiece = updated[fromSquare];
  if (!sourcePiece) return updated;

  const type = sourcePiece.type;
  const color = sourcePiece.color;

  // Clear source 2x2 footprint
  deletePieceAtSquare(updated, fromSquare);

  // Place new 2x2 footprint at destination
  return placeJumboPiece(updated, toSquare, type, color);
}

/**
 * Calculates valid moves for a Jumbo 2x2 piece in game mode.
 * Jumbo pieces treat 2x2 blocks as a single space step.
 */
export function calculateJumboValidMoves(
  square: string,
  boardMap: Record<string, ChessPieceData>
): string[] {
  const piece = boardMap[square];
  if (!piece || !piece.isExpanded || !piece.expandedSquares) return [];

  const anchor = getJumboAnchorSquare(piece.expandedSquares);
  const color = piece.color;
  const type = piece.type;
  const validAnchors: string[] = [];

  const currFileIdx = FILES.indexOf(anchor[0]);
  const currRank = parseInt(anchor[1], 10);

  const ownSquares = new Set(piece.expandedSquares);

  const canOccupyDestination = (targetExpSquares: string[]): boolean => {
    for (const sq of targetExpSquares) {
      if (ownSquares.has(sq)) continue;
      const targetP = boardMap[sq];
      if (!targetP) continue;
      if (targetP.color === color) {
        if (type === "z") {
          continue; // Wizard swap allowed
        }
        return false;
      }
      if (targetP.type === "z") {
        return false; // Wizard cannot be captured!
      }
    }
    return true;
  };

  const addIfValid = (fIdx: number, r: number): boolean => {
    if (fIdx < 0 || fIdx > 6 || r < 2 || r > 8) return false;
    const testAnchor = snapToMeta2x2Anchor(`${FILES[fIdx]}${r}`);
    const testExp = getJumbo2x2Squares(testAnchor);

    if (canOccupyDestination(testExp)) {
      validAnchors.push(testAnchor);
      // Check if it captured an enemy piece in the target footprint
      const capturedEnemy = testExp.some((sq) => !ownSquares.has(sq) && boardMap[sq] && boardMap[sq].color !== color);
      return !capturedEnemy; // If captured enemy or hit obstacle, stop sliding
    }
    return false; // Friendly collision, stop sliding
  };

  if (type === "p") {
    // Jumbo Pawn: moves forward 1 meta step (2 ranks) or 2 meta steps (4 ranks)
    const dir = color === "w" ? 2 : -2;

    // Forward 1 step on 4x4 meta-board (2 ranks)
    const fwdRank = currRank + dir;
    if (fwdRank >= 2 && fwdRank <= 8) {
      const fwdAnchor = snapToMeta2x2Anchor(`${FILES[currFileIdx]}${fwdRank}`);
      const fwdSquares = getJumbo2x2Squares(fwdAnchor);
      const isBlocked = fwdSquares.some((sq) => !ownSquares.has(sq) && boardMap[sq]);
      if (!isBlocked) {
        validAnchors.push(fwdAnchor);

        // Forward 2 steps from start rank area
        const isStartArea = (color === "w" && currRank <= 4) || (color === "b" && currRank >= 6);
        if (isStartArea) {
          const doubleRank = currRank + 2 * dir;
          if (doubleRank >= 2 && doubleRank <= 8) {
            const doubleAnchor = snapToMeta2x2Anchor(`${FILES[currFileIdx]}${doubleRank}`);
            const doubleSquares = getJumbo2x2Squares(doubleAnchor);
            const isDoubleBlocked = doubleSquares.some((sq) => !ownSquares.has(sq) && boardMap[sq]);
            if (!isDoubleBlocked) {
              validAnchors.push(doubleAnchor);
            }
          }
        }
      }
    }

    // Diagonal captures on 4x4 board (2 files left/right, 2 ranks forward)
    for (const df of [-2, 2]) {
      const diagFile = currFileIdx + df;
      const diagRank = currRank + dir;
      if (diagFile >= 0 && diagFile <= 6 && diagRank >= 2 && diagRank <= 8) {
        const diagAnchor = snapToMeta2x2Anchor(`${FILES[diagFile]}${diagRank}`);
        const diagSquares = getJumbo2x2Squares(diagAnchor);
        const hasEnemy = diagSquares.some(
          (sq) => !ownSquares.has(sq) && boardMap[sq] && boardMap[sq].color !== color && boardMap[sq].type !== "z"
        );
        if (hasEnemy && canOccupyDestination(diagSquares)) {
          validAnchors.push(diagAnchor);
        }
      }
    }
  } else if (type === "r") {
    // Jumbo Rook: Orthogonal sliding on 4x4 board (2 files / 2 ranks per step)
    const dirs = [
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ];
    for (const [df, dr] of dirs) {
      let f = currFileIdx + df;
      let r = currRank + dr;
      while (addIfValid(f, r)) {
        f += df;
        r += dr;
      }
    }
  } else if (type === "n") {
    // Jumbo Knight: L-shaped hops on 4x4 meta-board (2 meta-steps = 4, 1 meta-step = 2)
    const hops = [
      [4, 2],
      [4, -2],
      [-4, 2],
      [-4, -2],
      [2, 4],
      [2, -4],
      [-2, 4],
      [-2, -4],
    ];
    for (const [df, dr] of hops) {
      addIfValid(currFileIdx + df, currRank + dr);
    }
  } else if (type === "b") {
    // Jumbo Bishop: Diagonal sliding on 4x4 board (2 files & 2 ranks per step)
    const dirs = [
      [2, 2],
      [2, -2],
      [-2, 2],
      [-2, -2],
    ];
    for (const [df, dr] of dirs) {
      let f = currFileIdx + df;
      let r = currRank + dr;
      while (addIfValid(f, r)) {
        f += df;
        r += dr;
      }
    }
  } else if (type === "q" || type === "k") {
    // Jumbo Queen / King on 4x4 board (2 files & 2 ranks per step)
    const isKing = type === "k";
    const dirs = [
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
      [2, 2],
      [2, -2],
      [-2, 2],
      [-2, -2],
    ];
    for (const [df, dr] of dirs) {
      let f = currFileIdx + df;
      let r = currRank + dr;
      if (isKing) {
        addIfValid(f, r);
      } else {
        while (addIfValid(f, r)) {
          f += df;
          r += dr;
        }
      }
    }
  } else if (type === "z") {
    // Jumbo Wizard on 4x4 board
    const dir = color === "w" ? 2 : -2;
    addIfValid(currFileIdx, currRank + dir);
  }

  return validAnchors;
}
