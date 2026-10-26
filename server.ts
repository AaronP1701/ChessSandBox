import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // Real-time matchmaking and gameplay state
  let nextUserNumber = 1;
  const clients = new Map<string, {
    socket: WebSocket;
    playerId: string;
    defaultName: string;
    currentName: string;
    isQueued: boolean;
    activeRoomId?: string;
    boardSetup?: any;
  }>();

  const activeGames = new Map<string, {
    roomId: string;
    playerWId: string;
    playerBId: string;
    boardSetup?: any;
  }>();

  const wss = new WebSocketServer({ noServer: true });

  const getActiveQueue = () => {
    const queueList: any[] = [];
    clients.forEach((client) => {
      if (client.isQueued) {
        queueList.push({
          playerId: client.playerId,
          name: client.currentName || client.defaultName,
        });
      }
    });
    return queueList;
  };

  wss.on("connection", (socket: WebSocket) => {
    const playerId = Math.random().toString(36).substring(2, 9);
    const defaultName = `user ${nextUserNumber++}`;
    
    clients.set(playerId, {
      socket,
      playerId,
      defaultName,
      currentName: defaultName,
      isQueued: false,
    });

    // Send initial configuration
    socket.send(JSON.stringify({
      type: "init",
      playerId,
      defaultName,
      activeQueue: getActiveQueue(),
    }));

    socket.on("message", (rawMessage: string) => {
      try {
        const data = JSON.parse(rawMessage.toString());
        const client = clients.get(playerId);
        if (!client) return;

        switch (data.type) {
          case "set-name": {
            client.currentName = data.name.trim() || client.defaultName;
            // If they are queued, update everyone
            if (client.isQueued) {
              const queueUpdate = JSON.stringify({ type: "queue-updated", activeQueue: getActiveQueue() });
              clients.forEach((c) => c.socket.send(queueUpdate));
            }
            break;
          }
          case "join-queue": {
            client.isQueued = true;
            if (data.name) {
              client.currentName = data.name.trim();
            }
            if (data.boardSetup) {
              client.boardSetup = data.boardSetup;
            }
            const queueUpdate = JSON.stringify({ type: "queue-updated", activeQueue: getActiveQueue() });
            clients.forEach((c) => c.socket.send(queueUpdate));
            break;
          }
          case "leave-queue": {
            client.isQueued = false;
            const queueUpdate = JSON.stringify({ type: "queue-updated", activeQueue: getActiveQueue() });
            clients.forEach((c) => c.socket.send(queueUpdate));
            break;
          }
          case "challenge-player": {
            const targetId = data.targetPlayerId;
            const targetClient = clients.get(targetId);
            if (targetClient && targetClient.isQueued) {
              // Create room
              const roomId = `room-${Math.random().toString(36).substring(2, 9)}`;
              
              // Remove both from queue
              client.isQueued = false;
              targetClient.isQueued = false;

              client.activeRoomId = roomId;
              targetClient.activeRoomId = roomId;

              // Use the challenged user's (targetClient) saved board setup, or challenger's fallback
              const savedBoardSetup = targetClient.boardSetup || data.boardSetup || client.boardSetup || null;

              activeGames.set(roomId, {
                roomId,
                playerWId: playerId, // challenger is White
                playerBId: targetId,  // challenged is Black
                boardSetup: savedBoardSetup,
              });

              // Notify active queue update
              const queueUpdate = JSON.stringify({ type: "queue-updated", activeQueue: getActiveQueue() });
              clients.forEach((c) => c.socket.send(queueUpdate));

              // Start game for Challenger (White)
              client.socket.send(JSON.stringify({
                type: "game-started",
                roomId,
                playerColor: "w",
                opponentName: targetClient.currentName || targetClient.defaultName,
                boardSetup: savedBoardSetup,
              }));

              // Start game for Challenged (Black)
              targetClient.socket.send(JSON.stringify({
                type: "game-started",
                roomId,
                playerColor: "b",
                opponentName: client.currentName || client.defaultName,
                boardSetup: savedBoardSetup,
              }));
            }
            break;
          }
          case "make-move": {
            const { roomId, move, nextTurn } = data;
            const game = activeGames.get(roomId);
            if (game) {
              const opponentId = game.playerWId === playerId ? game.playerBId : game.playerWId;
              const opponent = clients.get(opponentId);
              if (opponent) {
                opponent.socket.send(JSON.stringify({
                  type: "opponent-moved",
                  move,
                  nextTurn,
                }));
              }
            }
            break;
          }
          case "reset-game": {
            const { roomId } = data;
            const game = activeGames.get(roomId);
            if (game) {
              const opponentId = game.playerWId === playerId ? game.playerBId : game.playerWId;
              const opponent = clients.get(opponentId);
              if (opponent) {
                opponent.socket.send(JSON.stringify({
                  type: "game-reset",
                }));
              }
            }
            break;
          }
          case "leave-game": {
            const { roomId } = data;
            const game = activeGames.get(roomId);
            if (game) {
              const opponentId = game.playerWId === playerId ? game.playerBId : game.playerWId;
              const opponent = clients.get(opponentId);
              if (opponent) {
                opponent.socket.send(JSON.stringify({
                  type: "opponent-left",
                }));
                delete opponent.activeRoomId;
              }
              delete client.activeRoomId;
              activeGames.delete(roomId);
            }
            break;
          }
        }
      } catch (err) {
        console.error("Error processing websocket message:", err);
      }
    });

    socket.on("close", () => {
      const client = clients.get(playerId);
      if (client) {
        // If they were in an active game, notify opponent
        if (client.activeRoomId) {
          const game = activeGames.get(client.activeRoomId);
          if (game) {
            const opponentId = game.playerWId === playerId ? game.playerBId : game.playerWId;
            const opponent = clients.get(opponentId);
            if (opponent) {
              opponent.socket.send(JSON.stringify({
                type: "opponent-left",
              }));
              delete opponent.activeRoomId;
            }
            activeGames.delete(client.activeRoomId);
          }
        }

        clients.delete(playerId);
        
        // Notify others if the queue changed
        if (client.isQueued) {
          const queueUpdate = JSON.stringify({ type: "queue-updated", activeQueue: getActiveQueue() });
          clients.forEach((c) => c.socket.send(queueUpdate));
        }
      }
    });
  });

  server.on("upgrade", (request, socket, head) => {
    // If it's a Vite HMR websocket request, bypass custom game WSS
    const isViteHmr =
      request.headers["sec-websocket-protocol"] === "vite-hmr" ||
      request.url?.includes("vite") ||
      request.url?.startsWith("/@");

    if (isViteHmr) {
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  // Serve API or static assets
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
