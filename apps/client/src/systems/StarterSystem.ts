import Phaser from "phaser";
import type { DexPokemon } from "../../../../packages/shared/types.js";
import { loadImageAsync, capitalize } from "../utils/helpers";
import { fetchUniqueStarters, createNewGame } from "../utils/api";
import { POKEMON } from "../constants";

type OnStarterPicked = (starter: DexPokemon, gameId: string) => void;

/**
 * Manages the starter selection modal entirely.
 * Emits a callback when the user successfully picks a starter.
 */
export class StarterSystem {
    isOpen = false;

    private options: DexPokemon[] = [];
    private optionSprites: (Phaser.GameObjects.Image | undefined)[] = [];
    private optionTexts: Phaser.GameObjects.Text[] = [];

    private bg!: Phaser.GameObjects.Rectangle;
    private title!: Phaser.GameObjects.Text;
    private hint!: Phaser.GameObjects.Text;
    private statusText!: Phaser.GameObjects.Text;

    private readonly SLOT_XS = [240, 400, 560];

    constructor(
        private scene: Phaser.Scene,
        private onPicked: OnStarterPicked,
    ) {
        this.build();
    }

    async open(): Promise<void> {
        if (this.isOpen) return;
        this.isOpen = true;
        this.setVisible(true);
        this.setStatus("Cargando pokémon...");

        // Reset previous sprites/options
        this.optionSprites.forEach((s) => s?.destroy());
        this.optionSprites = [];
        this.options = [];
        this.optionTexts.forEach((t, i) => t.setText(`Opción ${i + 1}\nCargando...`));

        try {
            this.options = await fetchUniqueStarters(POKEMON.STARTER_COUNT);
            await this.renderOptions();
            this.setStatus("Pulsa 1 / 2 / 3 para elegir");
        } catch {
            this.setStatus("Error cargando opciones. Cierra e intenta de nuevo.");
        }
    }

    close(): void {
        this.isOpen = false;
        this.setVisible(false);
    }

    async pick(index: number): Promise<void> {
        if (!this.isOpen) return;
        const p = this.options[index];
        if (!p) return;

        this.setStatus("Creando partida...");

        try {
            const game = await createNewGame(p.id);
            this.close();
            this.onPicked(game.starter, game.gameId);
        } catch (e) {
            const msg = e instanceof Error ? e.message : "unknown error";
            this.setStatus(`Error: ${msg} — intenta de nuevo`);
        }
    }

    private async renderOptions(): Promise<void> {
        for (let i = 0; i < this.options.length; i++) {
            const p = this.options[i];
            const name = capitalize(p.name);
            const types = p.types?.length ? p.types.join(", ") : "unknown";
            this.optionTexts[i].setText(`${i + 1}) ${name}\nTipos: ${types}`);

            if (p.sprite) {
                const key = `starter-opt-${p.id}`;
                try {
                    await loadImageAsync(this.scene, key, p.sprite);
                    const img = this.scene.add.image(this.SLOT_XS[i], 210, key).setScale(2).setDepth(51);
                    this.optionSprites[i] = img;
                } catch {
                    this.optionSprites[i] = undefined;
                }
            }
        }
    }

    private build(): void {
        this.bg = this.scene.add.rectangle(400, 225, 740, 400, 0x000000, 0.9).setVisible(false);
        this.bg.setStrokeStyle(2, 0xffffff, 0.6);

        this.title = this.scene.add
            .text(400, 70, "Elige tu Pokémon inicial", { fontSize: "22px" })
            .setOrigin(0.5)
            .setVisible(false);

        this.hint = this.scene.add
            .text(400, 100, "Pulsa ESPACIO para cerrar", { fontSize: "13px", color: "#aaaaaa" })
            .setOrigin(0.5)
            .setVisible(false);

        this.statusText = this.scene.add
            .text(400, 390, "", { fontSize: "14px", color: "#ffff88" })
            .setOrigin(0.5)
            .setVisible(false);

        for (let i = 0; i < POKEMON.STARTER_COUNT; i++) {
            const t = this.scene.add
                .text(this.SLOT_XS[i] - 90, 290, "", {
                    fontSize: "14px",
                    align: "center",
                    wordWrap: { width: 180 },
                })
                .setVisible(false);
            this.optionTexts.push(t);
        }
    }

    private setVisible(v: boolean): void {
        const depth = v ? 50 : 0;
        [this.bg, this.title, this.hint, this.statusText, ...this.optionTexts].forEach((obj) => {
            obj.setVisible(v).setDepth(v ? depth + 1 : 0);
        });
        this.bg.setDepth(depth);
        this.optionSprites.forEach((s) => s?.setVisible(v).setDepth(v ? 51 : 0));
    }

    private setStatus(msg: string): void {
        this.statusText.setText(msg);
    }
}
