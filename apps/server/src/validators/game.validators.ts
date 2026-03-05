// ─────────────────────────────────────────────────────────────
// apps/server/src/validators/game.validators.ts
// ─────────────────────────────────────────────────────────────

import { z } from "zod";
import { MAP_BOUNDS, POKEMON } from "../constants.js";

// ── REST ──────────────────────────────────────────────────────

export const PokemonIdParam = z.object({
    id: z.coerce
        .number()
        .int()
        .min(1)
        .max(POKEMON.MAX_ID),
});

export const NewGameBody = z.object({
    starterId: z.number().int().min(1).max(POKEMON.MAX_ID),
});

export const GameIdParam = z.object({
    gameId: z.string().min(1).max(64),
});

// ── WebSocket ─────────────────────────────────────────────────

export const PlayerMovePayload = z.object({
    x: z.number().finite().min(MAP_BOUNDS.MIN_X).max(MAP_BOUNDS.MAX_X),
    y: z.number().finite().min(MAP_BOUNDS.MIN_Y).max(MAP_BOUNDS.MAX_Y),
    timestamp: z.number().optional(),
});

export const PlayerStopPayload = z.object({
    x: z.number().finite().min(MAP_BOUNDS.MIN_X).max(MAP_BOUNDS.MAX_X),
    y: z.number().finite().min(MAP_BOUNDS.MIN_Y).max(MAP_BOUNDS.MAX_Y),
});

// ── Helper ────────────────────────────────────────────────────

/** Parse and return data, or throw with a clean message */
export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
    const result = schema.safeParse(data);
    if (!result.success) {
        const msg = result.error.issues.map((i) => i.message).join(", ");
        throw new Error(msg);
    }
    return result.data;
}
