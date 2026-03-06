import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

function TokenDots({ filled, max, color }: { filled: number; max: number; color: string }) {
    return (
        <div className="flex gap-0.5 flex-wrap">
            {Array.from({ length: max }).map((_, i) => (
                <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full transition-all"
                    style={{
                        background: i < filled ? color : "rgba(255,255,255,0.1)",
                        boxShadow: i < filled ? `0 0 4px ${color}` : "none",
                    }}
                />
            ))}
        </div>
    );
}

function msToTime(ms: number) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h${m}m`;
    return `${m}m${s % 60}s`;
}

export default function TrainerSidebar() {
    const { user } = useAuth();
    const [trainer, setTrainer] = useState<any>(null);
    const [tokens, setTokens] = useState<any>(null);

    useEffect(() => {
        Promise.all([api.trainer(), api.tokens()]).then(([t, tk]) => {
            setTrainer(t);
            setTokens(tk);
        });
    }, []);

    const xpForLevel = (lvl: number) => Math.floor(100 * Math.pow(lvl, 1.8));
    const xpPct = trainer ? Math.min(100, Math.round((trainer.xp / xpForLevel(trainer.level)) * 100)) : 0;

    return (
        <div className="flex flex-col gap-2">
            {/* Avatar + nombre */}
            <div className="flex items-center gap-2">
                <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #7b2fff, #4cc9f0)" }}
                >
                    🧢
                </div>
                <div className="min-w-0">
                    <div className="font-display font-bold text-sm truncate">{user?.username}</div>
                    <div className="text-muted text-xs">Nv. {trainer?.level ?? 1}</div>
                </div>
            </div>

            {/* Barra XP */}
            <div>
                <div className="bg-white/5 rounded-full h-1 overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${xpPct}%`, background: "linear-gradient(90deg, #4cc9f0, #7b2fff)" }}
                    />
                </div>
                <div className="flex justify-between text-xs text-muted mt-0.5">
                    <span>{trainer?.xp ?? 0} XP</span>
                    <span>💰 {trainer?.coins ?? 0}</span>
                </div>
            </div>

            {/* Fichas NPC */}
            <div>
                <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs text-muted">⚔️ NPC</span>
                    <span className="font-display font-bold text-yellow text-xs">{tokens?.npcTokens ?? 0}/10</span>
                </div>
                <TokenDots filled={tokens?.npcTokens ?? 0} max={10} color="#ffd60a" />
                {tokens?.nextNpcRechargeMs && (
                    <div className="text-xs text-muted mt-0.5">+1 en {msToTime(tokens.nextNpcRechargeMs)}</div>
                )}
            </div>

            {/* Tokens PvP */}
            <div>
                <div className="flex justify-between items-center mb-0.5">
                    <span className="text-xs text-muted">🔴 PvP</span>
                    <span className="font-display font-bold text-red text-xs">{tokens?.pvpTokens ?? 0}/5</span>
                </div>
                <TokenDots filled={tokens?.pvpTokens ?? 0} max={5} color="#e63946" />
                {tokens?.nextPvpRechargeMs && (
                    <div className="text-xs text-muted mt-0.5">+1 en {msToTime(tokens.nextPvpRechargeMs)}</div>
                )}
            </div>
        </div>
    );
}
