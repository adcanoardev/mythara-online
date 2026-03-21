// apps/server/src/routes/arena.ts
import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { prisma } from "../services/prisma.js";
import { getCreature } from "../services/creatureService.js";

const router = Router();
router.use(requireAuth);

// ─── Trophies → tier ──────────────────────────────────────────
export function getTier(trophies: number): string {
  if (trophies >= 5000) return "Mythic";
  if (trophies >= 4000) return "Diamond";
  if (trophies >= 3000) return "Platinum";
  if (trophies >= 2000) return "Gold";
  if (trophies >= 1000) return "Silver";
  return "Bronze";
}

// Trophy delta formula: ~25 for win, ~20 for loss (capped)
function calcTrophyDelta(attackerTrophies: number, defenderTrophies: number): number {
  const diff = defenderTrophies - attackerTrophies;
  const base  = 25;
  const bonus = Math.floor(diff / 100); // up to ±10 based on MMR gap
  return Math.max(10, Math.min(40, base + bonus));
}

// ─── Enrich a myth slot with species data ────────────────────
async function enrichMyth(mythId: string) {
  const instance = await prisma.creatureInstance.findUnique({ where: { id: mythId } });
  if (!instance) return null;
  const species = getCreature(instance.speciesId);
  return {
    id:        instance.id,
    speciesId: instance.speciesId,
    nickname:  instance.nickname,
    name:      species?.name ?? instance.speciesId,
    rarity:    species?.rarity ?? "COMMON",
    affinity:  species?.affinity ?? null,
    slug:      species?.slug ?? instance.speciesId,
    level:     instance.level,
    hp:        instance.maxHp,
    attack:    instance.attack,
    defense:   instance.defense,
    speed:     instance.speed,
  };
}

