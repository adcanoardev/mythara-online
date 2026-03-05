import { API_URL } from "../constants";
import type { DexPokemon, NewGameResponse } from "../types";

export async function fetchHealth(): Promise<{ service: string }> {
    const res = await fetch(`${API_URL}/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function fetchRandomStarter(): Promise<DexPokemon> {
    const res = await fetch(`${API_URL}/random/starter`);
    if (!res.ok) throw new Error(`Starter error: ${res.status}`);
    return res.json();
}

export async function fetchGame(gameId: string): Promise<{ gameId: string; seed: number; starter: DexPokemon }> {
    const res = await fetch(`${API_URL}/game/${gameId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
}

export async function createNewGame(starterId: number): Promise<NewGameResponse> {
    const res = await fetch(`${API_URL}/game/new`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starterId }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = typeof err?.error === "string" ? err.error : `HTTP ${res.status}`;
        throw new Error(msg);
    }

    return res.json();
}

/**
 * Fetch 3 unique random starters (no repeated IDs).
 */
export async function fetchUniqueStarters(count: number): Promise<DexPokemon[]> {
    const picked = new Set<number>();
    const result: DexPokemon[] = [];

    while (result.length < count) {
        const p = await fetchRandomStarter();
        if (picked.has(p.id)) continue;
        picked.add(p.id);
        result.push(p);
    }

    return result;
}
