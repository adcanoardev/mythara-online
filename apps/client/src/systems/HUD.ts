import Phaser from "phaser";
import type { DexPokemon } from "../../../../packages/shared/types";
import { loadImageAsync, capitalize } from "../utils/helpers";

/**
 * All persistent HUD text: API status, starter info, game ID.
 * Keeps UI concerns out of MainScene.
 */
export class HUD {
    private apiText!: Phaser.GameObjects.Text;
    private starterText!: Phaser.GameObjects.Text;
    private gameText!: Phaser.GameObjects.Text;
    private starterSprite?: Phaser.GameObjects.Image;

    constructor(private scene: Phaser.Scene) {
        this.build();
    }

    setApiStatus(status: string): void {
        this.apiText.setText(`API: ${status}`);
    }

    setGameId(gameId: string | null): void {
        this.gameText.setText(gameId ? `Partida: ${gameId}` : "Partida: (sin crear)");
    }

    setGameError(msg: string): void {
        this.gameText.setText(`Partida: ERROR (${msg})`);
    }

    async setStarter(p: DexPokemon): Promise<void> {
        const name = capitalize(p.name);
        const types = p.types?.length ? p.types.join(", ") : "unknown";
        this.starterText.setText(`Starter: ${name} (ID ${p.id}) | Tipos: ${types}`);

        this.starterSprite?.destroy();
        this.starterSprite = undefined;

        if (p.sprite) {
            const key = `starter-final-${p.id}`;
            try {
                await loadImageAsync(this.scene, key, p.sprite);
                this.starterSprite = this.scene.add.image(450, 150, key).setScale(1.5).setDepth(5);
            } catch {
                // sprite not critical, ignore
            }
        }
    }

    private build(): void {
        this.scene.add.text(16, 16, "poke-mmo MVP (Phaser)", { fontSize: "18px" }).setDepth(10);
        this.scene.add
            .text(16, 40, "Flechas: mover | Hierba: encuentros | ESPACIO: cerrar | N: elegir starter", {
                fontSize: "14px",
            })
            .setDepth(10);

        this.apiText = this.scene.add.text(16, 70, "API: comprobando...", { fontSize: "14px" }).setDepth(10);
        this.starterText = this.scene.add
            .text(16, 100, "Starter: (pulsa N para elegir)", { fontSize: "14px" })
            .setDepth(10);
        this.gameText = this.scene.add.text(16, 125, "Partida: (sin crear)", { fontSize: "14px" }).setDepth(10);
    }
}
