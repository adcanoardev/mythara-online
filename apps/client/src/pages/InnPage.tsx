import { useNavigate } from "react-router-dom";
// apps/client/src/pages/InnPage.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api";

// ─── CDN image URLs ───────────────────────────────────────────────────────────
const INN_IMAGES = {
    mine:    "https://raw.githubusercontent.com/adcanoardev/mythara-assets/refs/heads/main/tavern/mina.avif",
    forge:   "https://raw.githubusercontent.com/adcanoardev/mythara-assets/refs/heads/main/tavern/forja.avif",
    lab:     "https://raw.githubusercontent.com/adcanoardev/mythara-assets/refs/heads/main/tavern/laboratorio.avif",
    nursery: "https://raw.githubusercontent.com/adcanoardev/mythara-assets/refs/heads/main/tavern/guarderia.avif",
};

// ─── Lab items ────────────────────────────────────────────────────────────────
const LAB_ITEMS = [
    { id: "elixir",       icon: "⚗️", name: "Elixir",       desc: "Instantly restores a Myth's HP to full.",                                       color: "#4cc9f0" },
    { id: "turbo_elixir", icon: "💠", name: "Turbo Elixir", desc: "Doubles nursery training speed for 1 hour.",                                     color: "#7b2fff" },
    { id: "antidote",     icon: "🧪", name: "Antidote",     desc: "Cures status effects (poison, burn, paralysis).",                                color: "#06d6a0" },
    { id: "boost_atk",    icon: "🔥", name: "ATK Boost",    desc: "Increases a Myth's ATK by 20% for the next battle.",                            color: "#f97316" },
    { id: "boost_def",    icon: "🛡️", name: "DEF Boost",    desc: "Increases a Myth's DEF by 20% for the next battle.",                            color: "#3b82f6" },
    { id: "mega_elixir",  icon: "✨", name: "Mega Elixir",  desc: "Restores the entire team to 100% HP.",                                          color: "#fcd34d" },
];

// ─── Fragment rarity rates ────────────────────────────────────────────────────
const FRAGMENT_RATES = [
    { rarity: "COMMON",    pct: "92.00%", color: "#F7FFFB", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.25)" },
    { rarity: "RARE",      pct: "7.00%",  color: "#38bdf8", bg: "rgba(56,189,248,0.08)",  border: "rgba(56,189,248,0.3)"  },
    { rarity: "ELITE",     pct: "0.80%",  color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.3)" },
    { rarity: "LEGENDARY", pct: "0.19%",  color: "#fcd34d", bg: "rgba(252,211,77,0.08)",  border: "rgba(252,211,77,0.3)"  },
    { rarity: "MYTHIC",    pct: "0.01%",  color: "#f472b6", bg: "rgba(244,114,182,0.08)", border: "rgba(244,114,182,0.3)" },
];

// ─── Cooldown tables (mirrors backend) ───────────────────────────────────────
const MINE_COOLDOWN_MS:  Record<number, number> = { 1: 4*3600*1000, 2: 3*3600*1000, 3: 2*3600*1000, 4: 90*60*1000,   5: 3600*1000   };
const FORGE_COOLDOWN_MS: Record<number, number> = { 1: 6*3600*1000, 2: 5*3600*1000, 3: 4*3600*1000, 4: 3*3600*1000,  5: 2*3600*1000 };
const LAB_COOLDOWN_MS:   Record<number, number> = { 1: 8*3600*1000, 2: 7*3600*1000, 3: 6*3600*1000, 4: 5*3600*1000,  5: 4*3600*1000 };

// ─── Utilities ────────────────────────────────────────────────────────────────
function msToTime(ms: number): string {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
    if (m > 0) return `${m}m ${sec.toString().padStart(2, "0")}s`;
    return `${sec}s`;
}

function mythArtUrl(myth: any): string {
    if (!myth?.art) return "❓";
    if (typeof myth.art === "string") return myth.art;
    return myth.art.front ?? myth.art.portrait ?? "❓";
}

