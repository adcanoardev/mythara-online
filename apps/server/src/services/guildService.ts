// apps/server/src/services/guildService.ts

import { prisma } from "./prisma.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Power de una guild = suma del prestige de sus miembros */
async function calcGuildPower(guildId: string): Promise<number> {
    const members = await prisma.trainerProfile.findMany({
        where: { guildId },
        select: { prestige: true },
    });
    return members.reduce((sum, m) => sum + m.prestige, 0);
}

/** Enriquece un TrainerProfile como miembro de guild */
function enrichMember(m: any) {
    const onlineThreshold = 5 * 60 * 1000; // 5 min
    const isOnline = m.lastSeen ? (Date.now() - new Date(m.lastSeen).getTime()) < onlineThreshold : false;
    return {
        userId:   m.userId,
        username: m.user?.username ?? "Unknown",
        role:     m.guildRole ?? "Member",
        level:    m.level,
        prestige: m.prestige,
        avatar:   m.avatar ?? null,
        lastSeen: m.lastSeen?.toISOString() ?? null,
        online:   isOnline,
    };
}

// ─── getMyGuild ───────────────────────────────────────────────────────────────

export async function getMyGuild(userId: string) {
    const profile = await prisma.trainerProfile.findUnique({
        where: { userId },
        select: { guildId: true },
    });

    if (!profile?.guildId) return null;

    const guild = await prisma.guild.findUnique({
        where: { id: profile.guildId },
        include: {
            members: {
                include: { user: { select: { username: true } } },
                orderBy: { prestige: "desc" },
            },
        },
        // xp incluido automáticamente por Prisma al añadir el campo
    });

    if (!guild) return null;

    const power = guild.members.reduce((sum, m) => sum + m.prestige, 0);
    const myMember = guild.members.find(m => m.userId === userId);

    return {
        id:          guild.id,
        name:        guild.name,
        tag:         guild.tag,
        banner:      guild.banner,
        level:       guild.level,
        xp:          (guild as any).xp ?? 0,
        description: guild.description,
        leaderId:    guild.leaderId,
        power,
        createdAt:   guild.createdAt,
        members:     guild.members.map(enrichMember),
        myUserId:    userId,
        myRole:      myMember?.guildRole ?? null,
    };
}

// ─── listGuilds ───────────────────────────────────────────────────────────────

export async function listGuilds(search?: string) {
    const guilds = await prisma.guild.findMany({
        where: search
            ? {
                  OR: [
                      { name: { contains: search, mode: "insensitive" } },
                      { tag:  { contains: search, mode: "insensitive" } },
                  ],
              }
            : undefined,
        include: {
            _count: { select: { members: true } },
        },
        orderBy: { level: "desc" },
        take: 50,
    });

    // Calcular power de cada guild
    const results = await Promise.all(
        guilds.map(async (g) => ({
            id:          g.id,
            name:        g.name,
            tag:         g.tag,
            banner:      g.banner,
            level:       g.level,
            description: g.description,
            memberCount: g._count.members,
            power:       await calcGuildPower(g.id),
        }))
    );

    return results;
}

// ─── getGuildById ─────────────────────────────────────────────────────────────

export async function getGuildById(guildId: string) {
    const guild = await prisma.guild.findUnique({
        where: { id: guildId },
        include: {
            members: {
                include: { user: { select: { username: true } } },
                orderBy: { prestige: "desc" },
            },
        },
        // xp incluido automáticamente por Prisma al añadir el campo
    });

    if (!guild) return null;

    const power = guild.members.reduce((sum, m) => sum + m.prestige, 0);

    return {
        id:          guild.id,
        name:        guild.name,
        tag:         guild.tag,
        banner:      guild.banner,
        level:       guild.level,
        description: guild.description,
        leaderId:    guild.leaderId,
        power,
        memberCount: guild.members.length,
        members:     guild.members.map(enrichMember),
    };
}

// ─── createGuild ──────────────────────────────────────────────────────────────

export async function createGuild(
    userId: string,
    name: string,
    tag: string,
    banner: string,
    description: string
) {
    const profile = await prisma.trainerProfile.findUnique({ where: { userId } });
    if (!profile) throw new Error("Trainer not found");
    if (profile.guildId) throw new Error("You are already in a guild");

    // Validaciones
    const cleanName = name.trim();
    const cleanTag  = tag.trim().toUpperCase().slice(0, 4);
    if (cleanName.length < 3 || cleanName.length > 32) throw new Error("Guild name must be 3–32 characters");
    if (cleanTag.length < 2)  throw new Error("Tag must be 2–4 characters");

    // Unicidad
    const existing = await prisma.guild.findFirst({
        where: { OR: [{ name: cleanName }, { tag: cleanTag }] },
    });
    if (existing) {
        if (existing.name === cleanName) throw new Error("Guild name already taken");
        throw new Error("Guild tag already taken");
    }

    // Crear guild + asignar trainer como Leader en una transacción
    const guild = await prisma.$transaction(async (tx) => {
        const g = await tx.guild.create({
            data: {
                name:        cleanName,
                tag:         cleanTag,
                banner:      banner || "#7b2fff",
                description: description?.trim() ?? "",
                leaderId:    userId,
            },
        });
        await tx.trainerProfile.update({
            where: { userId },
            data: { guildId: g.id, guildRole: "Leader" },
        });
        return g;
    });

    return guild;
}

