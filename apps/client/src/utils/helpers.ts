import Phaser from "phaser";
import { LS_GAME_ID_KEY } from "../constants";

// ── Storage ──────────────────────────────────────────────────────────────────

export function saveGameId(gameId: string): void {
    localStorage.setItem(LS_GAME_ID_KEY, gameId);
}

export function loadGameId(): string | null {
    return localStorage.getItem(LS_GAME_ID_KEY);
}

// ── Misc ─────────────────────────────────────────────────────────────────────

export function randInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function capitalize(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Sprite loader ─────────────────────────────────────────────────────────────

/**
 * Loads an image into Phaser's texture cache if not already loaded.
 * Returns a promise that resolves once the texture is ready.
 */
export function loadImageAsync(scene: Phaser.Scene, key: string, url: string): Promise<void> {
    if (scene.textures.exists(key)) return Promise.resolve();

    return new Promise<void>((resolve, reject) => {
        const onComplete = () => {
            scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
            resolve();
        };
        const onError = () => {
            scene.load.off(Phaser.Loader.Events.COMPLETE, onComplete);
            reject(new Error(`Failed to load sprite: ${url}`));
        };

        scene.load.image(key, url);
        scene.load.once(Phaser.Loader.Events.COMPLETE, onComplete);
        scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
        scene.load.start();
    });
}
