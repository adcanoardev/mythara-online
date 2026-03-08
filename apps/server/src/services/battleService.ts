// ─────────────────────────────────────────────────────────────
// apps/server/src/services/battleService.ts
// Combate NPC por turnos con moves — MVP
// ─────────────────────────────────────────────────────────────
import { prisma } from "./prisma.js";
import { useNpcToken } from "./tokenService.js";
import { addXp } from "./trainerService.js";
import { addItem, hasItem, removeItem } from "./inventoryService.js";
import { getCreature, getAllCreatures } from "./creatureService.js";
import type { Move } from "./creatureService.js";
import type { ItemType } from "@prisma/client";
import { checkLevelEvolution } from "./evolutionService.js";
import {
    createBattleSession,
    getSession,
    getUserSession,
    deleteSession,
    type BattleSession,
    type BattleCombatant,
} from "./battleStore.js";

// ── Encounter pool por nivel ──────────────────────────────────

function getEncounterPool(trainerLevel: number): string[] {
    const all = getAllCreatures();
    if (trainerLevel <= 10) return all.filter((c) => c.rarity === "COMMON").map((c) => c.id);
    if (trainerLevel <= 25) return all.filter((c) => ["COMMON", "RARE"].includes(c.rarity)).map((c) => c.id);
    if (trainerLevel <= 50) return all.filter((c) => ["COMMON", "RARE", "ELITE"].includes(c.rarity)).map((c) => c.id);
    return all.map((c) => c.id);
}

function getEncounterLevelRange(trainerLevel: number): { min: number; max: number } {
    if (trainerLevel <= 10) return { min: 2, max: 12 };
    if (trainerLevel <= 25) return { min: 8, max: 25 };
    if (trainerLevel <= 50) return { min: 20, max: 45 };
    if (trainerLevel <= 75) return { min: 35, max: 65 };
    return { min: 50, max: 90 };
}

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randPick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

// ── Stats escalados por nivel ─────────────────────────────────

function calcStat(base: number, level: number): number {
    return Math.floor((2 * base * level) / 100) + level + 10;
}

function calcHp(base: number, level: number): number {
    return Math.floor((2 * base * level) / 100) + level + 10;
}

// ── Fórmula de daño con moves y STAB ─────────────────────────

// Wrapper tipado
function calcDamageResult(
    attackerLevel: number,
    attackStat: number,
    defenseStat: number,
    move: Move,
    attackerAffinities: string[],
): { damage: number; critical: boolean } {
    const stab = attackerAffinities.includes(move.affinity) ? 1.5 : 1;
    const isCritical = Math.random() < 0.0625;
    const critical = isCritical ? 1.5 : 1;
    const hit = Math.random() < move.accuracy;
    if (!hit) return { damage: 0, critical: false };

    const base = Math.floor((((2 * attackerLevel) / 5 + 2) * move.power * (attackStat / defenseStat)) / 50 + 2);
    return {
        damage: Math.max(1, Math.floor(base * stab * critical) + randInt(-2, 2)),
        critical: isCritical,
    };
}

// ── Captura ───────────────────────────────────────────────────

const CATCH_RATES: Record<string, number> = {
    FRAGMENT: 0.3,
    SHARD: 0.55,
    CRYSTAL: 0.8,
    RUNE: 1.0,
};
const BALL_PRIORITY: ItemType[] = ["RUNE", "CRYSTAL", "SHARD", "FRAGMENT"];

async function attemptCapture(userId: string, enemyHpPercent: number, speciesCatchRate: number) {
    let ballUsed: ItemType | null = null;
    for (const ball of BALL_PRIORITY) {
        if (await hasItem(userId, ball)) {
            ballUsed = ball;
            break;
        }
    }
    if (!ballUsed) return { caught: false, ballUsed: null };

    const ballRate = CATCH_RATES[ballUsed];
    const hpBonus = (1 - enemyHpPercent) * 0.3;
    const caught = Math.random() < (ballRate + hpBonus) * speciesCatchRate * 2;

    if (caught) await removeItem(userId, ballUsed, 1);
    return { caught, ballUsed };
}

// ── XP y monedas ─────────────────────────────────────────────

function calcXpGained(enemyLevel: number, won: boolean): number {
    const base = Math.floor(enemyLevel * 1.5);
    return won ? base : Math.floor(base * 0.2);
}

