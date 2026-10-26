import { Chess } from "chess.js";

// Static Constants
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

// Piece Values
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-Square Tables (White perspective - flipped for Black)
const PAWN_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_TABLE = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_TABLE = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 5, 0, 0],
];

const QUEEN_TABLE = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 5, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_MIDDLE_TABLE = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

const TABLES_BY_PIECE: Record<string, number[][]> = {
  p: PAWN_TABLE,
  n: KNIGHT_TABLE,
  b: BISHOP_TABLE,
  r: ROOK_TABLE,
  q: QUEEN_TABLE,
  k: KING_MIDDLE_TABLE,
};

// Precomputed 8x8 lookup tables for instant score computation without conditionals
const WHITE_SCORES: Record<string, number[][]> = {};
const BLACK_SCORES: Record<string, number[][]> = {};

for (const pieceType of ["p", "n", "b", "r", "q", "k"]) {
  WHITE_SCORES[pieceType] = Array.from({ length: 8 }, () => new Array(8).fill(0));
  BLACK_SCORES[pieceType] = Array.from({ length: 8 }, () => new Array(8).fill(0));
  const baseVal = PIECE_VALUES[pieceType];
  const table = TABLES_BY_PIECE[pieceType];

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      WHITE_SCORES[pieceType][r][c] = baseVal + table[r][c];
      BLACK_SCORES[pieceType][r][c] = baseVal + table[7 - r][7 - c];
    }
  }
}

/**
 * Helper to dynamically sync wizard piece colors with the active turn's color in chess.js.
 */
function syncWizardColors(chess: Chess, wizardSquares: string[]): void {
  if (wizardSquares.length === 0) return;

  const activeColor = chess.turn();
  const board = chess.board();
  const fenRanks: string[] = [];

  for (let r = 0; r < 8; r++) {
    let emptyCount = 0;
    let fenRank = "";

    for (let c = 0; c < 8; c++) {
      const sq = `${FILES[c]}${RANKS[r]}`;
      const piece = board[r][c];

      if (piece) {
        if (emptyCount > 0) {
          fenRank += emptyCount;
          emptyCount = 0;
        }

        let type = piece.type;
        let color = piece.color;

        if (wizardSquares.includes(sq)) {
          if (piece.color === activeColor) {
            color = activeColor;
            if (RANKS[r] === "1" || RANKS[r] === "8") {
              type = "n";
            } else {
              type = "p";
            }
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

  const currentFenParts = chess.fen().split(" ");
  const castling = currentFenParts[2] || "-";
  const enPassant = currentFenParts[3] || "-";
  const halfmove = currentFenParts[4] || "0";
  const fullmove = currentFenParts[5] || "1";

  const newFen = `${fenRanks.join("/")} ${activeColor} ${castling} ${enPassant} ${halfmove} ${fullmove}`;
  try {
    chess.load(newFen);
  } catch (err) {
    console.error("Failed to load synced FEN inside engine:", newFen, err);
  }
}

/**
 * Evaluate the board from White's perspective using precomputed lookup tables.
 */
function evaluateBoard(chess: Chess, wizardSet?: Set<string> | null): number {
  let score = 0;
  const board = chess.board();
  const hasWizards = wizardSet && wizardSet.size > 0;

  for (let r = 0; r < 8; r++) {
    const row = board[r];
    for (let c = 0; c < 8; c++) {
      const piece = row[c];
      if (!piece) continue;

      if (hasWizards) {
        const sq = `${FILES[c]}${RANKS[r]}`;
        if (wizardSet.has(sq)) continue;
      }

      if (piece.color === "w") {
        score += WHITE_SCORES[piece.type][r][c];
      } else {
        score -= BLACK_SCORES[piece.type][r][c];
      }
    }
  }

  return score;
}

/**
 * Minimax with Alpha-Beta Pruning and Time Cutoff.
 */
function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  wizardSet: Set<string> | null,
  startTime: number = Date.now(),
  timeLimitMs: number = 300
): { score: number; move: any } {
  if (depth === 0 || chess.isGameOver() || (Date.now() - startTime > timeLimitMs)) {
    return { score: evaluateBoard(chess, wizardSet), move: null };
  }

  let rawMoves = chess.moves({ verbose: true });
  
  // Filter out illegal Wizard moves
  const moves = wizardSet && wizardSet.size > 0 
    ? rawMoves.filter(move => {
        if (wizardSet.has(move.to)) return false;
        if (wizardSet.has(move.from) && move.captured) return false;
        return true;
      })
    : rawMoves;
  
  // Sort moves to optimize pruning: captures and checks first
  moves.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    if (a.captured) scoreA += 10 + (PIECE_VALUES[a.captured as keyof typeof PIECE_VALUES] || 0);
    if (b.captured) scoreB += 10 + (PIECE_VALUES[b.captured as keyof typeof PIECE_VALUES] || 0);
    if (a.san.includes("+")) scoreA += 5;
    if (b.san.includes("+")) scoreB += 5;
    return scoreB - scoreA;
  });

  let bestMove: any = null;

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const { score } = minimax(chess, depth - 1, alpha, beta, false, wizardSet, startTime, timeLimitMs);
      chess.undo();

      if (score > maxScore) {
        maxScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) {
        break; // beta prune
      }
      if (Date.now() - startTime > timeLimitMs) break;
    }
    return { score: maxScore, move: bestMove };
  } else {
    let minScore = Infinity;
    for (const move of moves) {
      chess.move(move);
      const { score } = minimax(chess, depth - 1, alpha, beta, true, wizardSet, startTime, timeLimitMs);
      chess.undo();

      if (score < minScore) {
        minScore = score;
        bestMove = move;
      }
      beta = Math.min(beta, score);
      if (beta <= alpha) {
        break; // alpha prune
      }
      if (Date.now() - startTime > timeLimitMs) break;
    }
    return { score: minScore, move: bestMove };
  }
}