// ─── joinGuild ────────────────────────────────────────────────────────────────

export async function joinGuild(userId: string, guildId: string) {
    const profile = await prisma.trainerProfile.findUnique({ where: { userId } });
    if (!profile) throw new Error("Trainer not found");
    if (profile.guildId) throw new Error("You are already in a guild. Leave first.");

    const guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) throw new Error("Guild not found");

    await prisma.trainerProfile.update({
        where: { userId },
        data: { guildId, guildRole: "Member" },
    });

    return { success: true, guildId, guildTag: guild.tag, guildRole: "Member" };
}

// ─── leaveGuild ───────────────────────────────────────────────────────────────

export async function leaveGuild(userId: string) {
    const profile = await prisma.trainerProfile.findUnique({ where: { userId } });
    if (!profile?.guildId) throw new Error("You are not in a guild");

    const guildId = profile.guildId;

    await prisma.$transaction(async (tx) => {
        // Quitar al trainer de la guild
        await tx.trainerProfile.update({
            where: { userId },
            data: { guildId: null, guildRole: null },
        });

        // Si era el líder, promover al siguiente miembro con más prestige
        const guild = await tx.guild.findUnique({ where: { id: guildId } });
        if (guild?.leaderId === userId) {
            const nextLeader = await tx.trainerProfile.findFirst({
                where: { guildId, userId: { not: userId } },
                orderBy: [{ guildRole: "asc" }, { prestige: "desc" }], // Officer primero, luego prestige
            });

            if (nextLeader) {
                // Promover al siguiente
                await tx.trainerProfile.update({
                    where: { userId: nextLeader.userId },
                    data: { guildRole: "Leader" },
                });
                await tx.guild.update({
                    where: { id: guildId },
                    data: { leaderId: nextLeader.userId },
                });
            } else {
                // No quedan miembros — disolver la guild
                await tx.guild.delete({ where: { id: guildId } });
            }
        }
    });

    return { success: true };
}

// ─── kickMember ───────────────────────────────────────────────────────────────

export async function kickMember(requesterId: string, targetUserId: string) {
  const [requester, target] = await Promise.all([
    prisma.trainerProfile.findUnique({ where: { userId: requesterId }, select: { guildId: true, guildRole: true } }),
    prisma.trainerProfile.findUnique({ where: { userId: targetUserId }, select: { guildId: true, guildRole: true } }),
  ]);

  if (!requester?.guildId) throw new Error("You are not in a guild");
  if (requester.guildId !== target?.guildId) throw new Error("Target is not in your guild");
  if (requesterId === targetUserId) throw new Error("Cannot kick yourself — use leave");
  if (!["Leader", "Officer"].includes(requester.guildRole ?? "")) throw new Error("Insufficient permissions");
  // Officers cannot kick other Officers or the Leader
  if (requester.guildRole === "Officer" && target.guildRole !== "Member") throw new Error("Officers can only kick Members");

  await prisma.trainerProfile.update({
    where: { userId: targetUserId },
    data: { guildId: null, guildRole: null },
  });

  return { success: true };
}

// ─── promoteMember ────────────────────────────────────────────────────────────

export async function promoteMember(requesterId: string, targetUserId: string) {
  const [requester, target] = await Promise.all([
    prisma.trainerProfile.findUnique({ where: { userId: requesterId }, select: { guildId: true, guildRole: true } }),
    prisma.trainerProfile.findUnique({ where: { userId: targetUserId }, select: { guildId: true, guildRole: true } }),
  ]);

  if (!requester?.guildId) throw new Error("You are not in a guild");
  if (requester.guildId !== target?.guildId) throw new Error("Target is not in your guild");
  if (requester.guildRole !== "Leader") throw new Error("Only the Leader can promote members");
  if (target.guildRole !== "Member") throw new Error("Target must be a Member to promote");

  await prisma.trainerProfile.update({
    where: { userId: targetUserId },
    data: { guildRole: "Officer" },
  });

  return { success: true, newRole: "Officer" };
}

// ─── demoteMember ─────────────────────────────────────────────────────────────

export async function demoteMember(requesterId: string, targetUserId: string) {
  const [requester, target] = await Promise.all([
    prisma.trainerProfile.findUnique({ where: { userId: requesterId }, select: { guildId: true, guildRole: true } }),
    prisma.trainerProfile.findUnique({ where: { userId: targetUserId }, select: { guildId: true, guildRole: true } }),
  ]);

  if (!requester?.guildId) throw new Error("You are not in a guild");
  if (requester.guildId !== target?.guildId) throw new Error("Target is not in your guild");
  if (requester.guildRole !== "Leader") throw new Error("Only the Leader can demote members");
  if (target.guildRole !== "Officer") throw new Error("Target must be an Officer to demote");

  await prisma.trainerProfile.update({
    where: { userId: targetUserId },
    data: { guildRole: "Member" },
  });

  return { success: true, newRole: "Member" };
}