function calcCoinsGained(enemyLevel: number, won: boolean): number {
    if (!won) return 0;
    return randInt(enemyLevel * 2, enemyLevel * 5);
}

// ── START — Iniciar combate NPC ───────────────────────────────

export async function startNpcBattle(userId: string) {
    // Verificar que no hay combate activo
    const existing = getUserSession(userId);
    if (existing) return { error: "Ya tienes un combate activo" };

    const hasToken = await useNpcToken(userId);
    if (!hasToken) return { error: "No tienes fichas de combate NPC" };

    const trainer = await prisma.trainerProfile.findUniqueOrThrow({ where: { userId } });

    const playerMyth = await prisma.creatureInstance.findFirst({
        where: { userId, isInParty: true },
        orderBy: { slot: "asc" },
    });
    if (!playerMyth) return { error: "No tienes ningún Myth en el equipo" };

    const playerSpecies = getCreature(playerMyth.speciesId);

    // Generar enemigo
    const pool = getEncounterPool(trainer.level);
    const enemySpecies = getCreature(randPick(pool));
    const { min, max } = getEncounterLevelRange(trainer.level);
    const enemyLevel = randInt(min, max);

    const player: BattleCombatant = {
        speciesId: playerMyth.speciesId,
        name: playerSpecies.name,
        level: playerMyth.level,
        hp: playerMyth.hp,
        maxHp: playerMyth.maxHp,
        attack: playerMyth.attack,
        defense: playerMyth.defense,
        speed: playerMyth.speed,
        moves: playerSpecies.moves,
        art: playerSpecies.art,
        affinities: playerSpecies.affinities,
    };

    const enemy: BattleCombatant = {
        speciesId: enemySpecies.id,
        name: enemySpecies.name,
        level: enemyLevel,
        hp: calcHp(enemySpecies.baseStats.hp, enemyLevel),
        maxHp: calcHp(enemySpecies.baseStats.hp, enemyLevel),
        attack: calcStat(enemySpecies.baseStats.atk, enemyLevel),
        defense: calcStat(enemySpecies.baseStats.def, enemyLevel),
        speed: calcStat(enemySpecies.baseStats.spd, enemyLevel),
        moves: enemySpecies.moves,
        art: enemySpecies.art,
        affinities: enemySpecies.affinities,
    };

    const session = createBattleSession({
        userId,
        player,
        enemy,
        playerInstanceId: playerMyth.id,
        turn: 0,
        status: "active",
        log: [],
    });

    return {
        battleId: session.battleId,
        player: {
            speciesId: player.speciesId,
            name: player.name,
            level: player.level,
            hp: player.hp,
            maxHp: player.maxHp,
            art: player.art,
            affinities: player.affinities,
            moves: player.moves,
        },
        enemy: {
            speciesId: enemy.speciesId,
            name: enemy.name,
            level: enemy.level,
            hp: enemy.hp,
            maxHp: enemy.maxHp,
            art: enemy.art,
            affinities: enemy.affinities,
        },
        playerFirst: player.speed >= enemy.speed,
    };
}

// ── TURN — Ejecutar un turno ──────────────────────────────────

