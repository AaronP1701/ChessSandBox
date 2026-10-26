import { useState, useEffect, useRef } from "react";
import { UITheme } from "./types";
import { ChessBoard } from "./components/ChessBoard";
import { PiecePalette } from "./components/PiecePalette";
import { ControlPanel } from "./components/ControlPanel";
import { RulesModal } from "./components/RulesModal";
import { Header } from "./components/Header";
import { useOnlineManager } from "./hooks/useOnlineManager";
import { useChessGame } from "./hooks/useChessGame";
import { playButtonClickSound, playSoftPulseSound, playWhooshSound } from "./utils/audio";
import { Flame, HelpCircle, X, Sparkles, Wrench, SlidersHorizontal } from "lucide-react";

export default function App() {
  // UI Theme state (light / dark)
  const [uiTheme, setUiTheme] = useState<UITheme>("light");
  const isLight = uiTheme === "light";

  // Rules Pop-up modal state
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  // Match Settings / Control Panel Pop-up modal state
  const [isControlPanelModalOpen, setIsControlPanelModalOpen] = useState<boolean>(false);
  // All Tools Setup Pop-up modal state
  const [isAllToolsOpen, setIsAllToolsOpen] = useState<boolean>(false);
  // Secret feature: Admin Tools invisible until "Dinnerbone" is entered into FEN String input
  const [isDinnerboneUnlocked, setIsDinnerboneUnlocked] = useState<boolean>(false);

  const roomContainerRef = useRef<HTMLDivElement | null>(null);

  // Online Manager Callback Refs to bridge online events with chess engine
  const handleOpponentMovedRef = useRef<((data: any) => void) | null>(null);
  const handleGameStartedRef = useRef<((data: any) => void) | null>(null);
  const handleOpponentLeftRef = useRef<(() => void) | null>(null);

  // Initialize online multiplayer socket & queue manager
  const onlineManager = useOnlineManager({
    onGameStarted: (data) => {
      handleGameStartedRef.current?.(data);
    },
    onOpponentMoved: (data) => {
      handleOpponentMovedRef.current?.(data);
    },
    onOpponentLeft: () => {
      handleOpponentLeftRef.current?.();
    },
  });

  // Initialize modular chess game state engine
  const game = useChessGame({
    onSendOnlineMove: onlineManager.sendOnlineMove,
    onlineColor: onlineManager.onlineColor,
  });

  // Wire up callback refs
  handleGameStartedRef.current = (data) => {
    game.handleStartOnlineGame(data.playerColor, data.boardSetup);
  };

  handleOpponentMovedRef.current = (data) => {
    game.handleOpponentMove(data);
  };

  handleOpponentLeftRef.current = () => {
    game.setValidationError("Match ended. Opponent disconnected or left the game.");
    game.setMode("vs_computer");
    onlineManager.setOnlineRoomId(null);
    onlineManager.setIsQueued(false);
  };

  // Close pop-ups on Escape key or clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        onlineManager.isRoomOpen &&
        roomContainerRef.current &&
        !roomContainerRef.current.contains(event.target as Node)
      ) {
        onlineManager.setIsRoomOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (onlineManager.isRoomOpen) onlineManager.setIsRoomOpen(false);
        if (isRulesOpen) setIsRulesOpen(false);
        if (isControlPanelModalOpen) setIsControlPanelModalOpen(false);
      }
    };

    if (onlineManager.isRoomOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onlineManager.isRoomOpen, isRulesOpen, onlineManager]);

  // Global button click sound effect listener
  useEffect(() => {
    const handleButtonClickSound = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const clickable = target.closest("button, [role='button'], input[type='button'], input[type='submit'], input[type='reset']");
      if (clickable && !clickable.hasAttribute("disabled")) {
        const id = clickable.id || "";
        const soundType = clickable.getAttribute("data-sound");
        if (
          id.startsWith("theme-") ||
          soundType === "whoosh" ||
          clickable.classList.contains("sound-whoosh")
        ) {
          playWhooshSound();
        } else if (
          id === "toggle-board-rotate-btn" ||
          id === "toggle-facing-pieces-btn" ||
          id === "toggle-board-flip-btn" ||
          id === "board-actions-menu-btn" ||
          soundType === "pulse" ||
          clickable.classList.contains("sound-pulse")
        ) {
          playSoftPulseSound();
        } else {
          playButtonClickSound();
        }
      }
    };

    document.addEventListener("click", handleButtonClickSound, { capture: true });
    return () => {
      document.removeEventListener("click", handleButtonClickSound, { capture: true });
    };
  }, []);

  return (
    <div
      id="main-container"
      className={`min-h-screen font-sans flex flex-col items-center transition-colors duration-200 ${
        isLight ? "bg-striped-light text-slate-900" : "bg-striped-dark text-slate-200"
      }`}
    >
      {/* Visual background gradient accents */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-slate-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Header Bar with Online Manager Integration */}
      <Header
        uiTheme={uiTheme}
        setUiTheme={setUiTheme}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenControlPanel={() => setIsControlPanelModalOpen(true)}
        isControlPanelOpen={isControlPanelModalOpen}
        socket={onlineManager.socket}
        playerId={onlineManager.playerId}
        userName={onlineManager.userName}
        defaultName={onlineManager.defaultName}
        isQueued={onlineManager.isQueued}
        activeQueue={onlineManager.activeQueue}
        onlineRoomId={onlineManager.onlineRoomId}
        opponentName={onlineManager.opponentName}
        onlineColor={onlineManager.onlineColor}
        isRoomOpen={onlineManager.isRoomOpen}
        setIsRoomOpen={onlineManager.setIsRoomOpen}
        roomContainerRef={roomContainerRef}
        onChangeUserName={onlineManager.changeUserName}
        onToggleQueue={(customBoard) => onlineManager.toggleQueue(customBoard || game.editorBoard)}
        onChallengePlayer={(targetId) => onlineManager.challengePlayer(targetId, game.editorBoard)}
        onLeaveMatch={onlineManager.leaveMatch}
      />

      {/* Primary Application Layout Grid */}
      <main className="w-full max-w-7xl px-4 py-8 md:py-12 flex flex-col items-center gap-8 z-10">
        
        {/* Verification Warnings Block */}
        {game.validationError && (
          <div id="error-alert-banner" className="w-full max-w-5xl bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex gap-4 items-start shadow-lg animate-fade-in">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl shrink-0">
              <Flame className="w-5 h-5 animate-bounce" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-rose-200">Validation Notice</h4>
              <p className="text-xs text-rose-300/90 mt-0.5 leading-relaxed">{game.validationError}</p>
            </div>
            <button
              id="close-error-btn"
              onClick={() => game.setValidationError(null)}
              className="text-slate-400 hover:text-white p-1 hover:bg-slate-900 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Dashboard layout */}
        <div className="w-full max-w-4xl flex flex-col items-center justify-center gap-6">
          
          {/* Chessboard Column */}
          <section className="w-full flex flex-col items-center gap-4 justify-center">
            <ChessBoard
              board={game.activeBoard}
              isEditor={game.status === "setup"}
              selectedBrush={game.selectedBrush}
              onSelectBrush={game.setSelectedBrush}
              flipped={game.flipped}
              onSquareClick={game.handleSquareClick}
              onPieceDrop={game.handlePieceDrop}
              onPieceDragOff={game.handlePieceDragOff}
              validMoves={game.validMoves}
              selectedSquare={game.selectedSquare}
              lastMove={game.lastMove}
              kingInCheckSquare={game.kingInCheckSquare}
              theme={game.theme}
              setTheme={game.setTheme}
              onToggleFlip={() => game.setFlipped(!game.flipped)}
              currentTurn={game.currentTurn}
              isVsComputer={game.mode === "vs_computer"}
              difficulty={game.difficulty}
              promotionPending={game.promotionPending}
              onSelectPromotion={game.handleSelectPromotion}
              onCancelPromotion={() => game.setPromotionPending(null)}
              rotation={game.boardRotation}
              onToggleRotation={game.handleToggleRotation}
              mode={game.mode}
              facingPieces={game.facingPieces}
              onToggleFacingPieces={game.handleToggleFacingPieces}
              onClearBoard={game.handleClearBoard}
              onResetBoard={game.handleResetBoard}
              onOpenAllTools={() => setIsAllToolsOpen(true)}
              uiTheme={uiTheme}
            />
          </section>

          {/* Optional Admin Tools Section when unlocked */}
          {(isDinnerboneUnlocked || isAllToolsOpen) && (
            <section className="w-full max-w-lg flex flex-col gap-4">
              {game.status === "setup" && (
                <div
                  id="all-tools-banner-container"
                  className={`border rounded-2xl p-2 transition-colors ${
                    isDinnerboneUnlocked ? "block" : "hidden"
                  } ${
                    isLight
                      ? "bg-white border-slate-200 shadow-md text-slate-800"
                      : "bg-[#0f1115] border-slate-800 shadow-xl text-slate-200"
                  }`}
                >
                  <button
                    id="all-tools-btn"
                    onClick={() => setIsAllToolsOpen((prev) => !prev)}
                    className="w-full py-3.5 px-6 rounded-xl bg-purple-600/85 hover:bg-purple-600/95 active:bg-purple-700/95 text-white font-extrabold text-sm sm:text-base tracking-wide flex items-center justify-center text-center shadow-lg shadow-purple-600/30 backdrop-blur-md bg-gradient-to-b from-white/25 via-white/5 to-transparent shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] transition-all transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer border border-purple-400/40"
                  >
                    <span>Admin Tools</span>
                  </button>
                </div>
              )}

              {isAllToolsOpen && (
                <div id="inline-piece-palette-wrapper" className="transition-all duration-300 animate-fade-in">
                  <PiecePalette
                    selectedBrush={game.selectedBrush}
                    onSelectBrush={game.setSelectedBrush}
                    onClearBoard={game.handleClearBoard}
                    onResetBoard={game.handleResetBoard}
                    uiTheme={uiTheme}
                    onClose={() => setIsAllToolsOpen(false)}
                  />
                </div>
              )}
            </section>
          )}

        </div>
      </main>

      {/* Dynamic Footer with Guidance Tips */}
      <footer
        id="app-footer"
        className={`w-full border-t mt-auto py-6 px-12 text-center text-xs flex justify-center items-center gap-4 transition-colors duration-200 ${
          isLight
            ? "bg-white border-slate-200 text-slate-600"
            : "bg-[#0a0b0d] border-[#1e2128] text-slate-500"
        }`}
      >
        <span className={`font-mono text-[10px] ${isLight ? "text-slate-500" : "text-slate-600"}`}>
          SANDBOX CHESS ENGINE LAB v1.2
        </span>
      </footer>


      {/* Piece Movements & Rules Pop-up Modal */}
      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
        uiTheme={uiTheme}
      />

      {/* Control Panel / Match Settings Pop-up Modal */}
      {isControlPanelModalOpen && (
        <div
          id="control-panel-modal-overlay"
          onClick={() => setIsControlPanelModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/65 flex items-center justify-center p-4 overflow-y-auto animate-fade-in"
        >
          <div
            id="control-panel-modal-content"
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl p-5 border shadow-2xl transition-all ${
              isLight
                ? "bg-white border-blue-500 text-slate-900 shadow-blue-500/20"
                : "bg-[#0f1115] border-blue-500/80 text-slate-100 shadow-black/80"
            }`}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-inherit z-10">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-extrabold uppercase tracking-wider font-mono">
                  Match Settings & Controls
                </h3>
              </div>
              <button
                id="close-control-panel-modal-btn"
                onClick={() => setIsControlPanelModalOpen(false)}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                  isLight
                    ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700"
                    : "bg-[#181b20] hover:bg-[#22262e] border-slate-700 text-slate-300"
                }`}
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <ControlPanel
              mode={game.mode}
              difficulty={game.difficulty}
              playerColor={game.playerColor}
              currentTurn={game.currentTurn}
              status={game.status}
              winner={game.winner}
              isKingCaptured={game.isKingCaptured}
              moveHistory={game.moveHistory}
              fen={game.status === "playing" ? (game.chessRef.current?.fen() || "") : game.getEditorFen()}
              isComputerThinking={game.isComputerThinking}
              onSetMode={game.setMode}
              onSetDifficulty={game.setDifficulty}
              onSetPlayerColor={game.setPlayerColor}
              onStartGame={() => {
                game.handleStartGame();
                setIsControlPanelModalOpen(false);
              }}
              onUndoMove={game.handleUndoMove}
              onRestartGame={game.handleRestartGame}
              onBackToSetup={game.handleBackToSetup}
              onLoadFen={game.handleLoadFen}
              onOpenAllTools={() => setIsAllToolsOpen((prev) => !prev)}
              uiTheme={uiTheme}
              playerId={onlineManager.playerId}
              userName={onlineManager.userName}
              defaultName={onlineManager.defaultName}
              isQueued={onlineManager.isQueued}
              activeQueue={onlineManager.activeQueue}
              onlineRoomId={onlineManager.onlineRoomId}
              opponentName={onlineManager.opponentName}
              onlineColor={onlineManager.onlineColor}
              onChangeUserName={onlineManager.changeUserName}
              onToggleQueue={(customBoard) => onlineManager.toggleQueue(customBoard || game.editorBoard)}
              onChallengePlayer={(targetId) => onlineManager.challengePlayer(targetId, game.editorBoard)}
              onLeaveMatch={onlineManager.leaveMatch}
              onFenInputChange={(val) => {
                if (val.toLowerCase().includes("dinnerbone")) {
                  setIsDinnerboneUnlocked(true);
                }
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}
