// ─────────────────────────────────────────────────────────────
// apps/server/src/socket.ts
// All Socket.IO logic in one place, typed via shared events.
// ─────────────────────────────────────────────────────────────

import type { Server } from "socket.io";
import type { ServerToClientEvents, ClientToServerEvents } from "../../../packages/shared/types.js";
import { addPlayer, movePlayer, removePlayer, getAllPlayers, evictStale } from "./services/playerStore.js";
import { PlayerMovePayload, PlayerStopPayload, validate } from "./validators/game.validators.js";
import { PLAYER_STORE } from "./constants.js";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(io: TypedServer): void {
    // Periodic ghost cleanup (every TTL interval)
    setInterval(evictStale, PLAYER_STORE.TTL_MS);

    io.on("connection", (socket) => {
        const player = addPlayer(socket.id);

        // Send existing players to the newcomer
        socket.emit("players:init", getAllPlayers());

        // Broadcast new player to everyone else
        socket.broadcast.emit("players:join", player);

        // ── player:move ───────────────────────────────────────
        socket.on("player:move", (raw) => {
            try {
                const { x, y } = validate(PlayerMovePayload, raw);
                const updated = movePlayer(socket.id, x, y);
                if (!updated) return;
                socket.broadcast.emit("players:update", { id: socket.id, x: updated.x, y: updated.y });
            } catch {
                // Invalid payload — silently ignore (don't crash or respond)
            }
        });

        // ── player:stop ───────────────────────────────────────
        socket.on("player:stop", (raw) => {
            try {
                const { x, y } = validate(PlayerStopPayload, raw);
                const updated = movePlayer(socket.id, x, y);
                if (!updated) return;
                // Broadcast final position so other clients snap cleanly
                socket.broadcast.emit("players:update", { id: socket.id, x: updated.x, y: updated.y });
            } catch {
                // Invalid payload — silently ignore
            }
        });

        // ── disconnect ────────────────────────────────────────
        socket.on("disconnect", () => {
            removePlayer(socket.id);
            socket.broadcast.emit("players:leave", { id: socket.id });
        });
    });
}
