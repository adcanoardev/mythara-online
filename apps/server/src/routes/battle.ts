import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { runNpcBattle } from "../services/battleService.js";

const router = Router();

router.post("/battle/npc", requireAuth, async (req, res) => {
    try {
        const result = await runNpcBattle(req.user!.userId);
        if ("error" in result) {
            return res.status(400).json(result);
        }
        res.json(result);
    } catch (e) {
        console.error("[battle/npc]", e);
        res.status(500).json({ error: "Internal error" });
    }
});

export default router;
