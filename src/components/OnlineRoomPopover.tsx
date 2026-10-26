import React from "react";
import { X } from "lucide-react";
import { PlayerColor } from "../types";
import { QueuePlayer } from "../hooks/useOnlineManager";

interface OnlineRoomPopoverProps {
  playerId: string;
  userName: string;
  defaultName: string;
  isQueued: boolean;
  activeQueue: QueuePlayer[];
  onlineRoomId: string | null;
  opponentName: string;
  onlineColor: PlayerColor;
  onClose: () => void;
  onChangeUserName: (name: string) => void;
  onToggleQueue: () => void;
  onChallengePlayer: (playerId: string) => void;
  onLeaveMatch: () => void;
}

export const OnlineRoomPopover: React.FC<OnlineRoomPopoverProps> = ({
  playerId,
  userName,
  defaultName,
  isQueued,
  activeQueue,
  onlineRoomId,
  opponentName,
  onlineColor,
  onClose,
  onChangeUserName,
  onToggleQueue,
  onChallengePlayer,
  onLeaveMatch,
}) => {
  return (
    <div
      id="room-popover-bubble"
      className="absolute right-0 top-full mt-3.5 bg-white border-[3px] border-black rounded-xl shadow-[6px_6px_0px_0px_#000000] text-black w-72 md:w-80 p-4 z-50 animate-fade-in flex flex-col gap-3"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Little speech bubble triangle pointer pointing to Room button */}
      <div className="absolute right-6 -top-2.5 w-4 h-4 bg-white border-l-[3px] border-t-[3px] border-black rotate-45 z-0" />

      <div className="relative z-10 flex flex-col gap-3">
        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
          <span className="text-[10px] font-black tracking-wider text-black font-mono uppercase flex items-center gap-1">
            👥 WAITING ROOM
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              ID: {playerId || "Connecting..."}
            </span>
            <button
              id="close-room-window-btn"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-500 hover:text-black hover:bg-slate-100 transition-all cursor-pointer"
              title="Close Room Window (Esc or click outside)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Name Input */}
        <div className="flex flex-col gap-1">
          <label htmlFor="user-name-input" className="text-[9px] font-black tracking-wide text-slate-600 uppercase font-mono">
            YOUR DISPLAY NAME
          </label>
          <input
            id="user-name-input"
            type="text"
            value={userName}
            placeholder={defaultName || "user #"}
            onChange={(e) => onChangeUserName(e.target.value)}
            className="w-full text-xs px-3 py-1.5 bg-slate-50 border-2 border-black rounded-lg focus:outline-none focus:bg-blue-50 font-bold transition-all text-slate-950"
          />
        </div>

        {/* Queue Toggle Button */}
        <button
          id="queue-toggle-btn"
          onClick={onToggleQueue}
          className={`w-full py-2 border-2 border-black rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-[2px_2px_0px_0px_#000000] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000000] active:translate-y-0 active:shadow-[1px_1px_0px_0px_#000000] ${
            isQueued 
              ? "bg-rose-400/85 text-black hover:bg-rose-400/95 backdrop-blur-sm bg-gradient-to-b from-white/30 via-white/5 to-transparent shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]" 
              : "bg-blue-400/85 text-black hover:bg-blue-400/95 backdrop-blur-sm bg-gradient-to-b from-white/30 via-white/5 to-transparent shadow-[inset_0_1px_1px_rgba(255,255,255,0.5)]"
          }`}
        >
          {isQueued ? "✕ Cancel Queue" : "⚡ Enter Queue"}
        </button>

        {/* Active Players in Queue */}
        <div className="flex flex-col gap-1.5 pt-1">
          {(() => {
            const otherPlayers = activeQueue.filter((p) => p.playerId !== playerId);
            return (
              <>
                <span className="text-[9px] font-black tracking-wide text-slate-600 uppercase font-mono">
                  ONLINE QUEUE ({otherPlayers.length})
                </span>
                <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                  {otherPlayers.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic text-center py-2">
                      No players currently queuing...
                    </p>
                  ) : (
                    otherPlayers.map((p) => (
                      <button
                        key={p.playerId}
                        id={`queue-player-${p.playerId}-btn`}
                        onClick={() => onChallengePlayer(p.playerId)}
                        className="w-full flex justify-between items-center px-2.5 py-1.5 border-2 border-black rounded-lg transition-all text-[11px] font-bold text-left bg-blue-50 hover:bg-blue-200 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#000000] cursor-pointer"
                      >
                        <span className="truncate max-w-[140px]">{p.name}</span>
                        <span className="text-[8px] font-black uppercase text-blue-600 tracking-wider">
                          ⚔️ Battle
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </>
            );
          })()}
        </div>

        {/* Online Match Information */}
        {onlineRoomId && (
          <div className="mt-1 p-2 bg-emerald-50 border-2 border-emerald-500 rounded-xl text-slate-900 text-xs flex flex-col gap-0.5">
            <span className="font-extrabold text-emerald-800 text-[10px] flex items-center gap-1">
              🟢 ACTIVE MATCH
            </span>
            <span className="text-[11px]">Opponent: <strong className="text-emerald-950">{opponentName}</strong></span>
            <span className="text-[11px]">Your Side: <strong>{onlineColor === "w" ? "White (First)" : "Black (Second)"}</strong></span>
            <button
              id="leave-online-match-btn"
              onClick={onLeaveMatch}
              className="mt-1.5 py-1 px-2 bg-white hover:bg-rose-50 border border-slate-300 text-[9px] text-rose-600 hover:text-rose-700 rounded font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              Leave Match
            </button>
          </div>
        )}

        <div className="text-[10px] text-center text-slate-400 pt-1 border-t border-slate-100 font-medium">
          Click anywhere outside or ✕ to close
        </div>
      </div>
    </div>
  );
};
