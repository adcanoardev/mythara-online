import { prisma } from "./prisma.js";

const NPC_MAX = 10;
const PVP_MAX = 5;
const NPC_RECHARGE_MS = 60 * 60 * 1000; // 1 hora
const PVP_RECHARGE_MS = 3 * 60 * 60 * 1000; // 3 horas

// Calcula cuántas fichas se han recargado desde lastRecharge
function calculateRecharge(current: number, max: number, lastRecharge: Date, intervalMs: number) {
    const elapsed = Date.now() - lastRecharge.getTime();
    const gained = Math.floor(elapsed / intervalMs);
    if (gained === 0) return { newCount: current, newLastRecharge: lastRecharge };

    const newCount = Math.min(max, current + gained);
    // Avanzar el timestamp solo por los tokens que se han generado
    const consumed = newCount - current;
    const newLastRecharge = new Date(lastRecharge.getTime() + consumed * intervalMs);
    return { newCount, newLastRecharge };
}

export async function getTokens(userId: string) {
    const tokens = await prisma.combatToken.findUniqueOrThrow({ where: { userId } });

    // Calcular recarga pendiente
    const npc = calculateRecharge(tokens.npcTokens, NPC_MAX, tokens.lastNpcRecharge, NPC_RECHARGE_MS);
    const pvp = calculateRecharge(tokens.pvpTokens, PVP_MAX, tokens.lastPvpRecharge, PVP_RECHARGE_MS);

    // Si cambiaron, persistir
    if (npc.newCount !== tokens.npcTokens || pvp.newCount !== tokens.pvpTokens) {
        await prisma.combatToken.update({
            where: { userId },
            data: {
                npcTokens: npc.newCount,
                lastNpcRecharge: npc.newLastRecharge,
                pvpTokens: pvp.newCount,
                lastPvpRecharge: pvp.newLastRecharge,
            },
        });
    }

    // Calcular tiempo hasta próxima recarga
    const nextNpcMs =
        npc.newCount < NPC_MAX
            ? NPC_RECHARGE_MS - ((Date.now() - npc.newLastRecharge.getTime()) % NPC_RECHARGE_MS)
            : null;
    const nextPvpMs =
        pvp.newCount < PVP_MAX
            ? PVP_RECHARGE_MS - ((Date.now() - pvp.newLastRecharge.getTime()) % PVP_RECHARGE_MS)
            : null;

    return {
        npcTokens: npc.newCount,
        npcMax: NPC_MAX,
        nextNpcRechargeMs: nextNpcMs,
        pvpTokens: pvp.newCount,
        pvpMax: PVP_MAX,
        nextPvpRechargeMs: nextPvpMs,
    };
}

export async function useNpcToken(userId: string): Promise<boolean> {
    const tokens = await prisma.combatToken.findUniqueOrThrow({ where: { userId } });

    // Aplicar recarga pendiente primero
    const npc = calculateRecharge(tokens.npcTokens, NPC_MAX, tokens.lastNpcRecharge, NPC_RECHARGE_MS);

    if (npc.newCount <= 0) return false;

    await prisma.combatToken.update({
        where: { userId },
        data: {
            npcTokens: npc.newCount - 1,
            // ✅ Si estaba lleno, iniciar el timer de recarga ahora
            lastNpcRecharge: npc.newCount === NPC_MAX ? new Date() : npc.newLastRecharge,
        },
    });
    return true;
}
