import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getOrCreateTrainer } from "../services/trainerService.js";
import { getTokens } from "../services/tokenService.js";
import { getInventory } from "../services/inventoryService.js";
import { getMineStatus, collectMine } from "../services/mineService.js";
import { prisma } from "../services/prisma.js";
import { checkLevelEvolution, getAvailableItemEvolutions, evolveWithItem } from "../services/evolutionService.js";
import { z } from "zod";
import { getForgeStatus, collectForge, getLabStatus, collectLab } from "../services/mineService.js";
import { getNurseryStatus, assignToNursery, collectNursery, removeFromNursery } from "../services/nurseryService.js";
import { openFragment } from "../services/fragmentService.js";

const router = Router();

router.get("/trainer/me", requireAuth, async (req, res) => {
    try {
        const trainer = await getOrCreateTrainer(req.user!.userId);
        res.json(trainer);
    } catch (e) {
        res.status(500).json({ error: "Internal error" });
    }
});

router.get("/tokens/me", requireAuth, async (req, res) => {
    try {
        const tokens = await getTokens(req.user!.userId);
        res.json(tokens);
    } catch (e) {
        res.status(500).json({ error: "Internal error" });
    }
});

router.get("/inventory/me", requireAuth, async (req, res) => {
    try {
        const inventory = await getInventory(req.user!.userId);
        res.json(inventory);
    } catch (e) {
        res.status(500).json({ error: "Internal error" });
    }
});

router.get("/mine/me", requireAuth, async (req, res) => {
    try {
        const status = await getMineStatus(req.user!.userId);
        res.json(status);
    } catch (e) {
        res.status(500).json({ error: "Internal error" });
    }
});

router.post("/mine/collect", requireAuth, async (req, res) => {
    try {
        const result = await collectMine(req.user!.userId);
        if (!result) {
            return res.status(400).json({ error: "Mine not ready yet" });
        }
        res.json({ collected: result });
    } catch (e) {
        res.status(500).json({ error: "Internal error" });
    }
});

// Endpoint temporal para añadir criatura al equipo (desarrollo)
router.post("/dev/add-creature", requireAuth, async (req, res) => {
    try {
        const creature = await prisma.creatureInstance.create({
            data: {
                userId: req.user!.userId,
                speciesId: "001",
                level: 10,
                xp: 0,
                hp: 60,
                maxHp: 60,
                attack: 55,
                defense: 40,
                speed: 90,
                isInParty: true,
                slot: 0,
            },
        });
        res.json(creature);
    } catch (e) {
        res.status(500).json({ error: "Internal error" });
    }
});

// Ver todas las criaturas del jugador
router.get("/creatures/me", requireAuth, async (req, res) => {
    try {
        const creatures = await prisma.creatureInstance.findMany({
            where: { userId: req.user!.userId },
            orderBy: [{ isInParty: "desc" }, { slot: "asc" }, { level: "desc" }],
        });
        res.json(creatures);
    } catch (e) {
        res.status(500).json({ error: "Internal error" });
    }
});

// Ver solo el equipo activo
router.get("/creatures/party", requireAuth, async (req, res) => {
    try {
        const party = await prisma.creatureInstance.findMany({
            where: { userId: req.user!.userId, isInParty: true, inNursery: false },
            orderBy: { slot: "asc" },
        });
        res.json(party);
    } catch (e) {
        res.status(500).json({ error: "Internal error" });
    }
});

// Endpoint temporal para limpiar criaturas corruptas (desarrollo)
router.delete("/dev/clean-creatures", requireAuth, async (req, res) => {
    try {
        await prisma.creatureInstance.deleteMany({
            where: {
                userId: req.user!.userId,
                id: "",
            },
        });
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: "Internal error" });
    }
});

// Ver evoluciones disponibles por objeto para una criatura
router.get("/creatures/:id/evolutions", requireAuth, async (req, res) => {
    try {
        const result = await getAvailableItemEvolutions(req.user!.userId, req.params.id);
        res.json(result);
    } catch (e) {
        res.status(404).json({ error: "Creature not found" });
    }
});

