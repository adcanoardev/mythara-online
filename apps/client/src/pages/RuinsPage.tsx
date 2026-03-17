// apps/client/src/pages/RuinsPage.tsx
import { useNavigate } from "react-router-dom";
import { useTrainer } from "../context/TrainerContext";

// ─── Zone config ──────────────────────────────────────────────────────────────
interface Zone {
    id: string;
    icon: string;
    name: string;
    subtitle: string;
    description: string;
    status: "active" | "locked";
    accent: string;
    accentDim: string;
    route?: string;
}

const ZONES: Zone[] = [
    {
        id: "sanctuaries",
        icon: "🏛️",
        name: "Sanctuaries",
        subtitle: "8 elemental challenges",
        description: "Three 1v1 rounds per run. Bring 5 Myths, max 2 swaps. No healing between rounds.",
        status: "active",
        accent: "#a78bfa",
        accentDim: "rgba(167,139,250,0.15)",
        route: "/sanctuaries",
    },
    {
        id: "death-tower",
        icon: "💀",
        name: "Death Tower",
        subtitle: "Survival gauntlet",
        description: "Climb an endless tower of increasingly brutal encounters. How far can you go?",
        status: "locked",
        accent: "#f87171",
        accentDim: "rgba(248,113,113,0.1)",
    },
    {
        id: "clan-boss",
        icon: "👹",
        name: "Clan Boss",
        subtitle: "Weekly co-op raid",
        description: "A colossal Myth awakens once a week. Team up with other Binders to bring it down.",
        status: "locked",
        accent: "#fb923c",
        accentDim: "rgba(251,146,60,0.1)",
    },
];

