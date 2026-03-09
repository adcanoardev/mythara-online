import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

type Rarity = "COMMON" | "RARE" | "ELITE" | "LEGENDARY" | "MYTHIC";

interface FragmentResult {
    rarity: Rarity;
    creature: {
        instanceId: string;
        speciesId: string;
        name: string;
        art: { portrait: string; front: string; back: string };
        affinities: string[];
        rarity: Rarity;
        level: number;
        maxHp: number;
        attack: number;
        defense: number;
        speed: number;
    };
}

const RARITY_CONFIG: Record<Rarity, { label: string; color: string; glow: string; border: string; particle: string }> =
    {
        COMMON: {
            label: "COMÚN",
            color: "text-gray-300",
            glow: "shadow-[0_0_30px_rgba(156,163,175,0.4)]",
            border: "border-gray-500",
            particle: "#9ca3af",
        },
        RARE: {
            label: "RARA",
            color: "text-blue-400",
            glow: "shadow-[0_0_40px_rgba(76,201,240,0.6)]",
            border: "border-blue-400",
            particle: "#4cc9f0",
        },
        ELITE: {
            label: "ÉLITE",
            color: "text-yellow",
            glow: "shadow-[0_0_50px_rgba(255,214,10,0.7)]",
            border: "border-yellow",
            particle: "#ffd60a",
        },
        LEGENDARY: {
            label: "LEGENDARIA",
            color: "text-red",
            glow: "shadow-[0_0_70px_rgba(230,57,70,0.9)]",
            border: "border-red",
            particle: "#e63946",
        },
        MYTHIC: {
            label: "MÍTICA",
            color: "text-purple-400",
            glow: "shadow-[0_0_80px_rgba(167,139,250,1)]",
            border: "border-purple-400",
            particle: "#a78bfa",
        },
    };

const AFFINITY_COLORS: Record<string, string> = {
    EMBER: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    TIDE: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    GROVE: "bg-green-500/20 text-green-400 border-green-500/40",
    VOLT: "bg-yellow-400/20 text-yellow-300 border-yellow-400/40",
    STONE: "bg-stone-500/20 text-stone-300 border-stone-500/40",
    FROST: "bg-cyan-400/20 text-cyan-300 border-cyan-400/40",
    VENOM: "bg-purple-600/20 text-purple-400 border-purple-600/40",
    ASTRAL: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
    IRON: "bg-gray-400/20 text-gray-300 border-gray-400/40",
    SHADE: "bg-gray-800/40 text-gray-400 border-gray-700/60",
};

