// ─────────────────────────────────────────────────────────────
// apps/server/src/services/pokeapi.ts
// Single source of truth for all PokéAPI communication.
// ─────────────────────────────────────────────────────────────

import type { DexPokemon } from "../../../../packages/shared/types.js";
import { POKEAPI_BASE, POKEMON, STARTER_RULES } from "../constants.js";

// ── In-memory caches ──────────────────────────────────────────

const pokemonCache = new Map<number, DexPokemon>();

type SpeciesData = {
    id: number;
    isLegendary: boolean;
    isMythical: boolean;
    evolvesFrom: string | null;
};
const speciesCache = new Map<number, SpeciesData>();

// ── Normalizer ────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizePokemon(raw: any): DexPokemon {
    return {
        id: raw.id as number,
        name: raw.name as string,
        types: ((raw.types ?? []) as any[])
            .map((t: any) => t.type?.name as string)
            .filter(Boolean),
        sprite:
            (raw.sprites?.front_default as string | null) ??
            (raw.sprites?.other?.["official-artwork"]?.front_default as string | null) ??
            null,
    };
}

// ── Public API ────────────────────────────────────────────────

export async function fetchPokemon(id: number): Promise<DexPokemon> {
    if (pokemonCache.has(id)) return pokemonCache.get(id)!;

    const r = await fetch(`${POKEAPI_BASE}/pokemon/${id}`);
    if (!r.ok) throw new Error(`PokéAPI pokemon/${id} → ${r.status}`);

    const data = normalizePokemon(await r.json());
    pokemonCache.set(id, data);
    return data;
}

export async function fetchSpecies(id: number): Promise<SpeciesData> {
    if (speciesCache.has(id)) return speciesCache.get(id)!;

    const r = await fetch(`${POKEAPI_BASE}/pokemon-species/${id}`);
    if (!r.ok) throw new Error(`PokéAPI species/${id} → ${r.status}`);
    const s = await r.json();

    const data: SpeciesData = {
        id: s.id,
        isLegendary: !!s.is_legendary,
        isMythical: !!s.is_mythical,
        evolvesFrom: s.evolves_from_species?.name ?? null,
    };

    speciesCache.set(id, data);
    return data;
}

export async function isEligibleStarter(id: number): Promise<boolean> {
    const sp = await fetchSpecies(id);
    return !sp.isLegendary && !sp.isMythical && sp.evolvesFrom === null;
}

export async function fetchRandomEligibleStarter(): Promise<DexPokemon> {
    for (let i = 0; i < STARTER_RULES.MAX_TRIES; i++) {
        const id = Math.floor(Math.random() * POKEMON.MAX_ID) + 1;
        const eligible = await isEligibleStarter(id).catch(() => false);
        if (!eligible) continue;
        return fetchPokemon(id);
    }
    throw new Error("Could not find eligible starter after max tries");
}
