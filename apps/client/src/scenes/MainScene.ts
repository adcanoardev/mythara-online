import Phaser from "phaser";
import { PLAYER } from "../constants";
import { saveGameId, loadGameId } from "../utils/helpers";
import { fetchHealth, fetchGame } from "../utils/api";
import type { DexPokemon } from "../types";

import { NetworkManager } from "../systems/NetworkManager";
import { StarterSystem } from "../systems/StarterSystem";
import { EncounterSystem } from "../systems/EncounterSystem";
import { HUD } from "../systems/HUD";

export class MainScene extends Phaser.Scene {
    private player!: Phaser.GameObjects.Rectangle;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;

    private network!: NetworkManager;
    private starterSystem!: StarterSystem;
    private encounter!: EncounterSystem;
    private hud!: HUD;

    private starter?: DexPokemon;
    private wasMoving = false;

    create() {
        this.cursors = this.input.keyboard!.createCursorKeys();

        // Systems
        this.hud = new HUD(this);
        this.network = new NetworkManager(this);
        this.encounter = new EncounterSystem(this, (_id) => {
            /* future: battle logic */
        });
        this.starterSystem = new StarterSystem(this, (starter, gameId) => {
            void this.onStarterPicked(starter, gameId);
        });

        // Player
        this.player = this.add.rectangle(200, 200, PLAYER.SIZE, PLAYER.SIZE, PLAYER.COLOR);

        // Input
        this.input.keyboard?.on("keydown-SPACE", () => {
            if (this.encounter.isActive) this.encounter.hide();
            else if (this.starterSystem.isOpen) this.starterSystem.close();
        });

        this.input.keyboard?.on("keydown-N", () => {
            if (this.encounter.isActive || this.starterSystem.isOpen || this.starter) return;
            void this.starterSystem.open();
        });

        this.input.keyboard?.on("keydown-ONE", () => void this.starterSystem.pick(0));
        this.input.keyboard?.on("keydown-TWO", () => void this.starterSystem.pick(1));
        this.input.keyboard?.on("keydown-THREE", () => void this.starterSystem.pick(2));

        // initGame se llama aquí directamente — create() ya garantiza que los sistemas existen
        void this.initGame();
    }

    update() {
        if (this.encounter.isActive || this.starterSystem.isOpen) return;

        const dt = this.game.loop.delta / 1000;
        const { vx, vy, moving } = this.readInput();

        this.player.x = Phaser.Math.Clamp(this.player.x + vx * dt, 10, 790);
        this.player.y = Phaser.Math.Clamp(this.player.y + vy * dt, 10, 440);

        this.encounter.tick(this.player.x, this.player.y, moving, dt);

        const now = this.time.now;
        if (moving) {
            this.network.sendPositionIfNeeded(this.player.x, this.player.y, true, now);
        } else if (this.wasMoving) {
            this.network.sendStop(this.player.x, this.player.y);
        }

        this.wasMoving = moving;
    }

    shutdown() {
        this.network.destroy();
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private readInput(): { vx: number; vy: number; moving: boolean } {
        let vx = 0;
        let vy = 0;

        if (this.cursors.left?.isDown) vx -= PLAYER.SPEED;
        if (this.cursors.right?.isDown) vx += PLAYER.SPEED;
        if (this.cursors.up?.isDown) vy -= PLAYER.SPEED;
        if (this.cursors.down?.isDown) vy += PLAYER.SPEED;

        return { vx, vy, moving: vx !== 0 || vy !== 0 };
    }

    /**
     * Async setup after create(). Named initGame to avoid collision with
     * Phaser's reserved init() lifecycle method which runs before create().
     */
    private async initGame(): Promise<void> {
        // API health check (fire and forget)
        fetchHealth()
            .then((d) => this.hud.setApiStatus(`OK (${d.service})`))
            .catch(() => this.hud.setApiStatus("ERROR (no conecta)"));

        // Restore saved game session
        const gid = loadGameId();
        if (!gid) {
            this.hud.setGameId(null);
            return;
        }

        this.hud.setGameId(gid);

        try {
            const data = await fetchGame(gid);
            await this.activateStarter(data.starter);
        } catch {
            this.hud.setGameId(null);
            this.hud.setApiStatus("ERROR (id guardado no existe en servidor)");
        }
    }

    private async onStarterPicked(starter: DexPokemon, gameId: string): Promise<void> {
        saveGameId(gameId);
        this.hud.setGameId(gameId);
        await this.activateStarter(starter);
    }

    private async activateStarter(p: DexPokemon): Promise<void> {
        this.starter = p;
        await this.hud.setStarter(p);
        this.network.connect();
    }
}