/**
 * Returns the best move for the current side in the game.
 * Uses adjustable depths based on selected difficulty.
 */
export async function getBestComputerMove(
  fen: string,
  difficulty: "easy" | "medium" | "hard" | "master",
  wizardSquares: string[] = []
): Promise<{ from: string; to: string; promotion?: string } | null> {
  // Wrap in small timeout/promise so it's fully non-blocking and lets React render first
  return new Promise((resolve) => {
    setTimeout(() => {
      let chess: Chess;
      try {
        chess = new Chess(fen);
      } catch (err) {
        console.error("Failed to parse FEN in getBestComputerMove", err);
        resolve(null);
        return;
      }
      
      syncWizardColors(chess, wizardSquares);
      const rawMoves = chess.moves({ verbose: true });
      const wizardSet = wizardSquares.length > 0 ? new Set(wizardSquares) : null;

      // Filter out illegal Wizard moves
      const moves = wizardSet 
        ? rawMoves.filter(move => {
            if (wizardSet.has(move.to)) return false;
            if (wizardSet.has(move.from) && move.captured) return false;
            return true;
          })
        : rawMoves;

      if (moves.length === 0) {
        resolve(null);
        return;
      }

      const activeColor = chess.turn();
      const isMaximizing = activeColor === "w";
      const startTime = Date.now();

      // Easy: Plays random moves 35% of the time, or plays quick depth 1 evaluations.
      if (difficulty === "easy") {
        if (Math.random() < 0.35) {
          const randomMove = moves[Math.floor(Math.random() * moves.length)];
          resolve({ from: randomMove.from, to: randomMove.to, promotion: "q" });
          return;
        }
        const { move } = minimax(chess, 1, -Infinity, Infinity, isMaximizing, wizardSet, startTime, 150);
        const selectedMove = move || moves[Math.floor(Math.random() * moves.length)];
        resolve({ from: selectedMove.from, to: selectedMove.to, promotion: "q" });
        return;
      }

      // Medium: Minimax depth 2
      if (difficulty === "medium") {
        const { move } = minimax(chess, 2, -Infinity, Infinity, isMaximizing, wizardSet, startTime, 250);
        const selectedMove = move || moves[Math.floor(Math.random() * moves.length)];
        resolve({ from: selectedMove.from, to: selectedMove.to, promotion: "q" });
        return;
      }

      // Hard: Minimax depth 3
      if (difficulty === "hard") {
        const { move } = minimax(chess, 3, -Infinity, Infinity, isMaximizing, wizardSet, startTime, 350);
        const selectedMove = move || moves[Math.floor(Math.random() * moves.length)];
        resolve({ from: selectedMove.from, to: selectedMove.to, promotion: "q" });
        return;
      }

      // Master: Minimax depth 4 (strong and strategic)
      if (difficulty === "master") {
        const { move } = minimax(chess, 4, -Infinity, Infinity, isMaximizing, wizardSet, startTime, 450);
        const selectedMove = move || moves[Math.floor(Math.random() * moves.length)];
        resolve({ from: selectedMove.from, to: selectedMove.to, promotion: "q" });
        return;
      }

      const defaultMove = moves[Math.floor(Math.random() * moves.length)];
      resolve({ from: defaultMove.from, to: defaultMove.to, promotion: "q" });
    }, 20);
  });
}
