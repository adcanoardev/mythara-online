import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTrainer } from "../context/TrainerContext";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatCountdown(seconds: number): string {
    if (seconds <= 0) return "listo";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

function TokenDot({ filled }: { filled: boolean }) {
    return (
        <span
            className={`inline-block w-3.5 h-3.5 rounded-full border transition-all duration-300 ${
                filled ? "bg-yellow border-yellow shadow-[0_0_6px_rgba(255,214,10,0.5)]" : "bg-bg border-border"
            }`}
        />
    );
}

// Borde de la tarjeta según rango — objetos CSS directos
const RANK_BORDER_STYLE: Record<string, React.CSSProperties> = {
    Novato: { border: "1px solid #475569" },
    Aprendiz: { border: "1px solid #22c55e" },
    Explorador: { border: "1px solid #3b82f6" },
    Cazador: { border: "1px solid #f97316" },
    Élite: { border: "1px solid #a855f7" },
    Maestro: { border: "1px solid #eab308" },
    "Gran Maestro": { border: "1px solid #ec4899" },
    Legendario: { border: "2px solid #f43f5e", boxShadow: "0 0 12px rgba(244,63,94,0.4)" },
    Mítico: { border: "2px solid #facc15", boxShadow: "0 0 16px rgba(250,204,21,0.5), 0 0 32px rgba(250,204,21,0.2)" },
};

function getRankBorderStyle(rank: string): React.CSSProperties {
    return RANK_BORDER_STYLE[rank] ?? RANK_BORDER_STYLE["Novato"];
}

const RANK_LABEL_COLOR: Record<string, string> = {
    Novato: "text-slate-400",
    Aprendiz: "text-green-400",
    Explorador: "text-blue-400",
    Cazador: "text-orange-400",
    Élite: "text-purple-400",
    Maestro: "text-yellow-400",
    "Gran Maestro": "text-pink-400",
    Legendario: "text-rose-400",
    Mítico: "text-yellow-300",
};

const AVATAR_EMOJI: Record<string, string> = {
    male_1: "👦",
    male_2: "🧑",
    male_3: "👨",
    male_4: "🧔",
    female_1: "👧",
    female_2: "👩",
    female_3: "🧕",
    female_4: "👱‍♀️",
};

// ─── component ────────────────────────────────────────────────────────────────

export default function TrainerSidebar() {
    const navigate = useNavigate();
    const { trainer, tokens, fragments, reload } = useTrainer();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Auto-reload every 30s + listen for sidebar:reload event
    useEffect(() => {
        intervalRef.current = setInterval(reload, 30_000);
        const handler = () => reload();
        window.addEventListener("sidebar:reload", handler);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            window.removeEventListener("sidebar:reload", handler);
        };
    }, [reload]);

    // ── derived ────────────────────────────────────────────────────────────────

    const npcTokens = tokens?.npcTokens ?? 0;
    const pvpTokens = tokens?.pvpTokens ?? 0;
    const MAX_NPC = 10;
    const MAX_PVP = 5;

    /** Seconds until next NPC token */
    const npcSecondsLeft = (() => {
        if (!tokens?.lastNpcRecharge || npcTokens >= MAX_NPC) return 0;
        const rechargeMs = 30 * 60 * 1000; // 30 min
        const elapsed = Date.now() - new Date(tokens.lastNpcRecharge).getTime();
        const remaining = rechargeMs - (elapsed % rechargeMs);
        return Math.max(0, Math.floor(remaining / 1000));
    })();

    const pvpSecondsLeft = (() => {
        if (!tokens?.lastPvpRecharge || pvpTokens >= MAX_PVP) return 0;
        const rechargeMs = 2 * 60 * 60 * 1000; // 2 h
        const elapsed = Date.now() - new Date(tokens.lastPvpRecharge).getTime();
        const remaining = rechargeMs - (elapsed % rechargeMs);
        return Math.max(0, Math.floor(remaining / 1000));
    })();

    // Live countdown — re-render every second
    const [, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick((n: number) => n + 1), 1_000);
        return () => clearInterval(t);
    }, []);

    // ── handlers ──────────────────────────────────────────────────────────────

    const goNpc = () => navigate("/battle", { state: { mode: "npc" } });
    const goPvp = () => navigate("/battle", { state: { mode: "pvp" } });
    const goFragments = () => navigate("/fragment");
    const goProfile = () => navigate("/profile");
    // ── render ────────────────────────────────────────────────────────────────

    if (!trainer) {
        return (
            <div className="flex flex-col gap-3 py-2 px-1">
                <div className="bg-card border border-slate-700 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-3xl">🧙</span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="h-2 w-20 rounded bg-slate-700 animate-pulse" />
                        <div className="h-2 w-12 rounded bg-slate-700 animate-pulse mt-1" />
                        <div className="h-2 w-16 rounded bg-slate-700 animate-pulse mt-1.5" />
                    </div>
                </div>
                <div className="h-32 rounded-xl bg-card animate-pulse" />
                <div className="h-32 rounded-xl bg-card animate-pulse" />
            </div>
        );
    }

    const rank = trainer?.rank ?? "Novato";
    const rankColor = RANK_LABEL_COLOR[rank] ?? "text-slate-400";

    return (
        <div className="flex flex-col gap-3 py-2 px-1 overflow-y-auto">
            {/* ── Trainer card ─────────────────────────────────────────────────── */}
            <div
                onClick={goProfile}
                className="bg-card rounded-xl px-4 py-3 flex flex-col gap-2 cursor-pointer transition-all hover:brightness-110"
                style={getRankBorderStyle(rank)}
            >
                {/* Avatar + info */}
                <div className="flex items-center gap-3">
                    {/* Avatar placeholder — espacio para foto de perfil futura */}
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <span className="text-3xl leading-none">{AVATAR_EMOJI[trainer?.avatar] ?? "🧙"}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-white font-bold text-sm truncate leading-tight">
                            {trainer?.username ?? "—"}
                        </p>
                        <p className="text-muted text-xs leading-tight">Nv. {trainer?.level ?? "—"}</p>
                        <p className={`text-xs font-semibold leading-tight mt-0.5 ${rankColor}`}>{rank}</p>
                    </div>
                </div>
                {/* Monedas + fragmentos */}
                <div className="flex items-center justify-between">
                    <span className="text-yellow text-xs font-medium">
                        🪙 {trainer?.coins?.toLocaleString() ?? "—"}
                    </span>
                    {fragments > 0 && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                goFragments();
                            }}
                            className="text-xs text-blue hover:text-white transition-colors"
                            title="Abrir fragmentos"
                        >
                            ◈ ×{fragments}
                        </button>
                    )}
                </div>
            </div>

            {/* ── Divider ──────────────────────────────────────────────────────── */}
            <p className="text-muted text-[10px] uppercase tracking-widest px-1 mt-1">Combate</p>

            {/* ── NPC section ──────────────────────────────────────────────────── */}
            <button
                onClick={goNpc}
                className={`
    group w-full bg-card border rounded-xl px-4 py-3 text-left
    transition-all duration-200
    ${
        npcTokens > 0
            ? "border-border hover:border-yellow hover:bg-bg3 cursor-pointer"
            : "border-border opacity-60 hover:border-yellow hover:bg-bg3 cursor-pointer"
    }
  `}
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-xs font-semibold uppercase tracking-wide">vs NPC</span>
                    <span className="text-muted text-xs">
                        {npcTokens}/{MAX_NPC}
                    </span>
                </div>

                {/* Token dots */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {Array.from({ length: MAX_NPC }).map((_, i) => (
                        <TokenDot key={i} filled={i < npcTokens} />
                    ))}
                </div>

                {/* Countdown */}
                {npcTokens < MAX_NPC && (
                    <p className="text-muted text-[11px]">
                        Próxima ficha: <span className="text-blue">{formatCountdown(npcSecondsLeft)}</span>
                    </p>
                )}

                {npcTokens > 0 && (
                    <p className="text-yellow text-[11px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        ▶ Iniciar combate NPC
                    </p>
                )}
            </button>

            {/* ── Visual separator ─────────────────────────────────────────────── */}
            <div className="border-t border-border mx-1" />

            {/* ── PvP section ──────────────────────────────────────────────────── */}
            <button
                onClick={goPvp}
                className={`
    group w-full bg-card border rounded-xl px-4 py-3 text-left
    transition-all duration-200
    ${
        pvpTokens > 0
            ? "border-border hover:border-red hover:bg-bg3 cursor-pointer"
            : "border-border opacity-60 hover:border-red hover:bg-bg3 cursor-pointer"
    }
  `}
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-xs font-semibold uppercase tracking-wide">PvP</span>
                    <span className="text-muted text-xs">
                        {pvpTokens}/{MAX_PVP}
                    </span>
                </div>

                {/* Token dots */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {Array.from({ length: MAX_PVP }).map((_, i) => (
                        <TokenDot key={i} filled={i < pvpTokens} />
                    ))}
                </div>

                {/* Countdown */}
                {pvpTokens < MAX_PVP && (
                    <p className="text-muted text-[11px]">
                        Próxima ficha: <span className="text-blue">{formatCountdown(pvpSecondsLeft)}</span>
                    </p>
                )}

                {pvpTokens > 0 && (
                    <p className="text-red text-[11px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        ⚔ Buscar rival
                    </p>
                )}
            </button>
        </div>
    );
}
