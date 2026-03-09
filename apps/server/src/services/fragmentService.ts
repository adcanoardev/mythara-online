// apps/server/src/services/fragmentService.ts
import { prisma } from "./prisma.js";
import { getAllCreatures } from "./creatureService.js";
import type { Rarity } from "./creatureService.js";

// Probabilidades gacha
const RARITY_WEIGHTS: Record<Rarity, number> = {
    COMMON: 92,
    RARE: 8,
    ELITE: 1.95,
    LEGENDARY: 0.05,
    MYTHIC: 0, // reservado
};

function rollRarity(): Rarity {
    const roll = Math.random() * 100;
    let cumulative = 0;
    for (const [rarity, weight] of Object.entries(RARITY_WEIGHTS) as [Rarity, number][]) {
        cumulative += weight;
        if (roll < cumulative) return rarity;
    }
    return "COMMON"; // fallback
}

export async function openFragment(userId: string) {
    // 1. Verificar que el jugador tiene al menos 1 FRAGMENT
    const inventory = await prisma.inventory.findFirst({
        where: { userId, item: "FRAGMENT" },
    });

    if (!inventory || inventory.quantity < 1) {
        throw new Error("No tienes fragmentos disponibles");
    }

    // 2. Roll de rareza
    const rarity = rollRarity();

    // 3. Buscar criaturas de esa rareza
    const allCreatures = getAllCreatures();
    const pool = allCreatures.filter((c) => c.rarity === rarity);

    // Si no hay criaturas de esa rareza (MYTHIC vacío), caer a COMMON
    const finalPool = pool.length > 0 ? pool : allCreatures.filter((c) => c.rarity === "COMMON");
    if (finalPool.length === 0) throw new Error("No hay criaturas disponibles");

    // 4. Elegir criatura aleatoria del pool
    const species = finalPool[Math.floor(Math.random() * finalPool.length)];

    // 5. Calcular stats base (nivel 5 siempre para fragmentos)
    const level = 5;
    const maxHp = Math.floor(species.baseStats.hp * (1 + level * 0.1));
    const attack = Math.floor(species.baseStats.atk * (1 + level * 0.05));
    const defense = Math.floor(species.baseStats.def * (1 + level * 0.05));
    const speed = Math.floor(species.baseStats.spd * (1 + level * 0.05));

    // 6. Transacción: consumir fragmento + crear criatura
    const [, creature] = await prisma.$transaction([
        // Decrementar fragmento (o eliminar si queda en 0)
        inventory.quantity === 1
            ? prisma.inventory.delete({ where: { id: inventory.id } })
            : prisma.inventory.update({
                  where: { id: inventory.id },
                  data: { quantity: { decrement: 1 } },
              }),
        // Crear criatura en almacén
        prisma.creatureInstance.create({
            data: {
                userId,
                speciesId: species.id,
                level,
                xp: 0,
                hp: maxHp,
                maxHp,
                attack,
                defense,
                speed,
                isInParty: false,
                inNursery: false,
            },
        }),
    ]);

    // 7. Devolver resultado con datos enriquecidos de la especie
    return {
        rarity,
        creature: {
            instanceId: creature.id,
            speciesId: species.id,
            name: species.name,
            art: species.art,
            affinities: species.affinities,
            rarity: species.rarity,
            level,
            maxHp,
            attack,
            defense,
            speed,
        },
    };
}
