// apps/server/src/routes/game.ts

import { Router } from "express";
import { fetchPokemon, isEligibleStarter } from "../services/pokeapi.js";
import { createGame, getGame } from "../services/gameStore.js";
import { NewGameBody, GameIdParam, validate } from "../validators/game.validators.js";

const router = Router();

router.post("/game/new", async (req, res) => {
    try {
        const { starterId } = validate(NewGameBody, req.body);

        const eligible = await isEligibleStarter(starterId);
        if (!eligible) {
            return res.status(400).json({ error: "starterId not eligible (legendary, mythical, or evolution)" });
        }

        const record = createGame(starterId);
        const starter = await fetchPokemon(starterId);

        res.json({ gameId: record.gameId, seed: record.seed, starter });
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Internal error";
        res.status(500).json({ error: msg });
    }
});

router.get("/game/:gameId", async (req, res) => {
    try {
        const { gameId } = validate(GameIdParam, req.params);

        const record = getGame(gameId);
        if (!record) return res.status(404).json({ error: "Game not found" });

        const starter = await fetchPokemon(record.starterId);
        res.json({ gameId: record.gameId, seed: record.seed, starter });
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Internal error";
        res.status(500).json({ error: msg });
    }
});

export default router;
