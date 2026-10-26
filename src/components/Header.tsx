import React, { useState, useRef, useEffect } from "react";
import { Crown, BookOpen, Sun, Moon, Settings, SlidersHorizontal } from "lucide-react";
import { UITheme, PlayerColor } from "../types";
import { QueuePlayer } from "../hooks/useOnlineManager";

interface HeaderProps {
  uiTheme: UITheme;
  setUiTheme: (theme: UITheme) => void;
  onOpenRules: () => void;
  onOpenControlPanel?: () => void;
  isControlPanelOpen?: boolean;
  socket: WebSocket | null;
  playerId: string;
  userName: string;
  defaultName: string;
  isQueued: boolean;
  activeQueue: QueuePlayer[];
  onlineRoomId: string | null;
  opponentName: string;
  onlineColor: PlayerColor;
  isRoomOpen: boolean;
  setIsRoomOpen: (open: boolean) => void;
  roomContainerRef: React.RefObject<HTMLDivElement | null>;
  onChangeUserName: (name: string) => void;
  onToggleQueue: () => void;
  onChallengePlayer: (playerId: string) => void;
  onLeaveMatch: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  uiTheme,
  setUiTheme,
  onOpenRules,
  onOpenControlPanel,
  isControlPanelOpen,
}) => {
  const isLight = uiTheme === "light";
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    if (isSettingsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSettingsOpen]);

  return (
    <header
      id="main-header"
      className={`relative w-full border-b-2 sticky top-0 z-50 py-4.5 px-6 md:px-12 flex justify-between items-center backdrop-blur-md transition-colors duration-200 overflow-visible ${
        isLight
          ? "bg-white/90 border-blue-500 shadow-[0_4px_12px_rgba(59,130,246,0.15)]"
          : "bg-[#0f1115]/90 border-blue-500/80 shadow-[0_4px_15px_rgba(59,130,246,0.25)]"
      }`}
    >
      <div className="flex items-center gap-3 relative z-10">
        <div className={`w-10 h-10 border rounded-xl flex items-center justify-center shadow-lg relative ${
          isLight ? "bg-blue-50 border-blue-200" : "bg-gradient-to-tr from-[#1e2128] to-[#2a2e36] border-[#3e444e]"
        }`}>
          <Crown className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h1 className={`text-sm sm:text-xl font-black tracking-wider sm:tracking-widest flex items-center gap-1 sm:gap-1.5 font-sans ${
            isLight ? "text-slate-900" : "text-white"
          }`}>
            SANDBOX <span className="text-blue-500 font-light">CHESS</span>
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5 relative z-10" ref={settingsRef}>
        <button
          id="control-panel-header-btn"
          onClick={onOpenControlPanel}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-3.5 sm:py-2 border rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer backdrop-blur-sm bg-gradient-to-b from-white/30 via-transparent to-black/15 hover:brightness-110 hover:translate-y-[-1px] active:translate-y-[1px] active:scale-[0.98] active:shadow-[inset_0_3px_6px_rgba(0,0,0,0.4)] active:brightness-90 ${
            isControlPanelOpen
              ? "bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
              : isLight
              ? "bg-slate-200/90 text-slate-900 border-blue-500 shadow-[0_2px_8px_rgba(59,130,246,0.15),inset_0_1px_1px_rgba(255,255,255,0.7)]"
              : "bg-[#1e2128]/95 text-slate-100 border-blue-500/80 shadow-[0_2px_8px_rgba(59,130,246,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)]"
          }`}
          title="Match Settings & Controls"
        >
          <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="hidden sm:inline font-mono">Play</span>
        </button>

        <button
          id="settings-header-btn"
          onClick={() => setIsSettingsOpen((prev) => !prev)}
          className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-3.5 sm:py-2 border rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer backdrop-blur-sm bg-gradient-to-b from-white/30 via-transparent to-black/15 hover:brightness-110 hover:translate-y-[-1px] active:translate-y-[1px] active:scale-[0.98] active:shadow-[inset_0_3px_6px_rgba(0,0,0,0.4)] active:brightness-90 ${
            isSettingsOpen
              ? "bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
              : isLight
              ? "bg-slate-200/90 text-slate-900 border-blue-500 shadow-[0_2px_8px_rgba(59,130,246,0.15),inset_0_1px_1px_rgba(255,255,255,0.7)]"
              : "bg-[#1e2128]/95 text-slate-100 border-blue-500/80 shadow-[0_2px_8px_rgba(59,130,246,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)]"
          }`}
          title="Settings"
        >
          <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="hidden sm:inline font-mono">Settings</span>
        </button>

        {isSettingsOpen && (
          <div
            id="settings-dropdown-menu"
            className={`absolute right-0 top-12 z-50 w-48 p-1.5 rounded-xl border shadow-xl flex flex-col gap-1 backdrop-blur-md animate-fade-in ${
              isLight
                ? "bg-white/95 border-blue-500 text-slate-900 shadow-blue-500/15"
                : "bg-[#0f1115]/95 border-blue-500/80 text-slate-100 shadow-black/60"
            }`}
          >
            <button
              id="settings-option-rules"
              onClick={() => {
                onOpenRules();
                setIsSettingsOpen(false);
              }}
              className={`w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
                isLight ? "hover:bg-slate-100 text-slate-800" : "hover:bg-slate-800 text-slate-200"
              }`}
            >
              <BookOpen className="w-4 h-4 text-blue-500" />
              <span>Piece Movements</span>
            </button>

            <button
              id="settings-option-theme"
              onClick={() => {
                setUiTheme(isLight ? "dark" : "light");
                setIsSettingsOpen(false);
              }}
              className={`w-full px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-2.5 transition-colors cursor-pointer ${
                isLight ? "hover:bg-slate-100 text-slate-800" : "hover:bg-slate-800 text-slate-200"
              }`}
            >
              {isLight ? (
                <>
                  <Moon className="w-4 h-4 text-blue-500" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-blue-400" />
                  <span>Light Mode</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