// ─── RuinsPage ────────────────────────────────────────────────────────────────
export default function RuinsPage() {
    const navigate = useNavigate();
    const { tokens } = useTrainer();
    const tok = tokens as any;
    const pveCount = tok?.npcTokens ?? 0;
    const pveMax   = tok?.npcMax    ?? 10;

    return (
        <div
            className="fixed inset-0 flex flex-col"
            style={{ background: "#070b14", fontFamily: "'Exo 2', sans-serif" }}
        >
            {/* ── Top bar ── */}
            <div
                className="flex-shrink-0 flex items-center justify-between px-4 md:px-6"
                style={{
                    height: 48,
                    background: "rgba(4,8,15,0.97)",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
            >
                {/* Back */}
                <button
                    onClick={() => navigate("/")}
                    className="flex items-center gap-2 transition-opacity hover:opacity-70 active:scale-95"
                    style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, fontFamily: "monospace" }}
                >
                    <span style={{ fontSize: 10 }}>◀</span>
                    <span className="hidden sm:inline tracking-widest uppercase" style={{ fontSize: 10 }}>City</span>
                </button>

                {/* Title */}
                <div className="flex flex-col items-center">
                    <span
                        className="tracking-[0.25em] uppercase font-black"
                        style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 15, color: "#e2e8f0", letterSpacing: "0.2em" }}
                    >
                        The Ruins
                    </span>
                    <span className="tracking-widest uppercase" style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>
                        PvE — Exploration
                    </span>
                </div>

                {/* PvE token counter */}
                <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(14,165,233,0.1)", border: "1px solid rgba(14,165,233,0.2)" }}
                >
                    <span className="font-mono font-bold tabular-nums" style={{ fontSize: 11, color: "#7dd3fc" }}>
                        {pveCount}<span style={{ opacity: 0.4 }}>/{pveMax}</span>
                    </span>
                    <span style={{ fontSize: 12 }}>⚡</span>
                </div>
            </div>

            {/* ── Background atmosphere ── */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {/* Vignette */}
                <div className="absolute inset-0" style={{
                    background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(88,28,135,0.08) 0%, transparent 70%)",
                }} />
                {/* Bottom fade */}
                <div className="absolute bottom-0 left-0 right-0 h-40" style={{
                    background: "linear-gradient(0deg, rgba(7,11,20,0.9) 0%, transparent 100%)",
                }} />
                {/* Floating rune particles */}
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full"
                        style={{
                            width: 2, height: 2,
                            background: "#a78bfa",
                            boxShadow: "0 0 6px #a78bfa",
                            left: `${15 + i * 14}%`,
                            top: `${20 + (i % 3) * 20}%`,
                            animation: `nurseryXP ${2.5 + i * 0.4}s ease-in-out infinite ${i * 0.6}s`,
                            opacity: 0.6,
                        }}
                    />
                ))}
            </div>

            {/* ── Content ── */}
            <div className="relative flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-6 overflow-y-auto">

                {/* Sub-header */}
                <p
                    className="text-center mb-8 md:mb-10 tracking-wide"
                    style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, fontFamily: "monospace" }}
                >
                    Choose your challenge
                </p>

                {/* Zone cards */}
                <div className="w-full max-w-lg flex flex-col gap-3 md:gap-4">
                    {ZONES.map((zone) => (
                        <ZoneCard key={zone.id} zone={zone} pveTokens={pveCount} onNavigate={navigate} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── ZoneCard ─────────────────────────────────────────────────────────────────
function ZoneCard({
    zone,
    pveTokens,
    onNavigate,
}: {
    zone: Zone;
    pveTokens: number;
    onNavigate: (path: string) => void;
}) {
    const isLocked = zone.status === "locked";
    const noTokens = !isLocked && pveTokens <= 0;
    const disabled = isLocked || noTokens;

    function handleClick() {
        if (disabled) return;
        if (zone.route) onNavigate(zone.route);
    }

    return (
        <div
            onClick={!disabled ? handleClick : undefined}
            className="relative rounded-2xl overflow-hidden transition-all duration-200"
            style={{
                background: isLocked
                    ? "rgba(255,255,255,0.02)"
                    : zone.accentDim,
                border: isLocked
                    ? "1px solid rgba(255,255,255,0.06)"
                    : `1px solid ${zone.accent}40`,
                boxShadow: isLocked
                    ? "none"
                    : `0 0 24px ${zone.accent}12`,
                cursor: disabled ? "default" : "pointer",
                opacity: isLocked ? 0.55 : 1,
            }}
        >
            {/* Hover shimmer — active only */}
            {!isLocked && (
                <div
                    className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                    style={{ background: `linear-gradient(135deg, ${zone.accent}08 0%, transparent 60%)` }}
                />
            )}

            <div className="relative flex items-center gap-4 px-4 md:px-5 py-4 md:py-5">
                {/* Icon */}
                <div
                    className="flex-shrink-0 flex items-center justify-center rounded-2xl text-2xl md:text-3xl"
                    style={{
                        width: 52, height: 52,
                        background: isLocked ? "rgba(255,255,255,0.04)" : `${zone.accent}18`,
                        border: `1px solid ${isLocked ? "rgba(255,255,255,0.08)" : zone.accent + "35"}`,
                        filter: isLocked ? "grayscale(0.6)" : "none",
                    }}
                >
                    {isLocked ? "🔒" : zone.icon}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <p
                            className="font-black tracking-wide"
                            style={{
                                fontFamily: "'Rajdhani', sans-serif",
                                fontSize: 16,
                                color: isLocked ? "rgba(255,255,255,0.3)" : "#e2e8f0",
                            }}
                        >
                            {zone.name}
                        </p>
                        {isLocked && (
                            <span
                                className="text-[9px] font-mono px-1.5 py-0.5 rounded-md tracking-widest"
                                style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.08)" }}
                            >
                                COMING SOON
                            </span>
                        )}
                        {noTokens && !isLocked && (
                            <span
                                className="text-[9px] font-mono px-1.5 py-0.5 rounded-md tracking-widest"
                                style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}
                            >
                                NO TOKENS
                            </span>
                        )}
                    </div>
                    <p
                        className="text-[11px] font-mono mb-1.5"
                        style={{ color: isLocked ? "rgba(255,255,255,0.18)" : zone.accent, opacity: isLocked ? 1 : 0.85 }}
                    >
                        {zone.subtitle}
                    </p>
                    <p
                        className="text-[11px] leading-relaxed"
                        style={{ color: "rgba(255,255,255,0.35)" }}
                    >
                        {zone.description}
                    </p>
                </div>

                {/* Arrow — active only */}
                {!isLocked && (
                    <div
                        className="flex-shrink-0 flex items-center justify-center rounded-full"
                        style={{
                            width: 28, height: 28,
                            background: `${zone.accent}18`,
                            border: `1px solid ${zone.accent}35`,
                            color: zone.accent,
                            fontSize: 11,
                        }}
                    >
                        ▶
                    </div>
                )}
            </div>
        </div>
    );
}
