// ─────────────────────────────────────────────────────────────
// apps/server/src/index.ts
// Entry point: wire together HTTP + Socket.IO and listen.
// This file should stay short — all logic lives in other modules.
// ─────────────────────────────────────────────────────────────

import "dotenv/config";
import http from "http";
import { Server } from "socket.io";
import type { ServerToClientEvents, ClientToServerEvents } from "../../../packages/shared/types.js";
import { createApp } from "./app.js";
import { registerSocketHandlers } from "./socket.js";

const PORT = process.env.PORT || 8080;

const app        = createApp();
const httpServer = http.createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:5173",
        credentials: true,
    },
});

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
    console.log(`🚀 poke-mmo server on http://localhost:${PORT}`);
    console.log(`   CORS origin: ${process.env.CORS_ORIGIN ?? "http://localhost:5173"}`);
});
