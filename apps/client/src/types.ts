export type DexPokemon = {
    id: number;
    name: string;
    types: string[];
    sprite: string | null;
};

export type NewGameResponse = {
    gameId: string;
    seed: number;
    starter: DexPokemon;
};

export type PlayerState = {
    id: string;
    x: number;
    y: number;
};