// ─── GET /arena/defense — own defense team ───────────────────
router.get("/arena/defense", async (req, res) => {
  try {
    const userId = req.user!.userId;

    const defense = await prisma.arenaDefense.findUnique({ where: { userId } });
    if (!defense) return res.json({ defense: null });

    const [myth1, myth2, myth3] = await Promise.all([
      enrichMyth(defense.myth1Id),
      enrichMyth(defense.myth2Id),
      enrichMyth(defense.myth3Id),
    ]);

    res.json({
      defense: {
        trophies:  defense.trophies,
        tier:      getTier(defense.trophies),
        slots: [
          { myth: myth1, strategy: defense.strategy1 },
          { myth: myth2, strategy: defense.strategy2 },
          { myth: myth3, strategy: defense.strategy3 },
        ],
      },
    });
  } catch (err) {
    console.error("[arena/defense GET]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PUT /arena/defense — set defense team ───────────────────
// Body: { slots: [{ mythId, strategy }] }  (exactly 3)
router.put("/arena/defense", async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { slots } = req.body as {
      slots: { mythId: string; strategy: "AGGRESSIVE" | "BALANCED" | "DEFENSIVE" }[];
    };

    if (!Array.isArray(slots) || slots.length !== 3) {
      return res.status(400).json({ error: "Exactly 3 slots required" });
    }

    const validStrategies = ["AGGRESSIVE", "BALANCED", "DEFENSIVE"];
    for (const slot of slots) {
      if (!slot.mythId || !validStrategies.includes(slot.strategy)) {
        return res.status(400).json({ error: "Invalid slot data" });
      }
    }

    // Verify all myths belong to this user
    const ids = slots.map(s => s.mythId);
    const owned = await prisma.creatureInstance.findMany({
      where: { id: { in: ids }, userId },
      select: { id: true },
    });
    if (owned.length !== 3) {
      return res.status(403).json({ error: "One or more myths not owned by this trainer" });
    }

    const existing = await prisma.arenaDefense.findUnique({ where: { userId } });

    if (existing) {
      await prisma.arenaDefense.update({
        where: { userId },
        data: {
          myth1Id: slots[0].mythId, strategy1: slots[0].strategy,
          myth2Id: slots[1].mythId, strategy2: slots[1].strategy,
          myth3Id: slots[2].mythId, strategy3: slots[2].strategy,
        },
      });
    } else {
      // New defense starts at Silver (1000 trophies)
      await prisma.arenaDefense.create({
        data: {
          userId,
          myth1Id: slots[0].mythId, strategy1: slots[0].strategy,
          myth2Id: slots[1].mythId, strategy2: slots[1].strategy,
          myth3Id: slots[2].mythId, strategy3: slots[2].strategy,
          trophies: 1000,
        },
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[arena/defense PUT]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /arena/opponents — list of matchmade opponents ──────
// Returns 5 opponents near the attacker's trophy count
router.get("/arena/opponents", async (req, res) => {
  try {
    const userId = req.user!.userId;

    // Get attacker's trophies (default 1000 if no defense set)
    const myDefense = await prisma.arenaDefense.findUnique({ where: { userId } });
    const myTrophies = myDefense?.trophies ?? 1000;

    // Find 5 other trainers with defenses, sorted by trophy proximity
    const candidates = await prisma.arenaDefense.findMany({
      where: { userId: { not: userId } },
      orderBy: { trophies: "desc" },
      take: 100,
    });

    // Sort by proximity to own trophies and pick 5
    const sorted = candidates
      .sort((a, b) => Math.abs(a.trophies - myTrophies) - Math.abs(b.trophies - myTrophies))
      .slice(0, 5);

    // Enrich with trainer info
    const opponents = await Promise.all(
      sorted.map(async (defense) => {
        const profile = await prisma.trainerProfile.findUnique({
          where: { userId: defense.userId },
          include: { user: { select: { username: true } }, guild: { select: { tag: true } } },
        });

        const [myth1, myth2, myth3] = await Promise.all([
          enrichMyth(defense.myth1Id),
          enrichMyth(defense.myth2Id),
          enrichMyth(defense.myth3Id),
        ]);

        return {
          userId:   defense.userId,
          username: profile?.user.username ?? "Unknown",
          guildTag: profile?.guild?.tag ?? null,
          avatar:   profile?.avatar ?? null,
          trophies: defense.trophies,
          tier:     getTier(defense.trophies),
          team: [
            { myth: myth1, strategy: defense.strategy1 },
            { myth: myth2, strategy: defense.strategy2 },
            { myth: myth3, strategy: defense.strategy3 },
          ],
        };
      })
    );

    res.json({ opponents, myTrophies, myTier: getTier(myTrophies) });
  } catch (err) {
    console.error("[arena/opponents]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /arena/attack/:defenderId — simulate PvP battle ────
// The attacker sends their team order; the battle is simulated server-side.
// Body: { mythIds: string[] }  (3 myth instance IDs in order)
router.post("/arena/attack/:defenderId", async (req, res) => {
  try {
    const attackerId = req.user!.userId;
    const { defenderId } = req.params;
    const { mythIds } = req.body as { mythIds: string[] };

    if (!Array.isArray(mythIds) || mythIds.length !== 3) {
      return res.status(400).json({ error: "Exactly 3 mythIds required" });
    }
    if (attackerId === defenderId) {
      return res.status(400).json({ error: "Cannot attack yourself" });
    }

    // Validate attacker owns all myths
    const ownedMyths = await prisma.creatureInstance.findMany({
      where: { id: { in: mythIds }, userId: attackerId },
    });
    if (ownedMyths.length !== 3) {
      return res.status(403).json({ error: "Invalid myth selection" });
    }

    // Get defense
    const defense = await prisma.arenaDefense.findUnique({ where: { userId: defenderId } });
    if (!defense) return res.status(404).json({ error: "Opponent has no defense set" });

    // Get attacker defense (for trophies)
    let attackerDefense = await prisma.arenaDefense.findUnique({ where: { userId: attackerId } });

    // Simulate battle outcome: compare total power
    function calcPower(inst: any): number {
      const species = getCreature(inst.speciesId);
      const RARITY_MULT: Record<string, number> = {
        COMMON: 1.0, RARE: 1.2, EPIC: 1.4, ELITE: 1.6, LEGENDARY: 2.0, MYTHIC: 2.5,
      };
      const mult = RARITY_MULT[species?.rarity ?? "COMMON"] ?? 1.0;
      return Math.floor((inst.maxHp * 0.4 + inst.attack * 0.3 + inst.defense * 0.2 + inst.speed * 0.1) * mult);
    }

    const attackerPower = ownedMyths.reduce((sum, m) => sum + calcPower(m), 0);
    const defMyths = await prisma.creatureInstance.findMany({
      where: { id: { in: [defense.myth1Id, defense.myth2Id, defense.myth3Id] } },
    });
    const defenderPower = defMyths.reduce((sum, m) => sum + calcPower(m), 0);

    // Strategy modifier
    const stratMod: Record<string, number> = { AGGRESSIVE: 1.1, BALANCED: 1.0, DEFENSIVE: 0.95 };
    const avgDefMod = ([defense.strategy1, defense.strategy2, defense.strategy3]
      .map(s => stratMod[s] ?? 1.0)
      .reduce((a, b) => a + b, 0)) / 3;

    const effectiveDefPower = defenderPower * avgDefMod;

    // Add 15% randomness
    const roll = 0.85 + Math.random() * 0.3;
    const attackerWins = attackerPower * roll > effectiveDefPower;

    const attackerTrophies = attackerDefense?.trophies ?? 1000;
    const delta = calcTrophyDelta(attackerTrophies, defense.trophies);
    const trophyChange = attackerWins ? delta : -Math.floor(delta * 0.75);

    // Replay data (lightweight — full data for UI)
    const replayData = {
      attackerTeam: ownedMyths.map(m => ({
        id: m.id, speciesId: m.speciesId, level: m.level,
        hp: m.maxHp, attack: m.attack, defense: m.defense, speed: m.speed,
      })),
      defenderTeam: defMyths.map((m, i) => ({
        id: m.id, speciesId: m.speciesId, level: m.level,
        hp: m.maxHp, attack: m.attack, defense: m.defense, speed: m.speed,
        strategy: [defense.strategy1, defense.strategy2, defense.strategy3][i],
      })),
      attackerPower: Math.round(attackerPower * roll),
      defenderPower: Math.round(effectiveDefPower),
      winnerId: attackerWins ? attackerId : defenderId,
    };

    // Persist match + update trophies
    await prisma.$transaction(async (tx) => {
      await tx.arenaMatch.create({
        data: {
          attackerId,
          defenderId,
          winnerId: attackerWins ? attackerId : defenderId,
          trophyDelta: trophyChange,
          replayData,
        },
      });

      // Update attacker trophies (create defense row if needed)
      const newAttackerTrophies = Math.max(0, attackerTrophies + trophyChange);
      if (attackerDefense) {
        await tx.arenaDefense.update({
          where: { userId: attackerId },
          data: { trophies: newAttackerTrophies },
        });
      } else {
        await tx.arenaDefense.create({
          data: {
            userId: attackerId,
            myth1Id: mythIds[0], myth2Id: mythIds[1], myth3Id: mythIds[2],
            trophies: newAttackerTrophies,
          },
        });
      }

      // Defender loses trophies on loss
      const defTrophyChange = attackerWins ? -Math.floor(delta * 0.5) : Math.floor(delta * 0.5);
      await tx.arenaDefense.update({
        where: { userId: defenderId },
        data: { trophies: { increment: defTrophyChange } },
      });
    });

    res.json({
      result:       attackerWins ? "WIN" : "LOSS",
      trophyChange,
      newTrophies:  Math.max(0, attackerTrophies + trophyChange),
      tier:         getTier(Math.max(0, attackerTrophies + trophyChange)),
      replayData,
    });
  } catch (err) {
    console.error("[arena/attack]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /arena/history — recent matches ─────────────────────
router.get("/arena/history", async (req, res) => {
  try {
    const userId = req.user!.userId;

    const matches = await prisma.arenaMatch.findMany({
      where: { OR: [{ attackerId: userId }, { defenderId: userId }] },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const enriched = await Promise.all(
      matches.map(async (match) => {
        const isAttacker = match.attackerId === userId;
        const opponentId = isAttacker ? match.defenderId : match.attackerId;

        const opponentProfile = await prisma.trainerProfile.findUnique({
          where: { userId: opponentId },
          include: { user: { select: { username: true } } },
        });

        const won = match.winnerId === userId;
        const delta = isAttacker
          ? match.trophyDelta
          : -Math.floor(Math.abs(match.trophyDelta) * 0.5);

        return {
          id:              match.id,
          createdAt:       match.createdAt,
          role:            isAttacker ? "ATTACKER" : "DEFENDER",
          result:          won ? "WIN" : "LOSS",
          trophyChange:    won ? Math.abs(delta) : -Math.abs(delta),
          opponentId,
          opponentName:    opponentProfile?.user.username ?? "Unknown",
        };
      })
    );

    res.json({ history: enriched });
  } catch (err) {
    console.error("[arena/history]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /arena/ranking — global trophy leaderboard ──────────
router.get("/arena/ranking", async (req, res) => {
  try {
    const userId = req.user!.userId;

    const top = await prisma.arenaDefense.findMany({
      orderBy: { trophies: "desc" },
      take: 100,
    });

    const ranking = await Promise.all(
      top.map(async (defense, i) => {
        const profile = await prisma.trainerProfile.findUnique({
          where: { userId: defense.userId },
          include: {
            user:  { select: { username: true } },
            guild: { select: { tag: true } },
          },
        });
        return {
          position: i + 1,
          userId:   defense.userId,
          username: profile?.user.username ?? "Unknown",
          guildTag: profile?.guild?.tag ?? null,
          avatar:   profile?.avatar ?? null,
          trophies: defense.trophies,
          tier:     getTier(defense.trophies),
        };
      })
    );

    const myPosition = ranking.findIndex(r => r.userId === userId);

    res.json({
      ranking,
      myPosition: myPosition !== -1 ? myPosition + 1 : null,
      myTrophies: top.find(d => d.userId === userId)?.trophies ?? null,
    });
  } catch (err) {
    console.error("[arena/ranking]", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