type Phase = "idle" | "shaking" | "opening" | "revealed" | "empty";

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function FragmentPage() {
    const navigate = useNavigate();
    const [fragmentCount, setFragmentCount] = useState<number | null>(null);
    const [phase, setPhase] = useState<Phase>("idle");
    const [result, setResult] = useState<FragmentResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [particles, setParticles] = useState<{ id: number; x: number; y: number; angle: number; dist: number }[]>([]);

    useEffect(() => {
        loadFragmentCount();
    }, []);

    async function loadFragmentCount() {
        try {
            const inv = await api.inventory();
            const frag = (inv as any[]).find((i: any) => i.item === "FRAGMENT");
            const count = frag?.quantity ?? 0;
            setFragmentCount(count);
            if (count === 0) setPhase("empty");
        } catch {
            setFragmentCount(0);
            setPhase("empty");
        }
    }

    async function handleOpen() {
        if (phase !== "idle" || fragmentCount === 0) return;
        setPhase("shaking");
        await delay(700);
        setPhase("opening");
        try {
            const data = (await api.forgeOpen()) as FragmentResult;
            await delay(600);
            setResult(data);
            spawnParticles(data.rarity);
            await delay(400);
            setPhase("revealed");
        } catch (err: any) {
            setError(err?.message ?? "Error al abrir fragmento");
            setPhase("idle");
        }
    }

    function spawnParticles(rarity: Rarity) {
        const count = rarity === "LEGENDARY" ? 24 : rarity === "ELITE" ? 18 : 12;
        const ps = Array.from({ length: count }, (_, i) => ({
            id: i,
            x: 50 + (Math.random() - 0.5) * 10,
            y: 50 + (Math.random() - 0.5) * 10,
            angle: (360 / count) * i + Math.random() * 20 - 10,
            dist: 80 + Math.random() * 80,
        }));
        setParticles(ps);
        setTimeout(() => setParticles([]), 1200);
    }

    function handleClose() {
        navigate("/")
    }

    function handleOpenAnother() {
        setResult(null);
        setFragmentCount((c) => (c !== null ? c - 1 : 0));
        setPhase(fragmentCount! > 1 ? "idle" : "empty");
    }

    const rarityConfig = result ? RARITY_CONFIG[result.rarity] : null;

    return (
        <div className="h-screen w-screen overflow-hidden bg-bg flex flex-col items-center justify-center relative select-none">
            {/* Fondo hexagonal */}
            <div
                className="absolute inset-0 opacity-5"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='52' viewBox='0 0 60 52'%3E%3Cpolygon points='30,2 58,17 58,35 30,50 2,35 2,17' fill='none' stroke='%234cc9f0' stroke-width='1'/%3E%3C/svg%3E")`,
                    backgroundSize: "60px 52px",
                }}
            />

            {/* Header */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 z-10">
                <button
                    onClick={handleClose}
                    className="flex items-center gap-2 text-muted hover:text-white transition-colors text-sm font-medium"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Posada
                </button>
                <h1
                    className="text-white font-bold tracking-widest text-sm uppercase"
                    style={{ fontFamily: "'Rajdhani', sans-serif", letterSpacing: "0.2em" }}
                >
                    Fragmentos
                </h1>
                <div className="text-muted text-sm">
                    {fragmentCount !== null && (
                        <span className="flex items-center gap-1.5">
                            <span className="text-blue text-base">◈</span>
                            <span>{fragmentCount} disponibles</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red/20 border border-red/40 text-red text-sm px-4 py-2 rounded-lg z-20">
                    {error}
                </div>
            )}

            {/* Zona central */}
            <div className="flex flex-col items-center gap-8 z-10">
                {/* Sin fragmentos */}
                {phase === "empty" && !result && (
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className="text-6xl opacity-30">◈</div>
                        <p className="text-muted text-lg">No tienes fragmentos</p>
                        <p className="text-muted/60 text-sm max-w-xs">
                            Recoge la Forja de Fragmentos en tu Posada cada 6 horas para conseguir más.
                        </p>
                        <button
                            onClick={handleClose}
                            className="mt-4 px-6 py-2 border border-border text-muted hover:text-white hover:border-white/30 rounded-lg transition-colors text-sm"
                        >
                            Volver a la Posada
                        </button>
                    </div>
                )}

                {/* Idle / Shaking */}
                {(phase === "idle" || phase === "shaking") && !result && (
                    <div className="flex flex-col items-center gap-10">
                        <div
                            className="relative cursor-pointer"
                            onClick={handleOpen}
                            style={{ animation: phase === "shaking" ? "shake 0.1s ease-in-out infinite" : undefined }}
                        >
                            <div
                                className="absolute inset-0 rounded-2xl blur-xl"
                                style={{
                                    background: "radial-gradient(ellipse, rgba(76,201,240,0.25) 0%, transparent 70%)",
                                    transform: "scale(1.4)",
                                }}
                            />
                            <div
                                className="relative w-48 h-64 rounded-2xl border border-blue/30 bg-card flex flex-col items-center justify-center gap-4 overflow-hidden"
                                style={{
                                    boxShadow:
                                        phase === "shaking"
                                            ? "0 0 40px rgba(76,201,240,0.5), inset 0 0 20px rgba(76,201,240,0.1)"
                                            : "0 0 20px rgba(76,201,240,0.2), inset 0 0 10px rgba(76,201,240,0.05)",
                                    transition: "box-shadow 0.3s",
                                }}
                            >
                                <div
                                    className="absolute inset-0 opacity-10"
                                    style={{
                                        background:
                                            "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(76,201,240,0.3) 8px, rgba(76,201,240,0.3) 9px)",
                                    }}
                                />
                                <span className="text-6xl relative z-10">◈</span>
                                <span
                                    className="text-blue text-xs tracking-widest uppercase relative z-10 font-semibold"
                                    style={{ fontFamily: "'Rajdhani', sans-serif" }}
                                >
                                    Fragmento
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={handleOpen}
                            disabled={phase === "shaking"}
                            className="px-10 py-3 rounded-xl font-bold tracking-wider text-sm uppercase transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                fontFamily: "'Rajdhani', sans-serif",
                                background: "linear-gradient(135deg, #4cc9f0 0%, #7b2fff 100%)",
                                boxShadow: phase === "shaking" ? "0 0 30px rgba(76,201,240,0.6)" : "none",
                                letterSpacing: "0.15em",
                            }}
                        >
                            {phase === "shaking" ? "Abriendo…" : "Abrir Fragmento"}
                        </button>
                    </div>
                )}

                {/* Opening — flip */}
                {phase === "opening" && (
                    <div
                        className="w-48 h-64 rounded-2xl border border-blue/30 bg-card flex items-center justify-center"
                        style={{
                            animation: "cardFlip 1s ease-in-out forwards",
                            boxShadow: "0 0 40px rgba(76,201,240,0.4)",
                        }}
                    >
                        <span className="text-4xl animate-pulse">✦</span>
                    </div>
                )}

                {/* Revealed */}
                {phase === "revealed" && result && rarityConfig && (
                    <div
                        className="flex flex-col items-center gap-6"
                        style={{ animation: "revealFade 0.5s ease-out forwards" }}
                    >
                        {/* Partículas */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {particles.map((p) => (
                                <div
                                    key={p.id}
                                    className="absolute w-2 h-2 rounded-full"
                                    style={
                                        {
                                            left: `${p.x}%`,
                                            top: `${p.y}%`,
                                            backgroundColor: rarityConfig.particle,
                                            boxShadow: `0 0 6px ${rarityConfig.particle}`,
                                            animation: `particleBurst 1.2s ease-out forwards`,
                                            animationDelay: `${p.id * 20}ms`,
                                            "--angle": `${p.angle}deg`,
                                            "--dist": `${p.dist}px`,
                                        } as any
                                    }
                                />
                            ))}
                        </div>

                        {/* Badge rareza */}
                        <div
                            className={`px-4 py-1 rounded-full border text-xs font-bold tracking-widest uppercase ${rarityConfig.color} ${rarityConfig.border}`}
                            style={{
                                fontFamily: "'Rajdhani', sans-serif",
                                animation: "badgePop 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.1s both",
                            }}
                        >
                            {rarityConfig.label}
                        </div>

                        {/* Card criatura */}
                        <div
                            className={`relative w-52 h-72 rounded-2xl border-2 bg-card flex flex-col items-center justify-center gap-3 overflow-hidden ${rarityConfig.border} ${rarityConfig.glow}`}
                            style={{ animation: "cardReveal 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.2s both" }}
                        >
                            <div
                                className="absolute inset-0 opacity-10"
                                style={{
                                    background: `radial-gradient(ellipse at 50% 30%, ${rarityConfig.particle} 0%, transparent 70%)`,
                                }}
                            />
                            <div className="relative z-10 text-7xl leading-none">{result.creature.art.front}</div>
                            <p
                                className="relative z-10 text-white font-bold text-lg text-center leading-tight"
                                style={{ fontFamily: "'Rajdhani', sans-serif" }}
                            >
                                {result.creature.name}
                            </p>
                            <p className="relative z-10 text-muted text-xs">Nivel {result.creature.level}</p>
                            <div className="relative z-10 flex gap-1.5 flex-wrap justify-center px-3">
                                {result.creature.affinities.map((aff) => (
                                    <span
                                        key={aff}
                                        className={`px-2 py-0.5 rounded border text-xs font-medium ${AFFINITY_COLORS[aff] ?? "bg-gray-700 text-gray-300 border-gray-600"}`}
                                    >
                                        {aff}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="flex gap-4 text-xs text-muted">
                            <span>
                                HP <span className="text-white font-semibold">{result.creature.maxHp}</span>
                            </span>
                            <span>
                                ATQ <span className="text-white font-semibold">{result.creature.attack}</span>
                            </span>
                            <span>
                                DEF <span className="text-white font-semibold">{result.creature.defense}</span>
                            </span>
                            <span>
                                VEL <span className="text-white font-semibold">{result.creature.speed}</span>
                            </span>
                        </div>

                        <p className="text-muted/70 text-xs text-center">Enviado al almacén automáticamente</p>

                        {/* Botones */}
                        <div className="flex gap-3 mt-1">
                            {fragmentCount !== null && fragmentCount > 1 && (
                                <button
                                    onClick={handleOpenAnother}
                                    className="px-5 py-2 rounded-xl text-sm font-semibold border border-blue/40 text-blue hover:bg-blue/10 transition-colors"
                                    style={{ fontFamily: "'Rajdhani', sans-serif" }}
                                >
                                    Abrir otro ({fragmentCount - 1} restantes)
                                </button>
                            )}
                            <button
                                onClick={handleClose}
                                className="px-6 py-2 rounded-xl text-sm font-bold text-white transition-all"
                                style={{
                                    fontFamily: "'Rajdhani', sans-serif",
                                    background: "linear-gradient(135deg, #4cc9f0 0%, #7b2fff 100%)",
                                }}
                            >
                                Ir a la Posada
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          20% { transform: translateX(-4px) rotate(-1.5deg); }
          40% { transform: translateX(4px) rotate(1.5deg); }
          60% { transform: translateX(-3px) rotate(-1deg); }
          80% { transform: translateX(3px) rotate(1deg); }
        }
        @keyframes cardFlip {
          0%   { transform: rotateY(0deg) scale(1); }
          50%  { transform: rotateY(90deg) scale(1.05); filter: brightness(2); }
          100% { transform: rotateY(0deg) scale(1); }
        }
        @keyframes revealFade {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cardReveal {
          from { opacity: 0; transform: scale(0.7) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes badgePop {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes particleBurst {
          0%   { opacity: 1; transform: translate(0, 0) scale(1); }
          100% {
            opacity: 0;
            transform: translate(
              calc(cos(var(--angle)) * var(--dist)),
              calc(sin(var(--angle)) * var(--dist))
            ) scale(0);
          }
        }
      `}</style>
        </div>
    );
}