// ─── useCountdown — restarts whenever serverMs changes ───────────────────────
function useCountdown(serverMs: number | null): number {
    const [remaining, setRemaining] = useState<number>(0);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (serverMs === null || serverMs === undefined) return;
        setRemaining(serverMs);
        if (serverMs <= 0) return;
        intervalRef.current = setInterval(() => {
            setRemaining((prev) => {
                if (prev <= 1000) { clearInterval(intervalRef.current!); return 0; }
                return prev - 1000;
            });
        }, 1000);
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [serverMs]);

    return remaining;
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────
function ProgressBar({ ms, totalMs, color = "linear-gradient(90deg,#4cc9f0,#7b2fff)" }: {
    ms: number; totalMs: number; color?: string;
}) {
    const pct = totalMs > 0 ? Math.max(2, Math.min(100, ((totalMs - ms) / totalMs) * 100)) : 100;
    return (
        <div className="w-full">
            <div className="w-full h-6 bg-white/5 rounded-full overflow-hidden relative">
                <div className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${pct}%`, background: color }} />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-mono font-bold"
                        style={{ color: "rgba(255,255,255,0.9)", textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
                        {msToTime(ms)}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── Shared card shell ────────────────────────────────────────────────────────
function CardShell({
    image, ready, accentColor, children,
}: {
    image: string; ready: boolean; accentColor: string; children: React.ReactNode;
}) {
    return (
        <div className="relative rounded-2xl overflow-hidden flex flex-col min-h-[220px] md:min-h-[260px]"
            style={{
                border: ready ? `1px solid ${accentColor}66` : "1px solid rgba(255,255,255,0.07)",
                boxShadow: ready ? `0 0 24px ${accentColor}20` : "none",
                background: "#0a1520",
            }}>
            {/* Background image */}
            <div className="absolute inset-0"
                style={{ backgroundImage: `url('${image}')`, backgroundSize: "cover", backgroundPosition: "center", opacity: 0.18 }} />
            {/* Gradient overlay */}
            <div className="absolute inset-0"
                style={{ background: "linear-gradient(180deg, rgba(10,21,32,0.3) 0%, rgba(10,21,32,0.95) 58%)" }} />
            {/* Content */}
            <div className="relative z-10 flex flex-col h-full p-4 md:p-5">
                {children}
            </div>
        </div>
    );
}

// ─── Card header ─────────────────────────────────────────────────────────────
function CardHeader({ emoji, name, subtitle, level, accentColor }: {
    emoji: string; name: string; subtitle: string; level: number | null; accentColor: string;
}) {
    return (
        <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}33` }}>
                    {emoji}
                </div>
                <div>
                    <p className="font-bold text-white text-sm leading-tight">{name}</p>
                    <p className="text-[10px] md:text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{subtitle}</p>
                </div>
            </div>
            {level !== null && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    LV {level}
                </span>
            )}
        </div>
    );
}

// ─── CollectMsg ───────────────────────────────────────────────────────────────
function CollectMsg({ msg }: { msg: string }) {
    if (!msg) return null;
    return (
        <p className="text-[10px] font-mono mb-2 px-2 py-1 rounded-lg text-center"
            style={{ background: "rgba(6,214,160,0.1)", color: "#06d6a0", border: "1px solid rgba(6,214,160,0.2)" }}>
            ✅ {msg}
        </p>
    );
}

// ─── CollectButton ────────────────────────────────────────────────────────────
function CollectButton({ collecting, label, onClick, gradient, textColor = "#001a12", shadow }: {
    collecting: boolean; label: string; onClick: () => void; gradient: string; textColor?: string; shadow?: string;
}) {
    return (
        <button onClick={onClick} disabled={collecting}
            className="w-full py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all disabled:opacity-50 hover:brightness-110 active:scale-95"
            style={{ background: gradient, color: textColor, boxShadow: shadow }}>
            {collecting ? "..." : label}
        </button>
    );
}

