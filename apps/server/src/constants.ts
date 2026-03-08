/** Map bounds — must match client PLAYER clamp values */
export const MAP_BOUNDS = {
    MIN_X: 10,
    MAX_X: 790,
    MIN_Y: 10,
    MAX_Y: 440,
} as const;

export const GAME_STORE = {
    /** Remove sessions not accessed for this long (ms) */
    TTL_MS: 1000 * 60 * 60 * 24, // 24 h
    /** Max concurrent sessions in memory */
    MAX_SESSIONS: 10_000,
} as const;

export const PLAYER_STORE = {
    /** Remove players not seen for this long (ms) — ghost cleanup */
    TTL_MS: 1000 * 30,
} as const;
