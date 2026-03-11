// apps/server/src/services/structureProgression.ts
//
// Lógica compartida de progresión de estructuras:
//   - XP necesaria por nivel
//   - Materiales requeridos para subir de nivel
//   - Función de upgrade genérica

import { prisma } from "./prisma.js";
import { addItem, removeItem } from "./inventoryService.js";
import type { ItemType, StructureType } from "@prisma/client";

// ─── XP necesaria para pasar del nivel N al N+1 ───────────────────────────────
// Nv1→2: 500  |  Nv2→3: 1500  |  Nv3→4: 4000  |  Nv4→5: 10000  ...
export function xpToNextLevel(currentLevel: number): number {
    return Math.floor(500 * Math.pow(3, currentLevel - 1));
}

// ─── Material requerido para subir cada estructura ────────────────────────────
// Mina       → ROCK_FRAGMENT  (se produce en la propia mina)
// Lab        → BLUE_DIAMOND   (se produce en la mina)
// Forja      → ARCANE_GEAR    (se produce en el lab)
// Guardería  → FLAME_CORE     (se produce en la forja)

export const UPGRADE_MATERIAL: Record<StructureType, ItemType> = {
    MINE:           "ROCK_FRAGMENT",
    LAB:            "BLUE_DIAMOND",
    FRAGMENT_FORGE: "ARCANE_GEAR",
    NURSERY:        "FLAME_CORE",
};

// Cantidad de material que cuesta cada nivel (escala con el nivel actual)
// Nv1→2: 3  |  Nv2→3: 8  |  Nv3→4: 20  |  Nv4→5: 50  ...
export function upgradeMaterialCost(currentLevel: number): number {
    return Math.floor(3 * Math.pow(2.5, currentLevel - 1));
}

// ─── Añadir XP a una estructura ──────────────────────────────────────────────
export async function addStructureXp(
    userId: string,
    type: StructureType,
    amount: number
): Promise<void> {
    await prisma.structure.updateMany({
        where: { userId, type },
        data: { structureXp: { increment: amount } },
    });
}

// ─── Info de progresión para el status ───────────────────────────────────────
export function progressionInfo(structure: {
    level: number;
    structureXp: number;
}) {
    const xpNeeded = xpToNextLevel(structure.level);
    const materialCost = upgradeMaterialCost(structure.level);
    const canUpgradeXp = structure.structureXp >= xpNeeded;

    return {
        structureXp: structure.structureXp,
        xpToNextLevel: xpNeeded,
        upgradeRequirement: {
            item: UPGRADE_MATERIAL[
                // Se pasa desde fuera — aquí solo devolvemos la cantidad
                "MINE" as StructureType  // placeholder, se sobreescribe al llamar
            ],
            quantity: materialCost,
        },
        canUpgradeXp,
    };
}

// ─── Upgrade genérico de estructura ──────────────────────────────────────────
export async function upgradeStructure(
    userId: string,
    type: StructureType
): Promise<{ newLevel: number }> {
    const structure = await prisma.structure.findUniqueOrThrow({
        where: { userId_type: { userId, type } },
    });

    const xpNeeded = xpToNextLevel(structure.level);
    if (structure.structureXp < xpNeeded) {
        throw new Error(
            `XP insuficiente. Tienes ${structure.structureXp}/${xpNeeded} XP.`
        );
    }

    const material = UPGRADE_MATERIAL[type];
    const cost = upgradeMaterialCost(structure.level);

    // Verificar inventario
    const inv = await prisma.inventory.findUnique({
        where: { userId_item: { userId, item: material } },
    });
    const owned = inv?.quantity ?? 0;
    if (owned < cost) {
        throw new Error(
            `Material insuficiente. Necesitas ${cost}× ${material}, tienes ${owned}.`
        );
    }

    // Transacción: consumir material + subir nivel + resetear XP
    await prisma.$transaction([
        prisma.inventory.update({
            where: { userId_item: { userId, item: material } },
            data: { quantity: { decrement: cost } },
        }),
        prisma.structure.update({
            where: { userId_type: { userId, type } },
            data: {
                level: { increment: 1 },
                structureXp: 0,
            },
        }),
    ]);

    return { newLevel: structure.level + 1 };
}
