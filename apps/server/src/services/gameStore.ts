// ─────────────────────────────────────────────────────────────
// apps/server/src/services/gameStore.ts
// In-memory game sessions with TTL eviction and size cap.
// Replace the Map internals with Redis/Postgres later without
// changing any route code.
// ─────────────────────────────────────────────────────────────

import { GAME_STORE } from "../constants.js";

type GameRecord = {
    gameId: string;
    seed: number;
    starterId: number;
    createdAt: number;
    lastAccessedAt: number;
};

const store = new Map<string, GameRecord>();

// ── Helpers ───────────────────────────────────────────────────

function makeId(len = 18): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/** Evict expired sessions. Call periodically or on write. */
function evict(): void {
    const now = Date.now();
    for (const [id, g] of store) {
        if (now - g.lastAccessedAt > GAME_STORE.TTL_MS) {
            store.delete(id);
        }
    }
}

// ── Public API ────────────────────────────────────────────────

export function createGame(starterId: number): GameRecord {
    evict();

    if (store.size >= GAME_STORE.MAX_SESSIONS) {
        // Evict oldest entry
        const oldest = [...store.values()].sort((a, b) => a.lastAccessedAt - b.lastAccessedAt)[0];
        store.delete(oldest.gameId);
    }

    const record: GameRecord = {
        gameId: makeId(),
        seed: Math.floor(Math.random() * 2 ** 31),
        starterId,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
    };

    store.set(record.gameId, record);
    return record;
}

export function getGame(gameId: string): GameRecord | undefined {
    const g = store.get(gameId);
    if (!g) return undefined;

    // Refresh TTL on access
    g.lastAccessedAt = Date.now();
    return g;
}
