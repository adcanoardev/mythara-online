import { prisma } from "./prisma.js";
import { addXp } from "./trainerService.js";
import { useNpcToken } from "./tokenService.js";
import { fetchPokemon } from "./pokeapi.js";

// ── Configuración de los 8 gimnasios ──────────────────────────

export const GYMS = [
    {
        id: 0,
        name: "Gimnasio Gris",
        leader: "Brock",
        badge: "Medalla Roca",
        requiredLevel: 10,
        pokemon: [
            { pokedexId: 74, level: 12 },
            { pokedexId: 95, level: 14 },
        ],
        xpReward: 500,
        coinsReward: 300,
    },
    {
        id: 1,
        name: "Gimnasio Celeste",
        leader: "Misty",
        badge: "Medalla Cascada",
        requiredLevel: 15,
        pokemon: [
            { pokedexId: 120, level: 18 },
            { pokedexId: 121, level: 21 },
        ],
        xpReward: 800,
        coinsReward: 500,
    },
    {
        id: 2,
        name: "Gimnasio Carmín",
        leader: "Lt. Surge",
        badge: "Medalla Trueno",
        requiredLevel: 20,
        pokemon: [
            { pokedexId: 100, level: 21 },
            { pokedexId: 25, level: 18 },
            { pokedexId: 26, level: 24 },
        ],
        xpReward: 1200,
        coinsReward: 700,
    },
    {
        id: 3,
        name: "Gimnasio Azafrán",
        leader: "Erika",
        badge: "Medalla Arcoíris",
        requiredLevel: 25,
        pokemon: [
            { pokedexId: 71, level: 29 },
            { pokedexId: 44, level: 24 },
            { pokedexId: 45, level: 29 },
        ],
        xpReward: 1800,
        coinsReward: 1000,
    },
    {
        id: 4,
        name: "Gimnasio Fucsia",
        leader: "Koga",
        badge: "Medalla Alma",
        requiredLevel: 30,
        pokemon: [
            { pokedexId: 109, level: 37 },
            { pokedexId: 89, level: 39 },
            { pokedexId: 49, level: 37 },
        ],
        xpReward: 2500,
        coinsReward: 1400,
    },
    {
        id: 5,
        name: "Gimnasio Plateado",
        leader: "Sabrina",
        badge: "Medalla Marsh",
        requiredLevel: 35,
        pokemon: [
            { pokedexId: 64, level: 38 },
            { pokedexId: 122, level: 37 },
            { pokedexId: 65, level: 43 },
        ],
        xpReward: 3500,
        coinsReward: 2000,
    },
    {
        id: 6,
        name: "Gimnasio Canela",
        leader: "Blaine",
        badge: "Medalla Volcán",
        requiredLevel: 40,
        pokemon: [
            { pokedexId: 58, level: 42 },
            { pokedexId: 77, level: 40 },
            { pokedexId: 59, level: 47 },
        ],
        xpReward: 5000,
        coinsReward: 3000,
    },
    {
        id: 7,
        name: "Gimnasio Viridian",
        leader: "Giovanni",
        badge: "Medalla Tierra",
        requiredLevel: 50,
        pokemon: [
            { pokedexId: 111, level: 45 },
            { pokedexId: 112, level: 55 },
            { pokedexId: 112, level: 60 },
        ],
        xpReward: 8000,
        coinsReward: 5000,
    },
];

// ── Lógica de combate simplificada para gimnasio ──────────────

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function calcStat(base: number, level: number): number {
    return Math.floor((2 * base * level) / 100) + level + 10;
}

interface SimStats {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
    level: number;
}

function simulateGymBattle(
    player: SimStats,
    enemies: SimStats[],
): {
    won: boolean;
    turnsTotal: number;
} {
    let playerHp = player.hp;
    let turnsTotal = 0;

    for (const enemy of enemies) {
        let enemyHp = enemy.hp;
        const playerFirst = player.speed >= enemy.speed;
        let turn = 0;

        while (playerHp > 0 && enemyHp > 0 && turn < 50) {
            turn++;
            turnsTotal++;

            const order = playerFirst ? ["player", "enemy"] : ["enemy", "player"];

            for (const attacker of order) {
                if (playerHp <= 0 || enemyHp <= 0) break;

                const crit = Math.random() < 0.0625 ? 1.5 : 1;
                if (attacker === "player") {
                    const dmg = Math.max(
                        1,
                        Math.floor(((((2 * player.level) / 5 + 2) * player.attack) / enemy.defense / 50 + 2) * crit) +
                            randInt(-2, 2),
                    );
                    enemyHp = Math.max(0, enemyHp - dmg);
                } else {
                    const dmg = Math.max(
                        1,
                        Math.floor(((((2 * enemy.level) / 5 + 2) * enemy.attack) / player.defense / 50 + 2) * crit) +
                            randInt(-2, 2),
                    );
                    playerHp = Math.max(0, playerHp - dmg);
                }
            }
        }

        if (playerHp <= 0) {
            return { won: false, turnsTotal };
        }
        // Recupera 30% HP entre combates del mismo gimnasio
        playerHp = Math.min(player.hp, playerHp + Math.floor(player.hp * 0.3));
    }

    return { won: playerHp > 0, turnsTotal };
}

