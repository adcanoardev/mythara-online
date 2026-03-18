// apps/client/src/pages/RankingPage.tsx
import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { useTrainer } from "../context/TrainerContext";
import PageShell from "../components/PageShell";
import PageTopbar from "../components/PageTopbar";

const RANK_COLORS: Record<string, string> = {
    Champion: "#fbbf24",
    Elite:    "#a78bfa",
    Rival:    "#f87171",
    Trainer:  "#67e8f9",
    Novice:   "#e2e8f0",
};

export default function RankingPage() {
    const { user }                 = useAuth();
    const { guildTag: myGuildTag } = useTrainer();
    const [data, setData]          = useState<any>(null);

    useEffect(() => { api.ranking().then(setData); }, []);

    const top3  = data?.ranking?.slice(0, 3) ?? [];
    const rest  = data?.ranking?.slice(3)    ?? [];
    const myPos = data?.myPosition;

    return (
        <PageShell ambientColor="rgba(251,191,36,0.05)">
            <PageTopbar
                title="Ranking"
                right={myPos ? (
                    <span
                        className="font-mono text-xs px-2 py-0.5 rounded-lg"
                        style={{
                            background: "rgba(251,191,36,0.08)",
                            border: "1px solid rgba(251,191,36,0.2)",
                            color: "#fbbf24",
                        }}
                    >
                        #{myPos}
                    </span>
                ) : undefined}
            />

            <div className="relative flex-1 flex gap-4 p-4 md:p-6 overflow-hidden min-h-0">

                {/* ── Podium top 3 ── */}
                <div
                    className="flex-shrink-0 flex flex-col gap-3 overflow-y-auto"
                    style={{ width: 192, scrollbarWidth: "none" }}
                >
                    {[top3[0], top3[1], top3[2]].map((trainer: any, i: number) => {
                        if (!trainer) return null;
                        const medals = ["🥇", "🥈", "🥉"];
                        const rColor = RANK_COLORS[trainer.rank] ?? "#e2e8f0";
                        return (
                            <div
                                key={trainer.userId}
                                className="rounded-2xl p-4 text-center"
                                style={{
                                    background: "rgba(255,255,255,0.03)",
                                    border: `1px solid ${i === 0 ? "rgba(251,191,36,0.3)" : "rgba(255,255,255,0.07)"}`,
                                    boxShadow: i === 0 ? "0 0 16px rgba(251,191,36,0.08)" : "none",
                                }}
                            >
                                <div style={{ fontSize: 28, marginBottom: 4 }}>{medals[i]}</div>
                                <div className="font-bold text-sm" style={{ color: "#e2e8f0" }}>
                                    {trainer.guildTag && (
                                        <span style={{ color: "#7b2fff", marginRight: 3, fontWeight: 900, fontSize: "var(--font-xs)", letterSpacing: ".08em" }}>
                                            [{trainer.guildTag}]
                                        </span>
                                    )}
                                    {trainer.username}
                                </div>
                                <div className="font-black text-xl mt-1" style={{ color: rColor, fontFamily: "'Rajdhani',sans-serif" }}>
                                    {trainer.prestige}
                                </div>
                                <div className="text-xs" style={{ color: rColor }}>{trainer.rank}</div>
                            </div>
                        );
                    })}
                </div>

                {/* ── List ── */}
                <div
                    className="flex-1 flex flex-col rounded-2xl overflow-hidden min-w-0"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                    {/* Header row */}
                    <div
                        className="flex-shrink-0 grid px-4 py-2.5 border-b"
                        style={{
                            gridTemplateColumns: "40px 1fr 60px 80px",
                            gap: 12,
                            borderColor: "rgba(255,255,255,0.06)",
                            fontSize: "var(--font-xs)",
                            fontFamily: "monospace",
                            color: "#8892a4",
                            letterSpacing: "0.1em",
                        }}
                    >
                        <span>#</span>
                        <span>Trainer</span>
                        <span>Lv.</span>
                        <span>Prestige</span>
                    </div>

                    {/* Rows */}
                    <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
                        {rest.map((trainer: any) => {
                            const isMe   = trainer.username === user?.username;
                            const rColor = RANK_COLORS[trainer.rank] ?? "#e2e8f0";
                            return (
                                <div
                                    key={trainer.userId}
                                    className="grid px-4 py-3 border-b"
                                    style={{
                                        gridTemplateColumns: "40px 1fr 60px 80px",
                                        gap: 12,
                                        borderColor: "rgba(255,255,255,0.04)",
                                        background: isMe ? "rgba(251,191,36,0.04)" : "transparent",
                                    }}
                                >
                                    <span
                                        className="font-mono text-sm"
                                        style={{ color: isMe ? "#fbbf24" : "rgba(255,255,255,0.35)" }}
                                    >
                                        {trainer.position}
                                    </span>

                                    <div className="flex items-center gap-2 min-w-0">
                                        {trainer.guildTag && (
                                            <span
                                                className="font-mono flex-shrink-0"
                                                style={{ fontSize: "var(--font-xs)", color: "#7b2fff", fontWeight: 900, letterSpacing: ".08em" }}
                                            >
                                                [{trainer.guildTag}]
                                            </span>
                                        )}
                                        <span
                                            className="font-semibold text-sm truncate"
                                            style={{ color: "#e2e8f0" }}
                                        >
                                            {trainer.username}
                                        </span>
                                        {isMe && (
                                            <span className="text-xs flex-shrink-0" style={{ color: "#fbbf24" }}>
                                                (you)
                                            </span>
                                        )}
                                    </div>

                                    <span className="text-sm" style={{ color: "#a8b5c8" }}>
                                        {trainer.level}
                                    </span>

                                    <div>
                                        <div
                                            className="font-black text-sm"
                                            style={{ fontFamily: "'Rajdhani',sans-serif", color: rColor }}
                                        >
                                            {trainer.prestige}
                                        </div>
                                        <div className="text-xs" style={{ color: rColor }}>
                                            {trainer.rank}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </PageShell>
    );
}
