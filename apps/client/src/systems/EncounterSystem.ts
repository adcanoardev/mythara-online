import Phaser from "phaser";
import { GRASS_ZONE, POKEMON } from "../constants";
import { randInt } from "../utils/helpers";
import { loadImageAsync } from "../utils/helpers.js";

type OnEncounter = (pokemonId: number) => void;

/**
 * Handles grass zone rendering and random encounter logic.
 */
export class EncounterSystem {
    isActive = false;

    private panel!: Phaser.GameObjects.Rectangle;
    private text!: Phaser.GameObjects.Text;
    private sprite?: Phaser.GameObjects.Image;
    private grassZone!: Phaser.GameObjects.Rectangle;

    constructor(
        private scene: Phaser.Scene,
        private onEncounter: OnEncounter,
    ) {
        this.buildGrass();
        this.buildEncounterUI();
    }

    /**
     * Call every frame while player is moving. Handles encounter chance.
     */
    tick(playerX: number, playerY: number, moving: boolean, dt: number): void {
        if (this.isActive) return;
        if (!moving) return;
        if (!this.isInGrass(playerX, playerY)) return;

        if (Math.random() < GRASS_ZONE.ENCOUNTER_CHANCE_PER_SECOND * dt) {
            const id = randInt(1, POKEMON.MAX_ID);
            this.show(id);
            this.onEncounter(id);
        }
    }

    async show(pokemonId: number): Promise<void> {
        this.isActive = true;
        this.panel.setVisible(true);
        this.text.setText(`¡Encuentro!\nID: ${pokemonId}\nESPACIO para cerrar`).setVisible(true);

        // Cargar sprite desde la API
        try {
            const res = await fetch(
                `${import.meta.env.VITE_API_URL || "http://localhost:8080"}/dex/pokemon/${pokemonId}`,
            );
            const data = await res.json();

            if (data.sprite) {
                const key = `encounter-${pokemonId}`;
                await loadImageAsync(this.scene, key, data.sprite);
                this.sprite = this.scene.add.image(250, 225, key).setScale(2).setDepth(5);
                this.text.setText(`¡Apareció un ${data.name}!\nESPACIO para cerrar`);
            }
        } catch {
            // sprite no crítico, el texto ya informa
        }
    }
    hide(): void {
        this.isActive = false;
        this.panel.setVisible(false);
        this.text.setVisible(false);
        this.sprite?.destroy();
        this.sprite = undefined;
    }

    isInGrass(px: number, py: number): boolean {
        const halfW = this.grassZone.width / 2;
        const halfH = this.grassZone.height / 2;
        return (
            px >= this.grassZone.x - halfW &&
            px <= this.grassZone.x + halfW &&
            py >= this.grassZone.y - halfH &&
            py <= this.grassZone.y + halfH
        );
    }

    private buildGrass(): void {
        this.scene.add.text(520, 120, "HIERBA", { fontSize: "14px" });
        this.grassZone = this.scene.add.rectangle(
            GRASS_ZONE.X,
            GRASS_ZONE.Y,
            GRASS_ZONE.WIDTH,
            GRASS_ZONE.HEIGHT,
            GRASS_ZONE.COLOR,
            GRASS_ZONE.ALPHA,
        );
        this.grassZone.setStrokeStyle(2, 0x00ff00, 0.8);
    }

    private buildEncounterUI(): void {
        this.panel = this.scene.add.rectangle(400, 225, 560, 220, 0x000000, 0.85).setVisible(false);
        this.panel.setStrokeStyle(2, 0xffffff, 0.8);
        this.text = this.scene.add
            .text(430, 225, "", { fontSize: "18px", align: "left" })
            .setOrigin(0, 0.5)
            .setVisible(false);
    }
}