// ── Función principal ─────────────────────────────────────────

export async function challengeGym(userId: string, gymId: number) {
    const gym = GYMS[gymId];
    if (!gym) return { error: "Invalid gym ID" };

    // 1. Verificar ficha NPC
    const hasToken = await useNpcToken(userId);
    if (!hasToken) return { error: "No NPC tokens available" };

    // 2. Obtener perfil del entrenador
    const trainer = await prisma.trainerProfile.findUniqueOrThrow({ where: { userId } });

    // 3. Verificar nivel mínimo
    if (trainer.level < gym.requiredLevel) {
        return {
            error: `Nivel insuficiente. Necesitas nivel ${gym.requiredLevel} (tienes ${trainer.level})`,
        };
    }

    // 4. Verificar que no tiene ya la medalla
    if (trainer.medals.includes(gymId)) {
        return { error: "Ya tienes esta medalla" };
    }

    // 5. Verificar orden (no puedes saltar gimnasios)
    if (gymId > 0 && !trainer.medals.includes(gymId - 1)) {
        return { error: `Debes conseguir la medalla ${GYMS[gymId - 1].name} primero` };
    }

    // 6. Obtener Pokémon del jugador
    const playerPokemon = await prisma.pokemonInstance.findFirst({
        where: { userId, isInParty: true },
        orderBy: { slot: "asc" },
    });
    if (!playerPokemon) return { error: "No Pokémon in party" };

    // 7. Construir stats del jugador
    const playerStats: SimStats = {
        hp: playerPokemon.maxHp,
        attack: playerPokemon.attack,
        defense: playerPokemon.defense,
        speed: playerPokemon.speed,
        level: playerPokemon.level,
    };

    // 8. Construir stats de los Pokémon del gimnasio
    const BASE = { hp: 50, attack: 55, defense: 50, speed: 45 };
    const enemyStats: SimStats[] = gym.pokemon.map((p) => ({
        hp: calcStat(BASE.hp, p.level),
        attack: calcStat(BASE.attack, p.level),
        defense: calcStat(BASE.defense, p.level),
        speed: calcStat(BASE.speed, p.level),
        level: p.level,
    }));

    // 9. Simular combate
    const { won, turnsTotal } = simulateGymBattle(playerStats, enemyStats);

    // 10. Si ganó, dar medalla + XP + monedas
    let updatedTrainer = trainer;
    if (won) {
        const newMedals = [...trainer.medals, gymId];
        await Promise.all([
            prisma.trainerProfile.update({
                where: { userId },
                data: {
                    medals: newMedals,
                    coins: { increment: gym.coinsReward },
                },
            }),
            addXp(userId, gym.xpReward),
        ]);
        updatedTrainer = await prisma.trainerProfile.findUniqueOrThrow({ where: { userId } });
    }

    // 11. Guardar BattleLog
    await prisma.battleLog.create({
        data: {
            userId,
            type: "NPC",
            result: won ? "WIN" : "LOSE",
            xpGained: won ? gym.xpReward : Math.floor(gym.xpReward * 0.1),
            coinsGained: won ? gym.coinsReward : 0,
            playerPokemonId: playerPokemon.pokedexId,
            playerPokemonLvl: playerPokemon.level,
            enemyPokemonId: gym.pokemon[0].pokedexId,
            enemyPokemonLvl: gym.pokemon[gym.pokemon.length - 1].level,
        },
    });

    return {
        result: won ? "WIN" : "LOSE",
        gym: {
            id: gym.id,
            name: gym.name,
            leader: gym.leader,
            badge: gym.badge,
        },
        xpGained: won ? gym.xpReward : Math.floor(gym.xpReward * 0.1),
        coinsGained: won ? gym.coinsReward : 0,
        turnsTotal,
        medals: updatedTrainer.medals,
        trainerLevel: updatedTrainer.level,
        badgeEarned: won,
    };
}

export async function getGymsStatus(userId: string) {
    const trainer = await prisma.trainerProfile.findUniqueOrThrow({ where: { userId } });

    return GYMS.map((gym) => ({
        id: gym.id,
        name: gym.name,
        leader: gym.leader,
        badge: gym.badge,
        requiredLevel: gym.requiredLevel,
        earned: trainer.medals.includes(gym.id),
        unlocked: trainer.level >= gym.requiredLevel && (gym.id === 0 || trainer.medals.includes(gym.id - 1)),
    }));
}