export async function executeTurn(userId: string, battleId: string, moveId: string) {
    const session = getSession(battleId);
    if (!session) return { error: "Combate no encontrado" };
    if (session.userId !== userId) return { error: "No autorizado" };
    if (session.status !== "active") return { error: "El combate ya ha terminado" };

    // Validar move del jugador
    const playerMove = session.player.moves.find((m) => m.id === moveId);
    if (!playerMove) return { error: "Move no válido" };

    // Move del enemigo — aleatorio
    const enemyMove = randPick(session.enemy.moves);

    let playerHp = session.player.hp;
    let enemyHp = session.enemy.hp;
    session.turn++;

    // Orden por velocidad
    const playerFirst = session.player.speed >= session.enemy.speed;

    let playerDamage = 0;
    let enemyDamage = 0;
    let playerCritical = false;
    let enemyCritical = false;

    const first = playerFirst ? "player" : "enemy";
    const second = playerFirst ? "enemy" : "player";

    for (const attacker of [first, second]) {
        if (playerHp <= 0 || enemyHp <= 0) break;

        if (attacker === "player") {
            const result = calcDamageResult(
                session.player.level,
                session.player.attack,
                session.enemy.defense,
                playerMove,
                session.player.affinities,
            );
            playerDamage = result.damage;
            playerCritical = result.critical;
            enemyHp = Math.max(0, enemyHp - playerDamage);
        } else {
            const result = calcDamageResult(
                session.enemy.level,
                session.enemy.attack,
                session.player.defense,
                enemyMove,
                session.enemy.affinities,
            );
            enemyDamage = result.damage;
            enemyCritical = result.critical;
            playerHp = Math.max(0, playerHp - enemyDamage);
        }
    }

    // Actualizar HP en sesión
    session.player.hp = playerHp;
    session.enemy.hp = enemyHp;

    const turnResult = {
        turn: session.turn,
        playerMove: playerMove.id,
        playerMoveName: playerMove.name,
        enemyMove: enemyMove.id,
        enemyMoveName: enemyMove.name,
        playerDamage,
        enemyDamage,
        playerCritical,
        enemyCritical,
        playerHpAfter: playerHp,
        enemyHpAfter: enemyHp,
    };
    session.log.push(turnResult);

    // ¿Terminó el combate?
    const battleOver = playerHp <= 0 || enemyHp <= 0;
    if (!battleOver) {
        return { status: "ongoing", turn: turnResult, playerHp, enemyHp };
    }

    const won = enemyHp <= 0;
    session.status = won ? "won" : "lost";

    // XP y monedas
    const xpGained = calcXpGained(session.enemy.level, won);
    const coinsGained = calcCoinsGained(session.enemy.level, won);

    const [updatedTrainer] = await Promise.all([
        addXp(userId, xpGained),
        won && coinsGained > 0
            ? prisma.trainerProfile.update({
                  where: { userId },
                  data: { coins: { increment: coinsGained } },
              })
            : Promise.resolve(),
    ]);

    // Captura
    let captured = null;
    if (won) {
        const enemyHpPercent = session.enemy.hp / session.enemy.maxHp;
        const enemySpecies = getCreature(session.enemy.speciesId);
        const { caught, ballUsed } = await attemptCapture(userId, enemyHpPercent, enemySpecies.catchRate);

        if (caught) {
            await prisma.creatureInstance.create({
                data: {
                    userId,
                    speciesId: session.enemy.speciesId,
                    level: session.enemy.level,
                    xp: 0,
                    hp: session.enemy.maxHp,
                    maxHp: session.enemy.maxHp,
                    attack: session.enemy.attack,
                    defense: session.enemy.defense,
                    speed: session.enemy.speed,
                    isInParty: false,
                },
            });
            captured = {
                speciesId: session.enemy.speciesId,
                name: session.enemy.name,
                level: session.enemy.level,
                art: session.enemy.art,
                ballUsed,
            };
        }
    }

    // BattleLog
    await prisma.battleLog.create({
        data: {
            userId,
            type: "NPC",
            result: won ? "WIN" : "LOSE",
            xpGained,
            coinsGained,
            playerSpeciesId: session.player.speciesId,
            playerLevel: session.player.level,
            enemySpeciesId: session.enemy.speciesId,
            enemyLevel: session.enemy.level,
            capturedSpeciesId: captured?.speciesId ?? null,
        },
    });

    // Evolución
    const evoResult = await checkLevelEvolution(session.playerInstanceId);

    deleteSession(battleId);

    return {
        status: won ? "won" : "lost",
        turn: turnResult,
        playerHp,
        enemyHp,
        result: won ? "WIN" : "LOSE",
        xpGained,
        coinsGained,
        trainerLevel: updatedTrainer.level,
        trainerXp: updatedTrainer.xp,
        captured,
        evolution: evoResult,
    };
}

// ── FLEE — Huir del combate ───────────────────────────────────

export async function fleeBattle(userId: string, battleId: string) {
    const session = getSession(battleId);
    if (!session) return { error: "Combate no encontrado" };
    if (session.userId !== userId) return { error: "No autorizado" };
    if (session.status !== "active") return { error: "El combate ya ha terminado" };

    // XP mínima por huir
    const xpGained = calcXpGained(session.enemy.level, false);
    await addXp(userId, xpGained);

    await prisma.battleLog.create({
        data: {
            userId,
            type: "NPC",
            result: "LOSE",
            xpGained,
            coinsGained: 0,
            playerSpeciesId: session.player.speciesId,
            playerLevel: session.player.level,
            enemySpeciesId: session.enemy.speciesId,
            enemyLevel: session.enemy.level,
        },
    });

    deleteSession(battleId);
    return { status: "fled", xpGained };
}
