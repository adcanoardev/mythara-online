// apps/server/src/routes/health.ts

import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
    res.json({ ok: true, service: "poke-mmo-api", time: new Date().toISOString() });
});

export default router;