// ─── MineCard ─────────────────────────────────────────────────────────────────
function MineCard() {
    const [mine, setMine] = useState<any>(null);
    const [collecting, setCollecting] = useState(false);
    const [msg, setMsg] = useState("");

    const load = useCallback(async () => {
        try { setMine(await api.mineStatus()); } catch {}
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleCollect() {
        setCollecting(true); setMsg("");
        try {
            const res = await api.mineCollect();
            const c = res.collected;
            const parts: string[] = [];
            if (c.lootQuantity > 0)       parts.push(`+${c.lootQuantity}× ${c.lootItem.replace(/_/g, " ")}`);
            if (c.diamondsGained > 0)     parts.push(`+${c.diamondsGained}× 💎`);
            if (c.rockFragmentsGained > 0) parts.push(`+${c.rockFragmentsGained}× 🪨`);
            setMsg(parts.join(" · ") || "Collected!");
            load();
        } catch (e: any) { setMsg(e.message); }
        finally { setCollecting(false); }
    }

    const serverMs = mine !== null ? (mine.nextCollectMs ?? 0) : null;
    const countdown = useCountdown(serverMs);
    const ready = mine?.ready ?? false;
    const showButton = ready || (mine !== null && countdown === 0);

    return (
        <CardShell image={INN_IMAGES.mine} ready={showButton} accentColor="#fbbf24">
            <CardHeader emoji="⛏️" name="Mine" subtitle="Diamonds & resources" level={mine?.level ?? null} accentColor="#fbbf24" />

            {/* Daily diamonds counter */}
            {mine !== null && (
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>
                        💎 {mine.dailyDiamonds ?? 0}/{mine.dailyDiamondCap ?? 15} today
                    </span>
                    {mine.diamondsFull && (
                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(76,201,240,0.12)", color: "#4cc9f0", border: "1px solid rgba(76,201,240,0.25)" }}>
                            FULL
                        </span>
                    )}
                </div>
            )}

            <div className="flex-1" />
            <CollectMsg msg={msg} />

            {mine === null ? (
                <div className="w-full h-6 bg-white/5 rounded-full animate-pulse" />
            ) : showButton ? (
                <CollectButton collecting={collecting} label="⛏ Collect" onClick={handleCollect}
                    gradient="linear-gradient(135deg,#06d6a0,#04a57a)"
                    shadow="0 0 16px rgba(6,214,160,0.3)" />
            ) : (
                <ProgressBar ms={countdown} totalMs={MINE_COOLDOWN_MS[mine.level] ?? 4*3600*1000}
                    color="linear-gradient(90deg,#fbbf24,#f59e0b)" />
            )}
        </CardShell>
    );
}

// ─── Boosted champions this week (static placeholder — backend pending) ────────
const BOOSTED_MYTHS = [
    { name: "Embralith", rarity: "ELITE",     boost: "+40%", color: "#e2e8f0" },
    { name: "Pyroxar",   rarity: "RARE",      boost: "+25%", color: "#6366f1" },
    { name: "Volthorn",  rarity: "RARE",      boost: "+25%", color: "#6366f1" },
    { name: "Glacivern", rarity: "LEGENDARY", boost: "+15%", color: "#fbbf24" },
];

// ─── ForgeCard ────────────────────────────────────────────────────────────────
function ForgeCard() {
    const [forge, setForge] = useState<any>(null);
    const [fragmentCount, setFragmentCount] = useState<number>(0);
    const [collecting, setCollecting] = useState(false);
    const [msg, setMsg] = useState("");
    const [showOpenModal, setShowOpenModal] = useState(false);
    const [opening, setOpening] = useState(false);
    const [openResult, setOpenResult] = useState<any>(null);

    const load = useCallback(async () => {
        try {
            const [f, inv] = await Promise.all([api.forgeStatus(), api.inventory()]);
            setForge(f);
            const frag = (inv as any[]).find((i: any) => i.item === "FRAGMENT");
            setFragmentCount(frag?.quantity ?? 0);
        } catch {}
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleCollect() {
        setCollecting(true); setMsg("");
        try {
            const res = await api.forgeCollect();
            const c = res.collected;
            const parts: string[] = [];
            if (c.fragmentsGained > 0)  parts.push(`+${c.fragmentsGained}× Fragment`);
            if (c.flameCoresGained > 0) parts.push(`+${c.flameCoresGained}× Flame Core`);
            setMsg(parts.join(" · ") || "Collected!");
            load();
        } catch (e: any) { setMsg(e.message); }
        finally { setCollecting(false); }
    }

    async function handleOpenFragment() {
        setOpening(true); setOpenResult(null);
        try {
            const res = await (api as any).fragmentOpen?.();
            setOpenResult(res);
            load();
        } catch (e: any) { setOpenResult({ error: e.message }); }
        finally { setOpening(false); }
    }

    const serverMs = forge !== null ? (forge.nextCollectMs ?? 0) : null;
    const countdown = useCountdown(serverMs);
    const ready = forge?.ready ?? false;
    const showButton = ready || (forge !== null && countdown === 0);

    return (
        <>
            {/* ── Fragment opening modal ── */}
            {showOpenModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.85)" }}
                    onClick={() => { setShowOpenModal(false); setOpenResult(null); }}>
                    <div className="relative rounded-2xl w-full max-w-sm flex flex-col overflow-hidden"
                        style={{ background: "#0a1020", border: "1px solid rgba(76,201,240,0.25)", boxShadow: "0 0 60px rgba(76,201,240,0.15)" }}
                        onClick={(e) => e.stopPropagation()}>

                        {/* Header */}
                        <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(76,201,240,0.12)" }}>
                            <p className="font-black tracking-widest uppercase text-sm"
                                style={{ fontFamily: "'Rajdhani',sans-serif", color: "#e2e8f0" }}>
                                Fragment Forge
                            </p>
                            <p className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                                ◈ {fragmentCount} fragments available
                            </p>
                        </div>

                        {/* Drop rates */}
                        <div className="px-5 pt-4 pb-2">
                            <p className="text-[9px] font-mono tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>
                                DROP RATES
                            </p>
                            <div className="flex gap-1.5">
                                {FRAGMENT_RATES.map((r) => (
                                    <div key={r.rarity} className="flex-1 flex flex-col items-center gap-0.5 rounded-lg py-1.5"
                                        style={{ background: r.bg, border: `1px solid ${r.border}` }}>
                                        <span className="text-[9px] font-mono font-bold" style={{ color: r.color }}>{r.pct}</span>
                                        <span className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>{r.rarity.slice(0,3)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Boosted this week */}
                        <div className="px-5 pt-3 pb-2">
                            <p className="text-[9px] font-mono tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>
                                ⚡ BOOSTED THIS WEEK
                            </p>
                            <div className="flex flex-col gap-1.5">
                                {BOOSTED_MYTHS.map((m) => (
                                    <div key={m.name} className="flex items-center justify-between px-2.5 py-1.5 rounded-lg"
                                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                                        <div>
                                            <span className="text-xs font-bold" style={{ color: "#e2e8f0" }}>{m.name}</span>
                                            <span className="text-[9px] font-mono ml-2" style={{ color: m.color }}>{m.rarity}</span>
                                        </div>
                                        <span className="text-[10px] font-mono font-bold"
                                            style={{ color: "#06d6a0" }}>{m.boost}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Fragment animation + open result */}
                        <div className="flex flex-col items-center py-5">
                            {openResult ? (
                                openResult.error ? (
                                    <p className="text-xs font-mono" style={{ color: "#f87171" }}>{openResult.error}</p>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="text-5xl" style={{ filter: "drop-shadow(0 0 20px rgba(76,201,240,0.8))" }}>◈</span>
                                        <p className="font-bold text-sm" style={{ color: "#4cc9f0" }}>
                                            {openResult.myth?.name ?? "Myth obtained!"}
                                        </p>
                                        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full"
                                            style={{ background: "rgba(76,201,240,0.1)", color: "#4cc9f0", border: "1px solid rgba(76,201,240,0.25)" }}>
                                            {openResult.rarity ?? ""}
                                        </span>
                                    </div>
                                )
                            ) : (
                                <div className="relative flex items-center justify-center w-20 h-20">
                                    <div className="absolute inset-0 rounded-full"
                                        style={{ background: "radial-gradient(circle,rgba(76,201,240,0.15) 0%,transparent 70%)", animation: "forgeGlow 2.5s ease-in-out infinite" }} />
                                    <span className="text-6xl select-none" style={{
                                        color: "#fff",
                                        filter: "drop-shadow(0 0 14px rgba(255,255,255,0.85)) drop-shadow(0 0 30px rgba(76,201,240,0.5))",
                                        animation: opening ? "none" : "forgeFloat 3s ease-in-out infinite",
                                        transform: opening ? "scale(1.2)" : undefined,
                                        transition: "transform 0.3s",
                                    }}>◈</span>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="px-5 pb-5 flex flex-col gap-2">
                            {!openResult && (
                                <button onClick={handleOpenFragment} disabled={opening || fragmentCount === 0}
                                    className="w-full py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all hover:brightness-110 active:scale-95 disabled:opacity-40"
                                    style={{ background: "linear-gradient(135deg,#4cc9f0,#7b2fff)", color: "#fff", boxShadow: "0 0 16px rgba(76,201,240,0.25)" }}>
                                    {opening ? "Opening..." : `◈ Open Fragment (${fragmentCount})`}
                                </button>
                            )}
                            {openResult && !openResult.error && (
                                <button onClick={() => { setOpenResult(null); }}
                                    className="w-full py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all hover:brightness-110 active:scale-95"
                                    style={{ background: "linear-gradient(135deg,#4cc9f0,#7b2fff)", color: "#fff" }}>
                                    Open Another
                                </button>
                            )}
                            <button onClick={() => { setShowOpenModal(false); setOpenResult(null); }}
                                className="w-full py-2 text-[10px] font-mono transition-colors hover:bg-white/5 rounded-xl"
                                style={{ color: "rgba(255,255,255,0.3)" }}>
                                Close ✕
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <CardShell image={INN_IMAGES.forge} ready={showButton} accentColor="#4cc9f0">
                <CardHeader emoji="◈" name="Fragment Forge" subtitle="Myth summoning" level={forge?.level ?? null} accentColor="#4cc9f0" />

                {/* Boosted this week — compact preview */}
                <div className="mb-2">
                    <p className="text-[8px] font-mono tracking-widest mb-1.5" style={{ color: "rgba(255,255,255,0.22)" }}>
                        ⚡ BOOSTED THIS WEEK
                    </p>
                    <div className="flex gap-1.5">
                        {BOOSTED_MYTHS.slice(0, 3).map((m) => (
                            <span key={m.name} className="text-[8px] font-mono px-1.5 py-0.5 rounded-md"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: m.color }}>
                                {m.name}
                            </span>
                        ))}
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-md"
                            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.3)" }}>
                            +1
                        </span>
                    </div>
                </div>

                {/* Rarity rates — compact */}
                <div className="grid grid-cols-5 gap-1 mb-2">
                    {FRAGMENT_RATES.map((r) => (
                        <div key={r.rarity} className="flex flex-col items-center justify-center gap-0.5 rounded-lg py-1 px-0.5"
                            style={{ background: r.bg, border: `1px solid ${r.border}` }}>
                            <span className="text-[8px] font-mono font-bold" style={{ color: r.color }}>{r.pct}</span>
                            <span className="text-[6px] font-mono text-center leading-tight"
                                style={{ color: "rgba(255,255,255,0.35)" }}>{r.rarity.slice(0,3)}</span>
                        </div>
                    ))}
                </div>

                {/* Floating fragment */}
                <div className="flex-1 flex items-center justify-center">
                    <div className="relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16">
                        <div className="absolute inset-0 rounded-full"
                            style={{ background: "radial-gradient(circle,rgba(255,255,255,0.12) 0%,transparent 70%)", animation: "forgeGlow 2.5s ease-in-out infinite" }} />
                        <span className="text-4xl md:text-5xl select-none" style={{
                            color: "#ffffff",
                            filter: "drop-shadow(0 0 14px rgba(255,255,255,0.85)) drop-shadow(0 0 30px rgba(76,201,240,0.5))",
                            animation: "forgeFloat 3s ease-in-out infinite",
                        }}>◈</span>
                    </div>
                </div>

                <CollectMsg msg={msg} />

                {forge === null ? (
                    <div className="w-full h-6 bg-white/5 rounded-full animate-pulse mb-2" />
                ) : showButton ? (
                    <div className="mb-2">
                        <CollectButton collecting={collecting} label="Collect fragment" onClick={handleCollect}
                            gradient="linear-gradient(135deg,#06d6a0,#04a57a)"
                            shadow="0 0 16px rgba(6,214,160,0.3)" />
                    </div>
                ) : (
                    <div className="mb-2">
                        <ProgressBar ms={countdown} totalMs={FORGE_COOLDOWN_MS[forge.level] ?? 6*3600*1000}
                            color="linear-gradient(90deg,#4cc9f0,#7b2fff)" />
                    </div>
                )}

                <button onClick={() => setShowOpenModal(true)}
                    className="w-full py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all hover:brightness-110 active:scale-95"
                    style={{
                        background: fragmentCount > 0
                            ? "linear-gradient(135deg,#4cc9f0 0%,#7b2fff 100%)"
                            : "rgba(255,255,255,0.05)",
                        color: fragmentCount > 0 ? "#fff" : "rgba(255,255,255,0.25)",
                        border: fragmentCount > 0 ? "none" : "1px solid rgba(255,255,255,0.08)",
                        boxShadow: fragmentCount > 0 ? "0 0 16px rgba(76,201,240,0.25)" : "none",
                    }}>
                    {fragmentCount > 0 ? `◈ Open Fragments (${fragmentCount})` : "◈ No Fragments"}
                </button>
            </CardShell>
        </>
    );
}

// ─── LabCard ──────────────────────────────────────────────────────────────────
function LabCard() {
    const [lab, setLab] = useState<any>(null);
    const [collecting, setCollecting] = useState(false);
    const [msg, setMsg] = useState("");
    const [selectedItem, setSelectedItem] = useState<typeof LAB_ITEMS[0] | null>(null);

    const load = useCallback(async () => {
        try { setLab(await api.labStatus()); } catch {}
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleCollect() {
        setCollecting(true); setMsg("");
        try {
            const res = await api.labCollect();
            const c = res.collected;
            const parts: string[] = [];
            if (c.elixirsGained > 0)    parts.push(`+${c.elixirsGained}× Elixir`);
            if (c.arcaneGearsGained > 0) parts.push(`+${c.arcaneGearsGained}× Arcane Gear`);
            setMsg(parts.join(" · ") || "Collected!");
            load();
        } catch (e: any) { setMsg(e.message); }
        finally { setCollecting(false); }
    }

    const serverMs = lab !== null ? (lab.nextCollectMs ?? 0) : null;
    const countdown = useCountdown(serverMs);
    const ready = lab?.ready ?? false;
    const showButton = ready || (lab !== null && countdown === 0);

    return (
        <>
            {/* Item detail modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
                    onClick={() => setSelectedItem(null)}>
                    <div className="relative rounded-2xl p-6 max-w-xs w-full flex flex-col items-center gap-3"
                        style={{ background: "#0e1e2e", border: `1px solid ${selectedItem.color}40`, boxShadow: `0 0 40px ${selectedItem.color}20` }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="text-5xl" style={{ filter: `drop-shadow(0 0 12px ${selectedItem.color})` }}>
                            {selectedItem.icon}
                        </div>
                        <p className="font-bold text-white text-lg">{selectedItem.name}</p>
                        <p className="text-sm text-center" style={{ color: "rgba(255,255,255,0.5)" }}>{selectedItem.desc}</p>
                        <span className="text-[10px] font-mono px-3 py-1 rounded-full"
                            style={{ background: `${selectedItem.color}15`, color: selectedItem.color, border: `1px solid ${selectedItem.color}30` }}>
                            Coming soon
                        </span>
                        <button onClick={() => setSelectedItem(null)}
                            className="mt-1 text-xs transition-colors"
                            style={{ color: "rgba(255,255,255,0.3)" }}>
                            Close ✕
                        </button>
                    </div>
                </div>
            )}

            <CardShell image={INN_IMAGES.lab} ready={showButton} accentColor="#06d6a0">
                <CardHeader emoji="🧪" name="Laboratory" subtitle="Items & consumables" level={lab?.level ?? null} accentColor="#06d6a0" />

                {/* Item scroll row */}
                <div className="flex gap-2 overflow-x-auto pb-1 mb-3" style={{ scrollbarWidth: "none" }}>
                    {LAB_ITEMS.map((item) => (
                        <button key={item.id} onClick={() => setSelectedItem(item)}
                            className="flex-shrink-0 flex flex-col items-center gap-1.5 rounded-xl p-2 transition-all hover:scale-105 hover:brightness-110 active:scale-95"
                            style={{ width: 56, background: `${item.color}10`, border: `1px solid ${item.color}25` }}>
                            <span className="text-xl md:text-2xl" style={{ filter: `drop-shadow(0 0 6px ${item.color}80)` }}>
                                {item.icon}
                            </span>
                            <span className="text-[8px] md:text-[9px] font-mono text-center leading-tight"
                                style={{ color: "rgba(255,255,255,0.5)" }}>
                                {item.name.split(" ")[0]}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="flex-1" />
                <CollectMsg msg={msg} />

                {lab === null ? (
                    <div className="w-full h-6 bg-white/5 rounded-full animate-pulse" />
                ) : showButton ? (
                    <CollectButton collecting={collecting} label="🧪 Collect Elixir" onClick={handleCollect}
                        gradient="linear-gradient(135deg,#06d6a0,#04a57a)"
                        shadow="0 0 16px rgba(6,214,160,0.3)" />
                ) : (
                    <ProgressBar ms={countdown} totalMs={LAB_COOLDOWN_MS[lab.level] ?? 8*3600*1000}
                        color="linear-gradient(90deg,#06d6a0,#0891b2)" />
                )}
            </CardShell>
        </>
    );
}

// ─── NurseryCard ──────────────────────────────────────────────────────────────
function NurseryCard() {
    const [nursery, setNursery] = useState<any>(null);
    const [allMyths, setAllMyths] = useState<any[]>([]);
    const [collecting, setCollecting] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [msg, setMsg] = useState("");

    const load = useCallback(async () => {
        try {
            const [n, all] = await Promise.all([api.nurseryStatus(), api.creatures()]);
            setNursery(n);
            const nurseryMythId = n?.myth?.id ?? null;
            setAllMyths((all as any[]).filter((c: any) =>
                c.level < 60 && c.id !== nurseryMythId && !c.inNursery
            ));
        } catch {}
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleAssign(creatureId: string) {
        setAssigning(true); setShowPicker(false);
        try {
            await api.nurseryAssign(creatureId);
            setMsg("Myth assigned!");
            await load();
        } catch (e: any) { setMsg(e.message); }
        finally { setAssigning(false); }
    }

    async function handleCollect() {
        setCollecting(true); setMsg("");
        try {
            const res = await api.nurseryCollect();
            setMsg(`⬆ ${res.myth?.name ?? res.myth?.speciesId ?? "Myth"} → Lv. ${res.newLevel}`);
            await load();
        } catch (e: any) { setMsg(e.message); }
        finally { setCollecting(false); }
    }

    async function handleRemove() {
        try {
            await api.nurseryRemove();
            setMsg("Myth returned to storage");
            await load();
        } catch (e: any) { setMsg(e.message); }
    }

    const hasMyth = !!nursery?.myth;
    const serverMs = nursery !== null && nursery.nextCollectMs != null ? nursery.nextCollectMs : null;
    const isMaxLevel = nursery?.maxLevel ?? false;
    const countdown = useCountdown(serverMs);
    const showButton = (nursery?.ready ?? false) || (nursery !== null && hasMyth && !isMaxLevel && serverMs !== null && countdown === 0);

    const inParty   = allMyths.filter((c) =>  c.isInParty);
    const inStorage = allMyths.filter((c) => !c.isInParty);

    return (
        <CardShell image={INN_IMAGES.nursery} ready={showButton} accentColor="#ffd60a">
            <CardHeader emoji="🥚" name="Nursery" subtitle="Train your Myth" level={nursery?.level ?? null} accentColor="#ffd60a" />

            {/* Loading skeleton */}
            {nursery === null && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-white/5 animate-pulse" />
                </div>
            )}

            {/* Empty slot */}
            {nursery !== null && !hasMyth && (
                <>
                    <div className="flex-1 flex flex-col items-center justify-center gap-3">
                        <div className="text-4xl md:text-5xl opacity-30 select-none">🥚</div>
                        <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
                            No Myth in training
                        </p>
                        <button onClick={() => setShowPicker(true)} disabled={assigning}
                            className="px-4 py-2 rounded-xl font-bold text-xs tracking-widest uppercase transition-all hover:brightness-110 disabled:opacity-50 active:scale-95"
                            style={{ background: "linear-gradient(135deg,#ffd60a,#e6a800)", color: "#1a0f00" }}>
                            {assigning ? "Assigning..." : "Assign Myth"}
                        </button>
                    </div>

                    {showPicker && (
                        <div className="mt-3 rounded-xl overflow-hidden"
                            style={{ border: "1px solid rgba(255,214,10,0.2)", background: "rgba(255,214,10,0.04)" }}>
                            <p className="text-[10px] font-mono px-3 py-2 border-b"
                                style={{ color: "rgba(255,255,255,0.4)", borderColor: "rgba(255,214,10,0.15)" }}>
                                SELECT A MYTH
                            </p>
                            <div className="max-h-36 overflow-y-auto">
                                {allMyths.length === 0 && (
                                    <p className="text-xs text-center py-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                                        No Myths available
                                    </p>
                                )}
                                {inParty.length > 0 && (
                                    <>
                                        <p className="text-[9px] font-mono px-3 py-1" style={{ color: "rgba(255,255,255,0.25)" }}>TEAM</p>
                                        {inParty.map((c: any) => (
                                            <button key={c.id} onClick={() => handleAssign(c.id)}
                                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left">
                                                <span className="text-xl">{mythArtUrl(c)}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-white truncate">{c.name ?? c.speciesId}</p>
                                                    <p className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>Lv. {c.level}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </>
                                )}
                                {inStorage.length > 0 && (
                                    <>
                                        <p className="text-[9px] font-mono px-3 py-1" style={{ color: "rgba(255,255,255,0.25)" }}>STORAGE</p>
                                        {inStorage.map((c: any) => (
                                            <button key={c.id} onClick={() => handleAssign(c.id)}
                                                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left">
                                                <span className="text-xl">{mythArtUrl(c)}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-white truncate">{c.name ?? c.speciesId}</p>
                                                    <p className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>Lv. {c.level}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </>
                                )}
                            </div>
                            <button onClick={() => setShowPicker(false)}
                                className="w-full py-2 text-[10px] font-mono transition-colors hover:bg-white/5"
                                style={{ color: "rgba(255,255,255,0.3)", borderTop: "1px solid rgba(255,214,10,0.1)" }}>
                                Cancel ✕
                            </button>
                        </div>
                    )}
                </>
            )}

            {/* Active training */}
            {nursery !== null && hasMyth && !isMaxLevel && (
                <>
                    <div className="flex-1 flex flex-col items-center justify-center relative mb-3">
                        <div className="absolute rounded-full"
                            style={{ width: 100, height: 100, background: "radial-gradient(circle, rgba(255,214,10,0.15) 0%, transparent 70%)", animation: "nurseryPulse 2.5s ease-in-out infinite" }} />
                        <div className="absolute rounded-full"
                            style={{ width: 64, height: 64, background: "radial-gradient(circle, rgba(255,214,10,0.25) 0%, transparent 70%)", animation: "nurseryPulse 2.5s ease-in-out infinite 0.4s" }} />
                        <div className="relative z-10 text-6xl md:text-7xl select-none"
                            style={{ filter: "drop-shadow(0 0 16px rgba(255,214,10,0.6)) drop-shadow(0 0 32px rgba(255,214,10,0.3))", animation: "nurseryFloat 3s ease-in-out infinite" }}>
                            {mythArtUrl(nursery.myth)}
                        </div>
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="absolute rounded-full pointer-events-none"
                                style={{ width: 4, height: 4, background: "#ffd60a", boxShadow: "0 0 6px #ffd60a", left: `${30 + i * 13}%`, animation: `nurseryXP 2s ease-in-out infinite ${i * 0.5}s` }} />
                        ))}
                    </div>

                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="font-bold text-sm" style={{ color: "#ffd60a" }}>
                                {nursery.myth.name ?? nursery.myth.speciesId}
                            </p>
                            <p className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
                                Lv. {nursery.myth.level} → {nursery.myth.level + 1}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            {showButton && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                                    style={{ background: "rgba(255,214,10,0.15)", color: "#ffd60a", border: "1px solid rgba(255,214,10,0.3)" }}>
                                    ⚡ Ready
                                </span>
                            )}
                            <button onClick={handleRemove}
                                className="text-[9px] font-mono hover:text-white/60 transition-colors"
                                style={{ color: "rgba(255,255,255,0.2)" }}>
                                remove ✕
                            </button>
                        </div>
                    </div>

                    <CollectMsg msg={msg} />

                    {showButton ? (
                        <CollectButton collecting={collecting} label="⬆ Level up" onClick={handleCollect}
                            gradient="linear-gradient(135deg,#ffd60a,#e6a800)"
                            textColor="#1a0f00"
                            shadow="0 0 16px rgba(255,214,10,0.3)" />
                    ) : serverMs !== null ? (
                        <ProgressBar ms={countdown} totalMs={nursery.currentLevelCooldownMs ?? serverMs}
                            color="linear-gradient(90deg,#ffd60a,#f59e0b)" />
                    ) : null}
                </>
            )}

            {/* Max level */}
            {nursery !== null && hasMyth && isMaxLevel && (
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <div className="text-5xl" style={{ filter: "drop-shadow(0 0 12px rgba(255,214,10,0.6))" }}>
                        {mythArtUrl(nursery.myth)}
                    </div>
                    <p className="text-xs font-bold" style={{ color: "#ffd60a" }}>🏆 Max level (60)</p>
                    <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {nursery.myth.name ?? nursery.myth.speciesId}
                    </p>
                    <button onClick={handleRemove}
                        className="mt-2 text-[10px] font-mono px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                        style={{ color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        Return to storage
                    </button>
                </div>
            )}
        </CardShell>
    );
}

// ─── InnPage ──────────────────────────────────────────────────────────────────
export default function InnPage() {
    const navigate = useNavigate();
    return (
        <div className="fixed inset-0 flex flex-col" style={{ background:"#070b14", fontFamily:"'Exo 2',sans-serif" }}>
            <style>{`.inn-scrollbar::-webkit-scrollbar{display:none}`}</style>

            {/* Topbar */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 md:px-6" style={{ height:48, background:"rgba(4,8,15,0.97)", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                <button onClick={() => navigate("/")} className="flex items-center gap-2 transition-opacity hover:opacity-70 active:scale-95" style={{ color:"rgba(255,255,255,0.45)", fontSize:11, fontFamily:"monospace" }}>
                    <span style={{ fontSize:9 }}>◀</span>
                    <span className="tracking-widest uppercase">City</span>
                </button>
                <div className="flex flex-col items-center">
                    <span className="tracking-[0.22em] uppercase font-black" style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:15, color:"#e2e8f0" }}>Outpost</span>
                    <span className="tracking-widest uppercase" style={{ fontSize:8, color:"rgba(255,255,255,0.22)", fontFamily:"monospace" }}>Mine · Forge · Lab · Nursery</span>
                </div>
                <div style={{ width:60 }} />
            </div>

            {/* 2×2 grid */}
            <div className="flex-1 overflow-y-auto inn-scrollbar p-3 md:p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 max-w-3xl mx-auto">
                    <MineCard />
                    <ForgeCard />
                    <LabCard />
                    <NurseryCard />
                </div>
            </div>
        </div>
    );
}
