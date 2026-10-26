import React, { useState } from "react";
import { GameMode, Difficulty, PlayerColor, UITheme, ChessPieceData } from "../types";
import { QueuePlayer } from "../hooks/useOnlineManager";
import { 
  Bot, 
  Users,
  Globe,
  Radio,
  Swords,
  Hammer, 
  Play, 
  RotateCcw, 
  ArrowLeft, 
  Check, 
  Copy, 
  Share2, 
  BookOpen,
  Compass,
  Cpu
} from "lucide-react";

interface ControlPanelProps {
  mode: GameMode;
  difficulty: Difficulty;
  playerColor: PlayerColor;
  currentTurn: PlayerColor;
  status: "setup" | "playing" | "checkmate" | "stalemate" | "draw" | "check";
  winner: PlayerColor | "draw" | null;
  isKingCaptured?: boolean;
  moveHistory: string[];
  fen: string;
  isComputerThinking: boolean;
  onSetMode: (mode: GameMode) => void;
  onSetDifficulty: (difficulty: Difficulty) => void;
  onSetPlayerColor: (color: PlayerColor) => void;
  onStartGame: () => void;
  onUndoMove: () => void;
  onRestartGame: () => void;
  onBackToSetup: () => void;
  onLoadFen: (fen: string) => void;
  onOpenAllTools?: () => void;
  uiTheme?: UITheme;
  onSetUITheme?: (theme: UITheme) => void;
  onOpenRules?: () => void;
  playerId?: string;
  userName?: string;
  defaultName?: string;
  isQueued?: boolean;
  activeQueue?: QueuePlayer[];
  onlineRoomId?: string | null;
  opponentName?: string;
  onlineColor?: PlayerColor;
  onChangeUserName?: (name: string) => void;
  onToggleQueue?: (boardSetup?: Record<string, ChessPieceData>) => void;
  onChallengePlayer?: (playerId: string) => void;
  onLeaveMatch?: () => void;
  onFenInputChange?: (val: string) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  mode,
  difficulty,
  playerColor,
  currentTurn,
  status,
  winner,
  isKingCaptured = false,
  moveHistory,
  fen,
  isComputerThinking,
  onSetMode,
  onSetDifficulty,
  onSetPlayerColor,
  onStartGame,
  onUndoMove,
  onRestartGame,
  onBackToSetup,
  onLoadFen,
  onOpenAllTools,
  uiTheme = "dark",
  playerId = "",
  userName = "",
  defaultName = "",
  isQueued = false,
  activeQueue = [],
  onlineRoomId = null,
  opponentName = "",
  onlineColor = "w",
  onChangeUserName,
  onToggleQueue,
  onChallengePlayer,
  onLeaveMatch,
  onFenInputChange,
}) => {
  const [fenInput, setFenInput] = useState("");
  const [showFenBox, setShowFenBox] = useState(false);
  const [copied, setCopied] = useState(false);

  const isLight = uiTheme === "light";

  const handleCopyFen = () => {
    navigator.clipboard.writeText(fen);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyFen = (e: React.FormEvent) => {
    e.preventDefault();
    if (fenInput.trim()) {
      onLoadFen(fenInput.trim());
      setFenInput("");
    }
  };

  return (
    <div
      id="control-panel-container"
      className={`${
        isLight
          ? "bg-white border-slate-200 text-slate-800 shadow-xl"
          : "bg-[#0f1115] border-slate-800 text-slate-200 shadow-2xl"
      } border rounded-2xl p-5 flex flex-col gap-5 w-full transition-colors duration-200`}
    >
      {status === "setup" ? (
        // --- SETUP STATE ---
        <div className="flex flex-col gap-5">
          <div>
            <h2 className={`text-sm font-bold flex items-center gap-2 tracking-widest uppercase ${isLight ? "text-slate-900" : "text-slate-300"}`}>
              Game Setup
            </h2>
          </div>

          {/* Mode Selector */}
          <div className="flex flex-col gap-2">
            <label className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? "text-slate-700 font-bold" : "text-slate-500"}`}>
              1. Choose Game Mode
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                id="setup-mode-vs-computer"
                onClick={() => onSetMode("vs_computer")}
                className={`relative overflow-hidden backdrop-blur-md flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border text-center transition-all cursor-pointer hover:brightness-110 active:scale-[0.98] ${
                  mode === "vs_computer"
                    ? isLight
                      ? "border-amber-400 bg-gradient-to-b from-amber-100/90 via-yellow-100/60 to-amber-50/40 text-slate-900 font-bold shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_10px_rgba(245,158,11,0.3)]"
                      : "border-amber-400 bg-gradient-to-b from-amber-400/30 via-amber-500/20 to-yellow-500/10 text-amber-200 font-bold shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_0_14px_rgba(245,158,11,0.35)]"
                    : isLight
                    ? "border-slate-200/80 bg-gradient-to-b from-white/70 via-white/30 to-white/10 text-slate-700 hover:border-amber-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]"
                    : "border-slate-800/80 bg-gradient-to-b from-white/10 via-white/5 to-transparent text-slate-400 hover:border-amber-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
                }`}
              >
                <Bot className={`w-4 h-4 ${mode === "vs_computer" ? "text-amber-500 dark:text-amber-400" : isLight ? "text-slate-600" : "text-slate-500"}`} />
                <span className="text-[11px] font-bold leading-tight">Vs. Computer</span>
              </button>

              <button
                id="setup-mode-vs-local"
                onClick={() => onSetMode("vs_local")}
                className={`relative overflow-hidden backdrop-blur-md flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border text-center transition-all cursor-pointer hover:brightness-110 active:scale-[0.98] ${
                  mode === "vs_local"
                    ? isLight
                      ? "border-amber-400 bg-gradient-to-b from-amber-100/90 via-yellow-100/60 to-amber-50/40 text-slate-900 font-bold shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_10px_rgba(245,158,11,0.3)]"
                      : "border-amber-400 bg-gradient-to-b from-amber-400/30 via-amber-500/20 to-yellow-500/10 text-amber-200 font-bold shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_0_14px_rgba(245,158,11,0.35)]"
                    : isLight
                    ? "border-slate-200/80 bg-gradient-to-b from-white/70 via-white/30 to-white/10 text-slate-700 hover:border-amber-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]"
                    : "border-slate-800/80 bg-gradient-to-b from-white/10 via-white/5 to-transparent text-slate-400 hover:border-amber-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
                }`}
              >
                <Users className={`w-4 h-4 ${mode === "vs_local" ? "text-amber-500 dark:text-amber-400" : isLight ? "text-slate-600" : "text-slate-500"}`} />
                <span className="text-[11px] font-bold leading-tight">Local 1v1</span>
              </button>

              <button
                id="setup-mode-vs-online"
                onClick={() => onSetMode("vs_online")}
                className={`relative overflow-hidden backdrop-blur-md flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border text-center transition-all cursor-pointer hover:brightness-110 active:scale-[0.98] ${
                  mode === "vs_online"
                    ? isLight
                      ? "border-amber-400 bg-gradient-to-b from-amber-100/90 via-yellow-100/60 to-amber-50/40 text-slate-900 font-bold shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_2px_10px_rgba(245,158,11,0.3)]"
                      : "border-amber-400 bg-gradient-to-b from-amber-400/30 via-amber-500/20 to-yellow-500/10 text-amber-200 font-bold shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_0_14px_rgba(245,158,11,0.35)]"
                    : isLight
                    ? "border-slate-200/80 bg-gradient-to-b from-white/70 via-white/30 to-white/10 text-slate-700 hover:border-amber-300 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]"
                    : "border-slate-800/80 bg-gradient-to-b from-white/10 via-white/5 to-transparent text-slate-400 hover:border-amber-500/50 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
                }`}
              >
                <Globe className={`w-4 h-4 ${mode === "vs_online" ? "text-amber-500 dark:text-amber-400" : isLight ? "text-slate-600" : "text-slate-500"}`} />
                <span className="text-[11px] font-bold leading-tight">Multiplayer Online</span>
              </button>
            </div>
          </div>

          {/* Online Multiplayer Lobby Controls (Conditional) */}
          {mode === "vs_online" && (
            <div className={`p-3.5 rounded-xl border flex flex-col gap-3 ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-[#0a0b0d]/60 border-slate-800"
            }`}>
              <div className="flex justify-between items-center">
                <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? "text-slate-800" : "text-slate-300"}`}>
                  <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                  Online Matchmaking
                </span>
                <span className="text-[9px] font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  Global Server
                </span>
              </div>

              {/* Player Name Input */}
              {onChangeUserName && (
                <div className="flex flex-col gap-1">
                  <label className={`text-[9px] font-bold uppercase tracking-wider ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                    Your Display Name
                  </label>
                  <input
                    id="setup-online-name-input"
                    type="text"
                    value={userName}
                    placeholder={defaultName || "Guest Player"}
                    onChange={(e) => onChangeUserName(e.target.value)}
                    className={`w-full text-xs px-3 py-1.5 border rounded-lg focus:outline-none focus:border-blue-500 font-bold ${
                      isLight ? "bg-white border-slate-300 text-slate-900" : "bg-[#0f1115] border-slate-700 text-slate-100"
                    }`}
                  />
                </div>
              )}

              {/* Active Online Queue List */}
              {(() => {
                const otherQueue = activeQueue.filter((qPlayer) => qPlayer.playerId !== playerId);
                if (otherQueue.length === 0) return null;
                return (
                  <div className="flex flex-col gap-1.5">
                    <label className={`text-[9px] font-bold uppercase tracking-wider ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                      Players Online in Queue ({otherQueue.length})
                    </label>
                    <div className="flex flex-col gap-1 max-h-32 overflow-y-auto pr-1">
                      {otherQueue.map((qPlayer) => (
                        <div
                          key={qPlayer.playerId}
                          className={`flex justify-between items-center p-2 rounded-lg border text-xs ${
                            isLight ? "bg-white border-slate-200" : "bg-[#0f1115] border-slate-800"
                          }`}
                        >
                          <span className="font-bold truncate text-[11px]">{qPlayer.name}</span>
                          {onChallengePlayer && (
                            <button
                              onClick={() => onChallengePlayer(qPlayer.playerId)}
                              className="px-2.5 py-1 rounded bg-blue-500/85 hover:bg-blue-500/95 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all backdrop-blur-sm bg-gradient-to-b from-white/25 via-transparent to-black/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]"
                            >
                              <Swords className="w-3 h-3" />
                              Challenge
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}


            </div>
          )}

          {/* Side Selector (Conditional) */}
          {mode === "vs_computer" && (
            <div className="flex flex-col gap-2">
              <label className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? "text-slate-700 font-bold" : "text-slate-500"}`}>
                2. Select Your Side
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="setup-side-white"
                  onClick={() => onSetPlayerColor("w")}
                  className={`py-2.5 px-4 rounded-xl border flex items-center justify-center text-center text-xs font-bold transition-all cursor-pointer active:scale-[0.97] active:translate-y-0.5 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] ${
                    playerColor === "w"
                      ? "bg-blue-500/85 text-white border-blue-500/80 shadow-sm backdrop-blur-sm bg-gradient-to-b from-white/25 via-transparent to-black/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]"
                      : isLight
                      ? "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                      : "bg-[#0a0b0d]/50 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  White Pieces
                </button>
                <button
                  id="setup-side-black"
                  onClick={() => onSetPlayerColor("b")}
                  className={`py-2.5 px-4 rounded-xl border flex items-center justify-center text-center text-xs font-bold transition-all cursor-pointer active:scale-[0.97] active:translate-y-0.5 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] ${
                    playerColor === "b"
                      ? "bg-blue-500/85 text-white border-blue-500/80 shadow-sm backdrop-blur-sm bg-gradient-to-b from-white/25 via-transparent to-black/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]"
                      : isLight
                      ? "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                      : "bg-[#0a0b0d]/50 border-slate-800 text-slate-300 hover:border-slate-700"
                  }`}
                >
                  Black Pieces
                </button>
              </div>
            </div>
          )}

          {/* Difficulty Selector (Conditional) */}
          {mode === "vs_computer" && (
            <div className="flex flex-col gap-2">
              <label className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${isLight ? "text-slate-700 font-bold" : "text-slate-500"}`}>
                3. Computer Difficulty
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(["easy", "medium", "hard", "master"] as Difficulty[]).map((diff) => (
                  <button
                    key={diff}
                    id={`setup-diff-${diff}`}
                    onClick={() => onSetDifficulty(diff)}
                    className={`py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer active:scale-[0.95] active:translate-y-0.5 active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] ${
                      difficulty === diff
                        ? "bg-blue-500/85 border-blue-500/80 text-white backdrop-blur-sm bg-gradient-to-b from-white/25 via-transparent to-black/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]"
                        : isLight
                        ? "bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-100"
                        : "bg-[#0a0b0d]/50 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Play Trigger */}
          <button
            id="start-match-btn"
            onClick={() => {
              if (mode === "vs_online") {
                if (onToggleQueue) {
                  onToggleQueue();
                } else {
                  onStartGame();
                }
              } else {
                onStartGame();
              }
            }}
            className={`w-full py-3.5 px-5 text-white font-black rounded-xl backdrop-blur-sm bg-gradient-to-b from-white/30 via-transparent to-black/15 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)] hover:brightness-110 hover:translate-y-[-1px] active:translate-y-[2px] active:scale-[0.98] active:shadow-[inset_0_3px_6px_rgba(0,0,0,0.4)] active:brightness-90 flex items-center justify-center gap-2 transition-all mt-2 cursor-pointer uppercase tracking-widest text-xs border ${
              mode === "vs_online" && isQueued
                ? "bg-rose-600/85 hover:bg-rose-600/95 shadow-[0_4px_20px_rgba(225,29,72,0.35)] border-rose-400/40 animate-pulse ring-2 ring-rose-400/50"
                : "bg-blue-500/85 hover:bg-blue-500/95 shadow-[0_4px_20px_rgba(59,130,246,0.3)] border-blue-400/40"
            }`}
          >
            {mode === "vs_online" && isQueued ? "In Queue..." : "Start"}
          </button>

          {/* Advanced FEN Section */}
          <div className={`pt-2 border-t ${isLight ? "border-slate-200" : "border-slate-800/80"}`}>
            <button
              id="toggle-fen-input-btn"
              onClick={() => setShowFenBox(!showFenBox)}
              className={`text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 transition-colors cursor-pointer ${
                isLight ? "text-slate-600 hover:text-blue-600" : "text-slate-500 hover:text-blue-500"
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              Advanced: Import FEN String
            </button>

            {showFenBox && (
              <form onSubmit={handleApplyFen} className="mt-2.5 flex gap-2">
                <input
                  id="fen-input-field"
                  type="text"
                  value={fenInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFenInput(val);
                    if (onFenInputChange) onFenInputChange(val);
                  }}
                  placeholder="Paste FEN here..."
                  className={`flex-1 border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500 font-mono ${
                    isLight
                      ? "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                      : "bg-[#0a0b0d]/80 border-slate-800 text-slate-300"
                  }`}
                />
                <button
                  id="apply-fen-btn"
                  type="submit"
                  className="px-3.5 py-1.5 bg-blue-500/85 hover:bg-blue-500/95 text-white text-xs font-black rounded-lg transition-all shrink-0 cursor-pointer backdrop-blur-sm bg-gradient-to-b from-white/25 via-transparent to-black/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] border border-blue-400/30"
                >
                  Load
                </button>
              </form>
            )}
          </div>
        </div>
      ) : (
        // --- PLAYING STATE ---
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center gap-2">
            <span
              className={`text-[10px] font-black border px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 ${
                isLight
                  ? "bg-blue-50 border-blue-200 text-blue-800"
                  : "bg-[#0a0b0d] border-slate-800 text-blue-500"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {mode === "vs_computer" 
                ? `Computer (${difficulty})` 
                : mode === "vs_local"
                ? "Local 1v1"
                : mode === "vs_online"
                ? "Online Match"
                : "Single Player"
              }
            </span>

            <div className="flex items-center gap-2">
              <button
                id="back-to-setup-btn"
                onClick={onBackToSetup}
                className={`text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                  isLight ? "text-slate-600 hover:text-blue-600" : "text-slate-400 hover:text-blue-500"
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Exit
              </button>
            </div>
          </div>

          {/* Active Status Display */}
          <div
            id="game-status-display"
            className={`border rounded-2xl p-4 flex flex-col gap-2 items-center text-center ${
              isLight ? "bg-slate-50 border-slate-200" : "bg-[#0a0b0d]/80 border-slate-800/85"
            }`}
          >
            {isComputerThinking ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-bold text-blue-600">Computer is evaluating...</span>
              </div>
            ) : (
              <>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isLight ? "text-slate-600" : "text-slate-500"}`}>
                  {status === "checkmate" || status === "stalemate" || status === "draw" ? "Match Concluded" : "Current Turn"}
                </span>

                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-3.5 h-3.5 rounded-full border shadow-sm ${
                      currentTurn === "w" ? "bg-white border-slate-300" : "bg-slate-900 border-slate-700"
                    }`}
                  />
                  <span className={`text-base font-bold font-sans ${isLight ? "text-slate-900" : "text-slate-100"}`}>
                    {isKingCaptured
                      ? "KO!"
                      : status === "checkmate" && winner
                      ? `${winner === "w" ? "White" : "Black"} Wins by Checkmate!`
                      : status === "stalemate"
                      ? "Stalemate (Draw)"
                      : status === "draw"
                      ? "Match Drawn"
                      : status === "check"
                      ? `${currentTurn === "w" ? "White" : "Black"} is in Check!`
                      : `${currentTurn === "w" ? "White" : "Black"}'s Turn`}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Active Match Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              id="game-undo-btn"
              onClick={onUndoMove}
              disabled={isComputerThinking || moveHistory.length === 0}
              className={`py-2.5 px-4 border font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 hover:border-slate-300"
                  : "bg-[#0a0b0d]/50 hover:bg-[#1e2128]/50 text-slate-300 border-slate-800 hover:border-slate-700"
              }`}
              title="Undo the last move"
            >
              <RotateCcw className="w-4 h-4 text-blue-500" />
              Undo Move
            </button>

            <button
              id="game-reset-btn"
              onClick={onRestartGame}
              disabled={isComputerThinking}
              className={`py-2.5 px-4 border font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-40 ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 hover:border-slate-300"
                  : "bg-[#0a0b0d]/50 hover:bg-[#1e2128]/50 text-slate-300 border-slate-800 hover:border-slate-700"
              }`}
            >
              <RotateCcw className="w-4 h-4 text-blue-500" />
              Restart Game
            </button>
          </div>

          {/* Move History Logger */}
          <div className="flex flex-col gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${isLight ? "text-slate-700" : "text-slate-500"}`}>
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              Moves History ({moveHistory.length})
            </span>
            <div
              id="moves-scroll-area"
              className={`border rounded-xl p-3 h-28 overflow-y-auto font-mono text-xs leading-relaxed scrollbar-thin ${
                isLight
                  ? "bg-slate-50 border-slate-200 text-slate-800"
                  : "bg-[#0a0b0d]/90 border-slate-800/80 text-slate-400"
              }`}
            >
              {moveHistory.length === 0 ? (
                <div className={`text-center py-4 italic ${isLight ? "text-slate-400" : "text-slate-600"}`}>
                  No moves made yet.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, idx) => {
                    const moveNum = idx + 1;
                    const wMove = moveHistory[idx * 2];
                    const bMove = moveHistory[idx * 2 + 1];
                    return (
                      <div key={idx} className="flex gap-2">
                        <span className={`w-6 font-bold ${isLight ? "text-blue-600" : "text-blue-500/50"}`}>{moveNum}.</span>
                        <span className={`font-medium ${isLight ? "text-slate-900" : "text-slate-200"}`}>{wMove}</span>
                        {bMove && <span className={`ml-auto ${isLight ? "text-slate-600" : "text-slate-400"}`}>{bMove}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* FEN Export Copy Area */}
          <div className={`pt-2 border-t flex items-center justify-between text-xs ${isLight ? "border-slate-200 text-slate-600" : "border-slate-800/80 text-slate-400"}`}>
            <span className="font-semibold text-[11px]">Current Position FEN:</span>
            <button
              id="copy-fen-btn"
              onClick={handleCopyFen}
              className={`flex items-center gap-1 border px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
                isLight
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800"
                  : "bg-[#0a0b0d]/50 hover:bg-[#1e2128]/50 border-slate-800/60 text-slate-300"
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-blue-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-blue-500" />
                  Copy FEN
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