// Evolucionar con objeto
router.post("/creatures/:id/evolve", requireAuth, async (req, res) => {
    try {
        const { item } = z.object({ item: z.string() }).parse(req.body);
        const result = await evolveWithItem(req.user!.userId, req.params.id, item as any);
        if ("error" in result) return res.status(400).json(result);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: "Invalid request" });
    }
});

// ─── FRAGMENT FORGE ──────────────────────────────────────────────────────────
router.get("/forge/me", requireAuth, async (req, res) => {
    try {
        res.json(await getForgeStatus(req.user!.userId));
    } catch (e) {
        res.status(500).json({ error: "Internal error" });
    }
});

router.post("/forge/collect", requireAuth, async (req, res) => {
    try {
        const result = await collectForge(req.user!.userId);
        if (!result) return res.status(400).json({ error: "La Forja aún no está lista" });
        res.json({ collected: result });
    } catch (e) {
        res.status(500).json({ error: "Internal error" });
    }
});

router.post("/forge/open", requireAuth, async (req, res) => {
    try {
        const result = await openFragment(req.user!.userId);
        res.json(result);
    } catch (err: any) {
        const status = err.message === "No tienes fragmentos disponibles" ? 400 : 500;
        res.status(status).json({ error: err.message ?? "Error al abrir fragmento" });
    }
});

// ─── LAB ─────────────────────────────────────────────────────────────────────
router.get("/lab/me", requireAuth, async (req, res) => {
    try {
        res.json(await getLabStatus(req.user!.userId));
    } catch (e) {
        res.status(500).json({ error: "Internal error" });
    }
});

router.post("/lab/collect", requireAuth, async (req, res) => {
    try {
        const result = await collectLab(req.user!.userId);
        if (!result) return res.status(400).json({ error: "El Laboratorio aún no está listo" });
        res.json({ collected: result });
    } catch (e) {
        res.status(500).json({ error: "Internal error" });
    }
});

// ─── NURSERY ─────────────────────────────────────────────────────────────────
router.get("/nursery/me", requireAuth, async (req, res) => {
    try {
        res.json(await getNurseryStatus(req.user!.userId));
    } catch (e) {
        res.status(500).json({ error: "Internal error" });
    }
});

router.post("/nursery/assign", requireAuth, async (req, res) => {
    try {
        const { creatureId } = req.body;
        if (!creatureId) return res.status(400).json({ error: "Falta creatureId" });
        res.json(await assignToNursery(req.user!.userId, creatureId));
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

router.post("/nursery/collect", requireAuth, async (req, res) => {
    try {
        res.json(await collectNursery(req.user!.userId));
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

router.post("/nursery/remove", requireAuth, async (req, res) => {
    try {
        res.json(await removeFromNursery(req.user!.userId));
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// POST /creatures/party/update
// Body: { party: [{ id: string, slot: number }] } — máximo 3 slots (0,1,2)
router.post("/creatures/party/update", requireAuth, async (req, res) => {
    try {
        const userId = req.user!.userId;
        const { party } = req.body as { party: { id: string; slot: number }[] };

        if (!Array.isArray(party) || party.length > 3) {
            return res.status(400).json({ error: "El equipo debe tener entre 0 y 3 Myths" });
        }

        const slots = party.map((p) => p.slot);
        if (new Set(slots).size !== slots.length) {
            return res.status(400).json({ error: "Slots duplicados" });
        }

        // Verificar que todos los Myths pertenecen al usuario
        const ids = party.map((p) => p.id);
        const owned = await prisma.creatureInstance.findMany({
            where: { id: { in: ids }, userId },
            select: { id: true },
        });
        if (owned.length !== ids.length) {
            return res.status(403).json({ error: "Myth no encontrado" });
        }

        // Quitar todo del equipo primero
        await prisma.creatureInstance.updateMany({
            where: { userId },
            data: { isInParty: false, slot: null },
        });

        // Asignar los nuevos
        await Promise.all(
            party.map(({ id, slot }) =>
                prisma.creatureInstance.update({
                    where: { id },
                    data: { isInParty: true, slot },
                }),
            ),
        );

        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Internal error" });
    }
});

export default router;
