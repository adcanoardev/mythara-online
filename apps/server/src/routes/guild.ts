// apps/server/src/routes/guild.ts
// IMPORTANT: todas las rutas estáticas (/guild/me, /guild/list, /guild/quests...)
// deben ir ANTES de las paramétricas (/guild/:id) para evitar conflictos en Express.

import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getMyGuild, listGuilds, getGuildById,
  createGuild, joinGuild, leaveGuild,
  kickMember, promoteMember, demoteMember,
} from "../services/guildService.js";
import { getDailyQuestsForUser, claimReward } from "../services/guildQuestService.js";
import { prisma } from "../services/prisma.js";

const router = Router();

// ─── Rutas estáticas primero ─────────────────────────────────────────────────

router.get("/guild/me", requireAuth, async (req, res) => {
  try { res.json(await getMyGuild(req.user!.userId)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/guild/list", requireAuth, async (req, res) => {
  try { res.json(await listGuilds(req.query.search as string | undefined)); }
  catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get("/guild/quests", requireAuth, async (req, res) => {
  try {
    const profile = await prisma.trainerProfile.findUnique({
      where: { userId: req.user!.userId }, select: { guildId: true },
    });
    if (!profile?.guildId) return res.status(400).json({ error: "Not in a guild" });
    res.json(await getDailyQuestsForUser(req.user!.userId, profile.guildId));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post("/guild/quests/:id/claim", requireAuth, async (req, res) => {
  try {
    const { threshold } = req.body as { threshold: 50 | 100 };
    if (threshold !== 50 && threshold !== 100) return res.status(400).json({ error: "threshold must be 50 or 100" });
    const profile = await prisma.trainerProfile.findUnique({
      where: { userId: req.user!.userId }, select: { guildId: true },
    });
    if (!profile?.guildId) return res.status(400).json({ error: "Not in a guild" });
    res.json(await claimReward(req.user!.userId, profile.guildId, req.params.id, threshold));
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.post("/guild/create", requireAuth, async (req, res) => {
  try {
    const { name, tag, banner, description } = req.body;
    if (!name || !tag) return res.status(400).json({ error: "name and tag required" });
    res.status(201).json(await createGuild(req.user!.userId, name, tag, banner ?? "#7b2fff", description ?? ""));
  } catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.post("/guild/leave", requireAuth, async (req, res) => {
  try { res.json(await leaveGuild(req.user!.userId)); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ─── Member management ────────────────────────────────────────────────────────

router.post("/guild/member/:userId/kick", requireAuth, async (req, res) => {
  try { res.json(await kickMember(req.user!.userId, req.params.userId)); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.post("/guild/member/:userId/promote", requireAuth, async (req, res) => {
  try { res.json(await promoteMember(req.user!.userId, req.params.userId)); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.post("/guild/member/:userId/demote", requireAuth, async (req, res) => {
  try { res.json(await demoteMember(req.user!.userId, req.params.userId)); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

// ─── Rutas paramétricas al final ─────────────────────────────────────────────

router.post("/guild/:id/join", requireAuth, async (req, res) => {
  try { res.json(await joinGuild(req.user!.userId, req.params.id)); }
  catch (e: any) { res.status(400).json({ error: e.message }); }
});

router.get("/guild/:id", requireAuth, async (req, res) => {
  try {
    const guild = await getGuildById(req.params.id);
    if (!guild) return res.status(404).json({ error: "Guild not found" });
    res.json(guild);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
