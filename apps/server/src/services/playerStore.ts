// ─────────────────────────────────────────────────────────────
// apps/server/src/services/playerStore.ts
// Connected players. Validates bounds so clients can't cheat
// position. TTL cleanup removes ghost players.
// ─────────────────────────────────────────────────────────────

import type { PlayerState } from "../../../../packages/shared/types.js";
import { MAP_BOUNDS, PLAYER_STORE } from "../constants.js";

type PlayerRecord = PlayerState & { lastSeen: number };

const store = new Map<string, PlayerRecord>();

// ── Helpers ───────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
    return Math.min(Math.max(val, min), max);
}

/** Remove players not seen recently (e.g. dirty disconnects). */
export function evictStale(): void {
    const now = Date.now();
    for (const [id, p] of store) {
        if (now - p.lastSeen > PLAYER_STORE.TTL_MS) {
            store.delete(id);
        }
    }
}

// ── Public API ────────────────────────────────────────────────

export function addPlayer(id: string, x = 200, y = 200): PlayerRecord {
    const record: PlayerRecord = {
        id,
        x: clamp(x, MAP_BOUNDS.MIN_X, MAP_BOUNDS.MAX_X),
        y: clamp(y, MAP_BOUNDS.MIN_Y, MAP_BOUNDS.MAX_Y),
        lastSeen: Date.now(),
    };
    store.set(id, record);
    return record;
}

export function movePlayer(id: string, x: number, y: number): PlayerRecord | undefined {
    const p = store.get(id);
    if (!p) return undefined;

    // Server-side clamp — second line of defence after Zod validation
    p.x = clamp(x, MAP_BOUNDS.MIN_X, MAP_BOUNDS.MAX_X);
    p.y = clamp(y, MAP_BOUNDS.MIN_Y, MAP_BOUNDS.MAX_Y);
    p.lastSeen = Date.now();
    return p;
}

export function removePlayer(id: string): void {
    store.delete(id);
}

export function getAllPlayers(): PlayerRecord[] {
    return Array.from(store.values());
}

export function getPlayer(id: string): PlayerRecord | undefined {
    return store.get(id);
}
