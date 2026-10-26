import { useState, useEffect } from "react";
import { PlayerColor } from "../types";

export interface QueuePlayer {
  playerId: string;
  name: string;
}

export interface OnlineManagerCallbacks {
  onGameStarted?: (data: { roomId: string; playerColor: PlayerColor; opponentName: string; boardSetup?: any }) => void;
  onOpponentMoved?: (data: { move: any; nextTurn: PlayerColor }) => void;
  onOpponentLeft?: () => void;
}

export function useOnlineManager(callbacks: OnlineManagerCallbacks) {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [playerId, setPlayerId] = useState<string>("");
  const [defaultName, setDefaultName] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  const [activeQueue, setActiveQueue] = useState<QueuePlayer[]>([]);
  const [isQueued, setIsQueued] = useState<boolean>(false);
  const [onlineColor, setOnlineColor] = useState<PlayerColor>("w");
  const [onlineRoomId, setOnlineRoomId] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string>("");
  const [isRoomOpen, setIsRoomOpen] = useState<boolean>(false);

  // Real-time WebSocket connection to the server
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}`;
    
    let ws: WebSocket;
    let reconnectTimeout: any;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log("WebSocket connection established");
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          switch (data.type) {
            case "init": {
              setPlayerId(data.playerId);
              setDefaultName(data.defaultName);
              setUserName(data.defaultName);
              setActiveQueue(data.activeQueue);
              break;
            }
            case "queue-updated": {
              setActiveQueue(data.activeQueue);
              break;
            }
            case "game-started": {
              setOnlineRoomId(data.roomId);
              setOnlineColor(data.playerColor);
              setOpponentName(data.opponentName);
              setIsQueued(false);
              callbacks.onGameStarted?.(data);
              break;
            }
            case "opponent-moved": {
              callbacks.onOpponentMoved?.(data);
              break;
            }
            case "opponent-left": {
              setOnlineRoomId(null);
              setIsQueued(false);
              callbacks.onOpponentLeft?.();
              break;
            }
          }
        } catch (e) {
          console.error("Error receiving websocket message:", e);
        }
      };
      
      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.warn("Game WebSocket connection error:", err);
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };

      setSocket(ws);
    };

    connect();

    return () => {
      if (ws) {
        ws.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, []);

  const changeUserName = (name: string) => {
    setUserName(name);
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "set-name", name }));
    }
  };

  const toggleQueue = (boardSetup?: Record<string, any>) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    const nextState = !isQueued;
    setIsQueued(nextState);
    if (nextState) {
      socket.send(JSON.stringify({ type: "join-queue", name: userName, boardSetup }));
    } else {
      socket.send(JSON.stringify({ type: "leave-queue" }));
    }
  };

  const challengePlayer = (targetPlayerId: string, boardSetup?: Record<string, any>) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "challenge-player",
        targetPlayerId,
        boardSetup
      }));
    }
  };

  const leaveMatch = () => {
    if (socket && socket.readyState === WebSocket.OPEN && onlineRoomId) {
      socket.send(JSON.stringify({ type: "leave-game", roomId: onlineRoomId }));
      setOnlineRoomId(null);
    }
  };

  const sendOnlineMove = (movePayload: any, nextTurn: PlayerColor) => {
    if (socket && socket.readyState === WebSocket.OPEN && onlineRoomId) {
      socket.send(JSON.stringify({
        type: "make-move",
        roomId: onlineRoomId,
        move: movePayload,
        nextTurn
      }));
    }
  };

  return {
    socket,
    playerId,
    defaultName,
    userName,
    activeQueue,
    isQueued,
    onlineColor,
    onlineRoomId,
    opponentName,
    isRoomOpen,
    setIsRoomOpen,
    changeUserName,
    toggleQueue,
    challengePlayer,
    leaveMatch,
    sendOnlineMove,
    setOnlineRoomId,
    setIsQueued,
  };
}
