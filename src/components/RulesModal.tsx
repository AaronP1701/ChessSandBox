import React, { useState } from "react";
import { UITheme } from "../types";
import { ChessPiece } from "./ChessPieces";
import { X, Sparkles, BookOpen, ShieldAlert, Swords, Castle, Crown } from "lucide-react";

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  uiTheme?: UITheme;
}

export const RulesModal: React.FC<RulesModalProps> = ({
  isOpen,
  onClose,
  uiTheme = "dark",
}) => {
  const [activeTab, setActiveTab] = useState<"pieces" | "special" | "setup">("pieces");
  const isLight = uiTheme === "light";

  // Close on Escape key press
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="rules-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 animate-fade-in"
      onClick={onClose}
    >
      <div
        id="rules-modal-container"
        className={`relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border-2 border-black shadow-[8px_8px_0px_0px_#000000] flex flex-col ${
          isLight ? "bg-white text-slate-900" : "bg-[#12141a] text-slate-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex justify-between items-center ${
          isLight ? "border-slate-200 bg-slate-50" : "border-slate-800 bg-[#0b0c0f]"
        }`}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-500 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide flex items-center gap-2 font-sans uppercase">
                Piece Movements & Rules
              </h2>
              <p className={`text-[11px] font-medium ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                Guide to chess piece mechanics, special moves, and custom sandbox pieces
              </p>
            </div>
          </div>

          <button
            id="close-rules-modal-btn"
            onClick={onClose}
            className={`p-1.5 rounded-xl border-2 border-black transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000000] active:translate-y-0 active:shadow-[1px_1px_0px_0px_#000000] ${
              isLight
                ? "bg-slate-200/85 text-slate-800 hover:bg-slate-300/90 backdrop-blur-sm bg-gradient-to-b from-white/40 via-white/10 to-transparent shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]"
                : "bg-[#1e2128]/85 text-slate-200 hover:bg-slate-700/85 backdrop-blur-sm bg-gradient-to-b from-white/10 to-transparent shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]"
            }`}
            title="Close Window (Esc or click outside)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Nav Tabs */}
        <div className={`flex border-b px-4 sm:px-5 gap-2 pt-2.5 ${
          isLight ? "border-slate-200 bg-slate-100/60" : "border-slate-800 bg-[#0e1015]"
        }`}>
          <button
            id="tab-pieces-btn"
            onClick={() => setActiveTab("pieces")}
            className={`py-2 px-3.5 text-xs font-bold rounded-t-xl border-t-2 border-x-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "pieces"
                ? isLight
                  ? "bg-white border-black text-blue-600 shadow-[0_-2px_0_0_#000000]"
                  : "bg-[#12141a] border-blue-500/80 text-blue-400"
                : isLight
                ? "border-transparent text-slate-600 hover:text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            Piece Movements
          </button>

          <button
            id="tab-special-btn"
            onClick={() => setActiveTab("special")}
            className={`py-2 px-3.5 text-xs font-bold rounded-t-xl border-t-2 border-x-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "special"
                ? isLight
                  ? "bg-white border-black text-blue-600 shadow-[0_-2px_0_0_#000000]"
                  : "bg-[#12141a] border-blue-500/80 text-blue-400"
                : isLight
                ? "border-transparent text-slate-600 hover:text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Castle className="w-3.5 h-3.5" />
            Special Moves
          </button>

          <button
            id="tab-setup-btn"
            onClick={() => setActiveTab("setup")}
            className={`py-2 px-3.5 text-xs font-bold rounded-t-xl border-t-2 border-x-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === "setup"
                ? isLight
                  ? "bg-white border-black text-blue-600 shadow-[0_-2px_0_0_#000000]"
                  : "bg-[#12141a] border-blue-500/80 text-blue-400"
                : isLight
                ? "border-transparent text-slate-600 hover:text-slate-900"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Game Rules
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-4">
          {activeTab === "pieces" && (
            <div className="flex flex-col gap-4">
              {/* Custom Piece Spotlight: The Wizard */}
              <div className={`p-4 rounded-xl border-2 border-blue-500/60 flex flex-col sm:flex-row gap-3 items-start sm:items-center ${
                isLight ? "bg-blue-50/80 text-slate-900" : "bg-blue-500/10 text-blue-200"
              }`}>
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center shrink-0 p-1.5">
                  <ChessPiece type="z" color="w" className="w-full h-full" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm uppercase tracking-wide text-blue-600 dark:text-blue-400">
                      Custom Piece: The Wizard
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 font-mono">
                      FAIRY PIECE
                    </span>
                  </div>
                  <p className={`text-xs mt-1 leading-relaxed ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                    • <strong>Movement:</strong> Moves forward 1 square like a Pawn (no capture moves).
                    <br />
                    • <strong>Immunity:</strong> Cannot capture enemy pieces and is <strong>completely immune to capture</strong>.
                    <br />
                    • <strong>Swap Gimmick:</strong> Select a friendly Wizard on your turn to <strong>swap places with any friendly piece</strong> on the board!
                  </p>
                </div>
              </div>

              {/* Grid of Standard Pieces */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Pawn */}
                <div className={`p-3.5 rounded-xl border flex gap-3 ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0f1115] border-slate-800"}`}>
                  <div className="w-10 h-10 shrink-0">
                    <ChessPiece type="p" color="w" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500">Pawn (♟)</h4>
                    <p className={`text-[11px] mt-0.5 leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                      Moves forward 1 square (2 on first move). Captures 1 square diagonally forward. Eligible for En Passant & Promotion.
                    </p>
                  </div>
                </div>

                {/* Knight */}
                <div className={`p-3.5 rounded-xl border flex gap-3 ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0f1115] border-slate-800"}`}>
                  <div className="w-10 h-10 shrink-0">
                    <ChessPiece type="n" color="w" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500">Knight (♞)</h4>
                    <p className={`text-[11px] mt-0.5 leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                      Moves in an "L"-shape (2 squares one direction, 1 perpendicular). <strong>Jumps over</strong> all intervening pieces.
                    </p>
                  </div>
                </div>

                {/* Bishop */}
                <div className={`p-3.5 rounded-xl border flex gap-3 ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0f1115] border-slate-800"}`}>
                  <div className="w-10 h-10 shrink-0">
                    <ChessPiece type="b" color="w" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500">Bishop (♝)</h4>
                    <p className={`text-[11px] mt-0.5 leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                      Moves diagonally any number of unblocked squares. Always stays on its starting square color.
                    </p>
                  </div>
                </div>

                {/* Rook */}
                <div className={`p-3.5 rounded-xl border flex gap-3 ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0f1115] border-slate-800"}`}>
                  <div className="w-10 h-10 shrink-0">
                    <ChessPiece type="r" color="w" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500">Rook (♜)</h4>
                    <p className={`text-[11px] mt-0.5 leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                      Moves horizontally or vertically any number of unblocked squares. Combines with King for Castling.
                    </p>
                  </div>
                </div>

                {/* Queen */}
                <div className={`p-3.5 rounded-xl border flex gap-3 ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0f1115] border-slate-800"}`}>
                  <div className="w-10 h-10 shrink-0">
                    <ChessPiece type="q" color="w" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500">Queen (♛)</h4>
                    <p className={`text-[11px] mt-0.5 leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                      Moves in any straight line (horizontal, vertical, diagonal) any number of unblocked squares.
                    </p>
                  </div>
                </div>

                {/* King */}
                <div className={`p-3.5 rounded-xl border flex gap-3 ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0f1115] border-slate-800"}`}>
                  <div className="w-10 h-10 shrink-0">
                    <ChessPiece type="k" color="w" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500">King (♚)</h4>
                    <p className={`text-[11px] mt-0.5 leading-relaxed ${isLight ? "text-slate-600" : "text-slate-400"}`}>
                      Moves 1 square in any direction. Must be protected from Check. Exactly 1 King per side is required on board.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "special" && (
            <div className="flex flex-col gap-3">
              {/* Castling */}
              <div className={`p-4 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0f1115] border-slate-800"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Castle className="w-4 h-4 text-blue-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500">Castling</h4>
                </div>
                <p className={`text-xs leading-relaxed ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                  Simultaneous move where King slides 2 squares towards a Rook, and the Rook hops over the King. Allowed only if neither King nor Rook has moved, squares between them are empty, and the King is not currently in check or passing through check.
                </p>
              </div>

              {/* En Passant */}
              <div className={`p-4 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0f1115] border-slate-800"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Swords className="w-4 h-4 text-blue-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500">En Passant Capture</h4>
                </div>
                <p className={`text-xs leading-relaxed ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                  If an opponent moves a pawn 2 squares forward on its first move and lands directly adjacent to your pawn, you may capture that pawn diagonally behind it on your immediate next turn.
                </p>
              </div>

              {/* Pawn Promotion */}
              <div className={`p-4 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0f1115] border-slate-800"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500">Pawn Promotion</h4>
                </div>
                <p className={`text-xs leading-relaxed ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                  When a pawn reaches the opposite end rank (8th rank for White, 1st for Black), a comic pop-up prompt allows you to choose its promotion to a Queen, Rook, Bishop, or Knight.
                </p>
              </div>
            </div>
          )}

          {activeTab === "setup" && (
            <div className="flex flex-col gap-3">
              {/* Board Validation */}
              <div className={`p-4 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0f1115] border-slate-800"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldAlert className="w-4 h-4 text-blue-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500">Sandbox Board Validation</h4>
                </div>
                <p className={`text-xs leading-relaxed ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                  You can design any wild or tactical chess setup in the Piece Palette. However, to start a valid game, the board must contain exactly <strong>1 White King or 1 White Omni piece</strong> and <strong>1 Black King or 1 Black Omni piece</strong>. Pawns cannot be placed on ranks 1 or 8.
                </p>
              </div>

              {/* Checkmate & Stalemate */}
              <div className={`p-4 rounded-xl border ${isLight ? "bg-slate-50 border-slate-200" : "bg-[#0f1115] border-slate-800"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-4 h-4 text-blue-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-500 font-sans">Check, Checkmate & Stalemate</h4>
                </div>
                <p className={`text-xs leading-relaxed ${isLight ? "text-slate-700" : "text-slate-300"}`}>
                  • <strong>Check:</strong> King is under threat. You must respond by moving the king, blocking, or capturing the attacker.
                  <br />
                  • <strong>Checkmate:</strong> King is in check and no legal moves can rescue it. Game over!
                  <br />
                  • <strong>Stalemate / Draw:</strong> Player has no legal moves and is not in check.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`p-3.5 border-t flex justify-center items-center text-xs text-center font-medium ${
          isLight ? "border-slate-200 bg-slate-50 text-slate-500" : "border-slate-800 bg-[#0b0c0f] text-slate-400"
        }`}>
          <span>Click anywhere outside this pop-up window or the ✕ icon to close</span>
        </div>
      </div>
    </div>
  );
};
