import Phaser from "phaser";
import { io, Socket } from "socket.io-client";
import { API_URL, NETWORK, OTHER_PLAYER } from "../constants";
import type { PlayerState } from "../types";

/**
 * Handles all socket.io logic: connection, other players, and position broadcasting.
 * Completely decoupled from game logic — just call update() each frame.
 */
export class NetworkManager {
    private socket!: Socket;
    private myId: string | null = null;
    private otherPlayers = new Map<string, Phaser.GameObjects.Rectangle>();
    private lastNetSend = 0;
    private lastSentX = 0;
    private lastSentY = 0;

    constructor(private scene: Phaser.Scene) {}

    connect(): void {
        this.socket = io(API_URL, { transports: ["websocket"] });

        this.socket.on("connect", () => {
            this.myId = this.socket.id ?? null;
        });

        this.socket.on("players:init", (list: PlayerState[]) => {
            for (const p of list) {
                if (p.id === this.myId) continue;
                this.spawnOrMove(p.id, p.x, p.y);
            }
        });

        this.socket.on("players:join", (p: PlayerState) => {
            if (p.id === this.myId) return;
            this.spawnOrMove(p.id, p.x, p.y);
        });

        this.socket.on("players:update", (p: PlayerState) => {
            if (p.id === this.myId) return;
            this.spawnOrMove(p.id, p.x, p.y);
        });

        this.socket.on("players:leave", ({ id }: { id: string }) => {
            const obj = this.otherPlayers.get(id);
            if (obj) obj.destroy();
            this.otherPlayers.delete(id);
        });
    }

    /**
     * Call every frame from update(). Sends position if throttle allows and player moved enough.
     */
    sendPositionIfNeeded(x: number, y: number, moving: boolean, now: number): void {
        if (!this.socket?.connected || !moving) return;

        const elapsed = now - this.lastNetSend;
        if (elapsed < NETWORK.SEND_INTERVAL_MS) return;

        const dx = x - this.lastSentX;
        const dy = y - this.lastSentY;
        if (dx * dx + dy * dy < NETWORK.MIN_MOVE_DELTA_SQ) return;

        this.socket.emit("player:move", { x, y, timestamp: now });
        this.lastNetSend = now;
        this.lastSentX = x;
        this.lastSentY = y;
    }

    /**
     * Emit a stop event so other clients can snap to final position.
     */
    sendStop(x: number, y: number): void {
        if (!this.socket?.connected) return;
        this.socket.emit("player:stop", { x, y });
    }

    get isConnected(): boolean {
        return this.socket?.connected ?? false;
    }

    destroy(): void {
        this.socket?.disconnect();
        this.otherPlayers.forEach((r) => r.destroy());
        this.otherPlayers.clear();
    }

    private spawnOrMove(id: string, x: number, y: number): void {
        let r = this.otherPlayers.get(id);
        if (!r) {
            r = this.scene.add.rectangle(x, y, OTHER_PLAYER.SIZE, OTHER_PLAYER.SIZE, OTHER_PLAYER.COLOR).setDepth(2);
            this.otherPlayers.set(id, r);
        } else {
            r.x = x;
            r.y = y;
        }
    }
}
