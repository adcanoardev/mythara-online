export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export const PLAYER = {
    SIZE: 20,
    SPEED: 200,
    COLOR: 0x00ff00,
} as const;

export const OTHER_PLAYER = {
    SIZE: 18,
    COLOR: 0x00aaff,
} as const;

export const GRASS_ZONE = {
    X: 650,
    Y: 250,
    WIDTH: 220,
    HEIGHT: 220,
    COLOR: 0x00aa00,
    ALPHA: 0.35,
    ENCOUNTER_CHANCE_PER_SECOND: 0.6,
} as const;

export const NETWORK = {
    SEND_INTERVAL_MS: 50,
    MIN_MOVE_DELTA_SQ: 4, // 2px threshold
} as const;

export const POKEMON = {
    MAX_ID: 1025,
    STARTER_COUNT: 3,
} as const;

export const LS_GAME_ID_KEY = "poke-mmo:gameId";
