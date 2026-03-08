// ─────────────────────────────────────────────────────────────
// apps/server/src/services/battleStore.ts
// In-memory NPC battle sessions with TTL eviction.
// ─────────────────────────────────────────────────────────────
import type { Move } from "./creatureService.js";

const TTL_MS = 1000 * 60 * 30; // 30 min sin actividad

export interface BattleCombatant {
    speciesId: string;
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
    moves: Move[];
    art: { portrait: string; front: string; back: string };
    affinities: string[];
}

export interface BattleSession {
    battleId: string;
    userId: string;
    player: BattleCombatant;
    enemy: BattleCombatant;
    playerInstanceId: string;
    turn: number;
    status: "active" | "won" | "lost" | "fled";
    log: TurnResult[];
    createdAt: number;
    lastAccessedAt: number;
}

export interface TurnResult {
    turn: number;
    playerMove: string;
    playerMoveName: string;
    enemyMove: string;
    enemyMoveName: string;
    playerDamage: number;
    enemyDamage: number;
    playerCritical: boolean;
    enemyCritical: boolean;
    playerHpAfter: number;
    enemyHpAfter: number;
}

const store = new Map<string, BattleSession>();

function makeId(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({ length: 18 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function evict(): void {
    const now = Date.now();
    for (const [id, s] of store) {
        if (now - s.lastAccessedAt > TTL_MS) store.delete(id);
    }
}

export function createBattleSession(
    data: Omit<BattleSession, "battleId" | "createdAt" | "lastAccessedAt">,
): BattleSession {
    evict();
    const session: BattleSession = {
        ...data,
        battleId: makeId(),
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
    };
    store.set(session.battleId, session);
    return session;
}

export function getSession(battleId: string): BattleSession | undefined {
    const s = store.get(battleId);
    if (!s) return undefined;
    s.lastAccessedAt = Date.now();
    return s;
}

export function getUserSession(userId: string): BattleSession | undefined {
    for (const s of store.values()) {
        if (s.userId === userId && s.status === "active") return s;
    }
    return undefined;
}

export function deleteSession(battleId: string): void {
    store.delete(battleId);
}
