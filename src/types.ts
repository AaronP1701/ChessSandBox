export type GameMode = "vs_computer" | "single_player" | "editor" | "vs_local" | "vs_online";

export type Difficulty = "easy" | "medium" | "hard" | "master";

export type PlayerColor = "w" | "b";

export type UITheme = "dark" | "light";

export interface ChessPieceData {
  type: "p" | "r" | "n" | "b" | "q" | "k" | "z" | "x";
  color: "w" | "b";
  isExpanded?: boolean;
  expandedSquares?: string[];
}

export type BoardSquare = ChessPieceData | null;

export interface GameState {
  mode: GameMode;
  difficulty: Difficulty;
  playerColor: PlayerColor; // Side player plays on vs computer
  currentTurn: PlayerColor;
  status: "setup" | "playing" | "checkmate" | "stalemate" | "draw" | "check";
  winner: PlayerColor | "draw" | null;
  fen: string;
  moveHistory: string[];
  lastMove: { from: string; to: string } | null;
}
