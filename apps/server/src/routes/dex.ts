// apps/server/src/routes/dex.ts

import { Router } from "express";
import { fetchPokemon, fetchRandomEligibleStarter } from "../services/pokeapi.js";
import { PokemonIdParam, validate } from "../validators/game.validators.js";

const router = Router();

router.get("/dex/pokemon/:id", async (req, res) => {
    try {
        const { id } = validate(PokemonIdParam, req.params);
        const pokemon = await fetchPokemon(id);
        res.json(pokemon);
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Internal error";
        const status = msg.includes("not found") || msg.includes("404") ? 404 : 400;
        res.status(status).json({ error: msg });
    }
});

router.get("/random/starter", async (_req, res) => {
    try {
        const starter = await fetchRandomEligibleStarter();
        res.json(starter);
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Internal error";
        res.status(503).json({ error: msg });
    }
});

export default router;
