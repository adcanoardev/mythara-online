import { prisma } from "./prisma.js";
import { usePvpToken } from "./tokenService.js";
import { addPrestige } from "./trainerService.js";

const PRESTIGE_WIN = 5;
const PRESTIGE_LOSE = -5;

// Reutilizamos la misma lógica de simulación que en battleService
// pero adaptada para PvP (dos jugadores reales)

interface CombatantStats {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    level: number;
    userId: string;
    pokemonId: string;
    pokedexId: number;
}

interface TurnLog {
    turn: number;
    attacker: "challenger" | "defender";
    damage: number;
    critical: boolean;
    challengerHpAfter: number;
    defenderHpAfter: number;
}

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function simulatePvp(
    challenger: CombatantStats,
    defender: CombatantStats,
): {
    winner: "challenger" | "defender";
    turns: TurnLog[];
} {
    let challengerHp = challenger.hp;
    let defenderHp = defender.hp;
    const turns: TurnLog[] = [];
    let turn = 0;

    const challengerFirst = challenger.speed >= defender.speed;

    while (challengerHp > 0 && defenderHp > 0 && turn < 50) {
        turn++;
        const order: ("challenger" | "defender")[] = challengerFirst
            ? ["challenger", "defender"]
            : ["defender", "challenger"];

        for (const attacker of order) {
            if (challengerHp <= 0 || defenderHp <= 0) break;

            const isCritical = Math.random() < 0.0625;
            const multiplier = isCritical ? 1.5 : 1;

            if (attacker === "challenger") {
                const dmg = Math.max(
                    1,
                    Math.floor(
                        ((((2 * challenger.level) / 5 + 2) * challenger.attack) / defender.defense / 50 + 2) *
                            multiplier,
                    ) + randInt(-2, 2),
                );
                defenderHp = Math.max(0, defenderHp - dmg);
                turns.push({
                    turn,
                    attacker,
                    damage: dmg,
                    critical: isCritical,
                    challengerHpAfter: challengerHp,
                    defenderHpAfter: defenderHp,
                });
            } else {
                const dmg = Math.max(
                    1,
                    Math.floor(
                        ((((2 * defender.level) / 5 + 2) * defender.attack) / challenger.defense / 50 + 2) * multiplier,
                    ) + randInt(-2, 2),
                );
                challengerHp = Math.max(0, challengerHp - dmg);
                turns.push({
                    turn,
                    attacker,
                    damage: dmg,
                    critical: isCritical,
                    challengerHpAfter: challengerHp,
                    defenderHpAfter: defenderHp,
                });
            }
        }
    }

    return {
        winner: challengerHp > 0 ? "challenger" : "defender",
        turns,
    };
}

export async function runPvpBattle(challengerUserId: string, defenderUserId: string) {
    // 1. Verificar que no se reta a sí mismo
    if (challengerUserId === defenderUserId) {
        return { error: "Cannot challenge yourself" };
    }

    // 2. Verificar token PvP del retador
    const hasToken = await usePvpToken(challengerUserId);
    if (!hasToken) {
        return { error: "No PvP tokens available" };
    }

    // 3. Obtener Pokémon del retador (primero del equipo)
    const challengerPokemon = await prisma.pokemonInstance.findFirst({
        where: { userId: challengerUserId, isInParty: true },
        orderBy: { slot: "asc" },
    });
    if (!challengerPokemon) {
        return { error: "Challenger has no Pokémon in party" };
    }

    // 4. Obtener Pokémon del defensor (primero del equipo)
    const defenderPokemon = await prisma.pokemonInstance.findFirst({
        where: { userId: defenderUserId, isInParty: true },
        orderBy: { slot: "asc" },
    });
    if (!defenderPokemon) {
        return { error: "Defender has no Pokémon in party" };
    }

    // 5. Obtener perfiles de prestigio
    const [challengerTrainer, defenderTrainer] = await Promise.all([
        prisma.trainerProfile.findUniqueOrThrow({ where: { userId: challengerUserId } }),
        prisma.trainerProfile.findUniqueOrThrow({ where: { userId: defenderUserId } }),
    ]);

    // 6. Construir stats
    const challengerStats: CombatantStats = {
        hp: challengerPokemon.hp,
        attack: challengerPokemon.attack,
        defense: challengerPokemon.defense,
        speed: challengerPokemon.speed,
        level: challengerPokemon.level,
        userId: challengerUserId,
        pokemonId: challengerPokemon.id,
        pokedexId: challengerPokemon.pokedexId,
    };

    const defenderStats: CombatantStats = {
        hp: defenderPokemon.hp,
        attack: defenderPokemon.attack,
        defense: defenderPokemon.defense,
        speed: defenderPokemon.speed,
        level: defenderPokemon.level,
        userId: defenderUserId,
        pokemonId: defenderPokemon.id,
        pokedexId: defenderPokemon.pokedexId,
    };

    // 7. Simular combate
    const { winner, turns } = simulatePvp(challengerStats, defenderStats);
    const challengerWon = winner === "challenger";

    // 8. Actualizar prestigio de ambos
    await Promise.all([
        addPrestige(challengerUserId, challengerWon ? PRESTIGE_WIN : PRESTIGE_LOSE),
        addPrestige(defenderUserId, challengerWon ? PRESTIGE_LOSE : PRESTIGE_WIN),
    ]);

    // 9. Guardar BattleLog para ambos
    await prisma.battleLog.createMany({
        data: [
            {
                userId: challengerUserId,
                type: "PVP",
                result: challengerWon ? "WIN" : "LOSE",
                xpGained: 0, // PvP nunca da XP
                coinsGained: challengerWon ? 150 : 0,
                playerPokemonId: challengerPokemon.pokedexId,
                playerPokemonLvl: challengerPokemon.level,
                enemyPokemonId: defenderPokemon.pokedexId,
                enemyPokemonLvl: defenderPokemon.level,
            },
            {
                userId: defenderUserId,
                type: "PVP",
                result: challengerWon ? "LOSE" : "WIN",
                xpGained: 0,
                coinsGained: challengerWon ? 0 : 150,
                playerPokemonId: defenderPokemon.pokedexId,
                playerPokemonLvl: defenderPokemon.level,
                enemyPokemonId: challengerPokemon.pokedexId,
                enemyPokemonLvl: challengerPokemon.level,
            },
        ],
    });

    // 10. Refrescar perfiles actualizados
    const [updatedChallenger, updatedDefender] = await Promise.all([
        prisma.trainerProfile.findUniqueOrThrow({ where: { userId: challengerUserId } }),
        prisma.trainerProfile.findUniqueOrThrow({ where: { userId: defenderUserId } }),
    ]);

    return {
        result: challengerWon ? "WIN" : "LOSE",
        winner: challengerWon ? challengerUserId : defenderUserId,
        turns,
        challenger: {
            userId: challengerUserId,
            pokedexId: challengerPokemon.pokedexId,
            level: challengerPokemon.level,
            prestigeBefore: challengerTrainer.prestige,
            prestigeAfter: updatedChallenger.prestige,
            prestigeDelta: challengerWon ? +PRESTIGE_WIN : PRESTIGE_LOSE,
            coinsGained: challengerWon ? 150 : 0,
        },
        defender: {
            userId: defenderUserId,
            pokedexId: defenderPokemon.pokedexId,
            level: defenderPokemon.level,
            prestigeBefore: defenderTrainer.prestige,
            prestigeAfter: updatedDefender.prestige,
            prestigeDelta: challengerWon ? PRESTIGE_LOSE : +PRESTIGE_WIN,
            coinsGained: challengerWon ? 0 : 150,
        },
    };
}
