// ─────────────────────────────────────────────────────────────
// packages/shared/types.ts
// Shared between client (Phaser) and server (Express + Socket.IO)
// ─────────────────────────────────────────────────────────────

// ── Pokémon ───────────────────────────────────────────────────

export type DexPokemon = {
    id: number;
    name: string;
    types: string[];
    sprite: string | null;
};

// ── Game ──────────────────────────────────────────────────────

export type GameSession = {
    gameId: string;
    seed: number;
    starter: DexPokemon;
};

// ── Multiplayer ───────────────────────────────────────────────

export type PlayerState = {
    id: string;
    x: number;
    y: number;
};

// ── Socket events ─────────────────────────────────────────────
// Documenta todos los eventos WS en un solo lugar.

export type ServerToClientEvents = {
    "players:init":   (players: PlayerState[]) => void;
    "players:join":   (player: PlayerState) => void;
    "players:update": (player: PlayerState) => void;
    "players:leave":  (payload: { id: string }) => void;
};

export type ClientToServerEvents = {
    "player:move": (pos: { x: number; y: number; timestamp?: number }) => void;
    "player:stop": (pos: { x: number; y: number }) => void;
};
