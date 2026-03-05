import Phaser from "phaser";
import { login, register, saveToken } from "../utils/api";

export class AuthScene extends Phaser.Scene {
    private statusText!: Phaser.GameObjects.Text;
    private modeText!: Phaser.GameObjects.Text;
    private mode: "login" | "register" = "login";

    private usernameInput!: HTMLInputElement;
    private emailInput!: HTMLInputElement;
    private passwordInput!: HTMLInputElement;

    constructor() {
        super({ key: "AuthScene" });
    }

    create() {
        const cx = 400;

        this.add.text(cx, 60, "⚔️ poke-mmo", { fontSize: "32px" }).setOrigin(0.5);

        this.modeText = this.add
            .text(cx, 130, "→ Modo: Iniciar sesión", { fontSize: "13px", color: "#aaaaaa" })
            .setOrigin(0.5);

        this.statusText = this.add.text(cx, 420, "", { fontSize: "14px", color: "#ff4444" }).setOrigin(0.5);

        this.usernameInput = this.createInput("username", "Usuario", 180);
        this.emailInput = this.createInput("email", "Email", 240);
        this.passwordInput = this.createInput("password", "Contraseña", 300, "password");

        // Email oculto hasta que se active modo registro
        this.emailInput.style.display = "none";

        this.createButton(cx - 90, 360, "Iniciar sesión", () => void this.handleLogin());
        this.createButton(cx + 90, 360, "Registrarse", () => void this.handleRegisterClick());
    }

    shutdown() {
        [this.usernameInput, this.emailInput, this.passwordInput].forEach((i) => i.remove());
    }

    // ── Handlers ──────────────────────────────────────────────

    private async handleLogin() {
        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value.trim();
        if (!username || !password) return this.setStatus("Rellena todos los campos");

        this.setStatus("Conectando...");
        try {
            const { token } = await login(username, password);
            saveToken(token);
            this.cleanup();
            this.scene.start("MainScene");
        } catch (e) {
            this.setStatus(e instanceof Error ? e.message : "Error al iniciar sesión");
        }
    }

    private async handleRegisterClick() {
        // Primera pulsación: cambia a modo registro y muestra email
        if (this.mode === "login") {
            this.mode = "register";
            this.emailInput.style.display = "block";
            this.modeText.setText("→ Modo: Registro — rellena email y pulsa Registrarse de nuevo");
            this.setStatus("");
            return;
        }

        // Segunda pulsación: ejecuta el registro
        const username = this.usernameInput.value.trim();
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value.trim();
        if (!username || !email || !password) return this.setStatus("Rellena todos los campos");

        this.setStatus("Creando cuenta...");
        try {
            const { token } = await register(username, email, password);
            saveToken(token);
            this.cleanup();
            this.scene.start("MainScene");
        } catch (e) {
            this.setStatus(e instanceof Error ? e.message : "Error al registrarse");
        }
    }

    // ── UI helpers ────────────────────────────────────────────

    private createInput(name: string, placeholder: string, y: number, type = "text"): HTMLInputElement {
        const input = document.createElement("input");
        input.type = type;
        input.placeholder = placeholder;
        input.name = name;
        input.style.cssText = `
            position: absolute;
            left: 50%;
            top: ${y}px;
            transform: translateX(-50%);
            width: 260px;
            padding: 8px 12px;
            background: #1a1a2e;
            border: 1px solid #444;
            border-radius: 6px;
            color: #fff;
            font-size: 14px;
            outline: none;
            z-index: 10;
        `;

        const parent = this.game.canvas.parentElement!;
        parent.style.position = "relative";
        parent.appendChild(input);
        return input;
    }

    private createButton(x: number, y: number, label: string, onClick: () => void) {
        const btn = this.add
            .text(x, y, label, {
                fontSize: "15px",
                backgroundColor: "#2a5298",
                padding: { x: 14, y: 8 },
                color: "#ffffff",
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true })
            .on("pointerover", () => btn.setStyle({ backgroundColor: "#3a62a8" }))
            .on("pointerout", () => btn.setStyle({ backgroundColor: "#2a5298" }))
            .on("pointerdown", onClick);

        return btn;
    }

    private setStatus(msg: string) {
        this.statusText.setText(msg);
    }

    private cleanup() {
        [this.usernameInput, this.emailInput, this.passwordInput].forEach((i) => i.remove());
    }
}
