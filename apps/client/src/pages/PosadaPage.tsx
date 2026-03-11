// apps/client/src/pages/PosadaPage.tsx
import { useState, useEffect, useCallback } from "react";
import Layout from "../components/Layout";
import TrainerSidebar from "../components/TrainerSidebar";
import { api } from "../lib/api";
import { useNavigate } from "react-router-dom";

const POSADA_IMAGES = {
    mina: "https://raw.githubusercontent.com/adcanoardev/mythara-assets/refs/heads/main/tavern/mina.avif",
    forja: "https://raw.githubusercontent.com/adcanoardev/mythara-assets/refs/heads/main/tavern/forja.avif",
    laboratorio: "https://raw.githubusercontent.com/adcanoardev/mythara-assets/refs/heads/main/tavern/laboratorio.avif",
    guarderia: "https://raw.githubusercontent.com/adcanoardev/mythara-assets/refs/heads/main/tavern/guarderia.avif",
};

const LAB_ITEMS = [
    { id: "elixir", icon: "⚗️", name: "Elixir", desc: "Restaura el HP máximo de un Myth al instante.", color: "#4cc9f0" },
    { id: "turbo_elixir", icon: "💠", name: "Turbo Elixir", desc: "Duplica la velocidad de entrenamiento en guardería por 1h.", color: "#7b2fff" },
    { id: "antidote", icon: "🧪", name: "Antídoto", desc: "Cura estados alterados (veneno, quemadura, parálisis).", color: "#06d6a0" },
    { id: "boost_atk", icon: "🔥", name: "Potenciador ATK", desc: "Aumenta el ATK de un Myth un 20% durante el próximo combate.", color: "#f97316" },
    { id: "boost_def", icon: "🛡️", name: "Potenciador DEF", desc: "Aumenta la DEF de un Myth un 20% durante el próximo combate.", color: "#3b82f6" },
    { id: "mega_elixir", icon: "✨", name: "Mega Elixir", desc: "Restaura todos los Myths del equipo al 100% de HP.", color: "#fcd34d" },
];

const FRAGMENT_RATES = [
    { rarity: "COMÚN",      pct: "92.00%", color: "#94a3b8", bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.25)" },
    { rarity: "RARO",       pct: "7.00%",  color: "#38bdf8", bg: "rgba(56,189,248,0.08)",  border: "rgba(56,189,248,0.3)"  },
    { rarity: "ÉLITE",      pct: "0.80%",  color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.3)" },
    { rarity: "LEGENDARIO", pct: "0.19%",  color: "#fcd34d", bg: "rgba(252,211,77,0.08)",  border: "rgba(252,211,77,0.3)"  },
    { rarity: "MÍTICO",     pct: "0.01%",  color: "#f472b6", bg: "rgba(244,114,182,0.08)", border: "rgba(244,114,182,0.3)" },
];

const ITEM_ICONS: Record<string, string> = {
    ROCK_FRAGMENT: "🪨",
    BLUE_DIAMOND:  "💎",
    ARCANE_GEAR:   "🔩",
    FLAME_CORE:    "🔥",
};

const STRUCTURE_XP_COLOR: Record<string, string> = {
    mine:    "linear-gradient(90deg,#fbbf24,#f59e0b)",
    forge:   "linear-gradient(90deg,#4cc9f0,#7b2fff)",
    lab:     "linear-gradient(90deg,#06d6a0,#0891b2)",
    nursery: "linear-gradient(90deg,#ffd60a,#f59e0b)",
};

function msToTime(ms: number) {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
    if (m > 0) return `${m}m ${sec.toString().padStart(2, "0")}s`;
    return `${sec}s`;
}

// ─── BARRA DE COOLDOWN ────────────────────────────────────────────────────────
function ProgressBar({ ms, totalMs, color = "linear-gradient(90deg,#4cc9f0,#7b2fff)" }: {
    ms: number; totalMs: number; color?: string;
}) {
    const pct = totalMs > 0 ? Math.max(2, Math.min(100, ((totalMs - ms) / totalMs) * 100)) : 100;
    const timeStr = ms > 0 ? msToTime(ms) : "Listo";
    return (
        <div className="w-4/5 mx-auto">
            <div className="w-full h-7 bg-white/5 rounded-full overflow-hidden relative">
                <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${pct}%`, background: color }}
                >
                    <div className="absolute inset-0 rounded-full opacity-40"
                        style={{ background: "linear-gradient(180deg,rgba(255,255,255,0.3) 0%,transparent 100%)" }} />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-mono font-bold" style={{ color: "rgba(255,255,255,0.85)", textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
                        ⏱ {timeStr}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── BADGE NIV CON XP ─────────────────────────────────────────────────────────
function LevelBadge({ level, xp, xpToNext, xpColor, extraContent }: {
    level: number; xp?: number; xpToNext?: number; xpColor: string; extraContent?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1.5">
                {extraContent}
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md"
                    style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    NIV {level}
                </span>
            </div>
            {xp !== undefined && xpToNext !== undefined && (
                <div className="w-20">
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(100, (xp / xpToNext) * 100)}%`, background: xpColor }} />
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── MODAL UPGRADE ────────────────────────────────────────────────────────────
function UpgradeModal({
    structureName, structureIcon, currentLevel,
    requiredItem, requiredQty, availableQty,
    onConfirm, onCancel, loading,
}: {
    structureName: string; structureIcon: string; currentLevel: number;
    requiredItem: string; requiredQty: number; availableQty: number;
    onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
    const canAfford = availableQty >= requiredQty;
    const itemIcon = ITEM_ICONS[requiredItem] ?? "📦";
    const itemName = requiredItem.replace(/_/g, " ");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)" }}
            onClick={onCancel}>
            <div className="relative rounded-2xl p-6 max-w-xs w-full flex flex-col items-center gap-4"
                style={{ background: "#0e1e2e", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 0 48px rgba(0,0,0,0.6)" }}
                onClick={(e) => e.stopPropagation()}>

                <div className="text-4xl">{structureIcon}</div>

                <div className="text-center">
                    <p className="font-bold text-white text-base">Subir {structureName} de nivel</p>
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                        Nv. {currentLevel} → <span className="font-bold text-white">{currentLevel + 1}</span>
                    </p>
                </div>

                <div className="w-full rounded-xl p-4 flex items-center justify-between"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">{itemIcon}</span>
                        <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>{itemName}</span>
                    </div>
                    <div className="text-right">
                        <p className={`text-sm font-bold font-mono ${canAfford ? "text-green-400" : "text-red-400"}`}>
                            {availableQty} / {requiredQty}
                        </p>
                        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                            {canAfford ? "✓ Suficiente" : "✗ Insuficiente"}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 w-full">
                    <button onClick={onCancel}
                        className="flex-1 py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase"
                        style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }}>
                        Cancelar
                    </button>
                    <button onClick={onConfirm} disabled={!canAfford || loading}
                        className="flex-1 py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                            background: canAfford ? "linear-gradient(135deg,#06d6a0,#04a57a)" : "rgba(255,255,255,0.06)",
                            color: canAfford ? "#001a12" : "rgba(255,255,255,0.3)",
                            boxShadow: canAfford ? "0 0 16px rgba(6,214,160,0.3)" : "none",
                        }}>
                        {loading ? "..." : "⬆ Confirmar"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── MINA ─────────────────────────────────────────────────────────────────────
function MineCard() {
    const [mine, setMine] = useState<any>(null);
    const [collecting, setCollecting] = useState(false);
    const [upgrading, setUpgrading] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeMaterialQty, setUpgradeMaterialQty] = useState(0);
    const [msg, setMsg] = useState("");

    const load = useCallback(async () => {
        try {
            const [m, inv] = await Promise.all([api.mineStatus(), api.inventory()]);
            setMine(m);
            if (m?.upgradeRequirement) {
                const mat = (inv as any[]).find((i: any) => i.item === m.upgradeRequirement.item);
                setUpgradeMaterialQty(mat?.quantity ?? 0);
            }
        } catch {}
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleCollect() {
        setCollecting(true); setMsg("");
        try {
            const res = await api.mineCollect();
            setMsg(`+${res.collected.quantity}× ${res.collected.item.replace(/_/g, " ")}`);
            load();
        } catch (e: any) { setMsg(e.message); }
        finally { setCollecting(false); }
    }

    async function handleUpgrade() {
        setUpgrading(true);
        try {
            await api.mineUpgrade();
            setMsg(`⬆ Mina subida a Nv. ${(mine?.level ?? 1) + 1}`);
            setShowUpgradeModal(false);
            load();
        } catch (e: any) { setMsg(e.message); setShowUpgradeModal(false); }
        finally { setUpgrading(false); }
    }

    const ready = mine?.ready ?? false;
    const nextCollectMs = mine?.nextCollectMs ?? null;
    const canUpgrade = mine?.canUpgradeXp && mine?.upgradeRequirement;
    const diamondsFull = mine?.diamondsFull ?? false;

    return (
        <>
            {showUpgradeModal && mine?.upgradeRequirement && (
                <UpgradeModal
                    structureName="Mina" structureIcon="⛏️"
                    currentLevel={mine.level ?? 1}
                    requiredItem={mine.upgradeRequirement.item}
                    requiredQty={mine.upgradeRequirement.quantity}
                    availableQty={upgradeMaterialQty}
                    onConfirm={handleUpgrade}
                    onCancel={() => setShowUpgradeModal(false)}
                    loading={upgrading}
                />
            )}

            <div className="relative rounded-2xl overflow-hidden flex flex-col" style={{
                border: ready ? "1px solid rgba(6,214,160,0.4)" : "1px solid rgba(255,255,255,0.07)",
                boxShadow: ready ? "0 0 24px rgba(6,214,160,0.12)" : "none",
                background: "#0a1520",
            }}>
                <div className="absolute inset-0" style={{
                    backgroundImage: `url('${POSADA_IMAGES.mina}')`,
                    backgroundSize: "cover", backgroundPosition: "center", opacity: 0.18,
                }} />
                <div className="absolute inset-0" style={{
                    background: "linear-gradient(180deg, rgba(10,21,32,0.3) 0%, rgba(10,21,32,0.95) 60%)",
                }} />

                <div className="relative z-10 flex flex-col h-full p-5">
                    <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl"
                                style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.2)" }}>
                                ⛏️
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm leading-tight">Mina</p>
                                <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Recursos y evoluciones</p>
                            </div>
                        </div>
                        <LevelBadge
                            level={mine?.level ?? 1}
                            xp={mine?.structureXp}
                            xpToNext={mine?.xpToNextLevel}
                            xpColor={STRUCTURE_XP_COLOR.mine}
                            extraContent={diamondsFull ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                    style={{ background: "rgba(56,189,248,0.15)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.3)" }}>
                                    💎 LLENO
                                </span>
                            ) : undefined}
                        />
                    </div>

                    <div className="flex-1" />

                    {msg && (
                        <p className="text-xs font-mono mb-2 px-2 py-1 rounded-lg text-center"
                            style={{ background: "rgba(6,214,160,0.1)", color: "#06d6a0", border: "1px solid rgba(6,214,160,0.2)" }}>
                            ✅ {msg}
                        </p>
                    )}

                    {canUpgrade && (
                        <button onClick={() => setShowUpgradeModal(true)}
                            className="w-full py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all hover:brightness-110 mb-2"
                            style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1a0a00", boxShadow: "0 0 16px rgba(251,191,36,0.3)" }}>
                            ⬆ Subir Mina de nivel
                        </button>
                    )}

                    {ready ? (
                        <button onClick={handleCollect} disabled={collecting}
                            className="w-full py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all disabled:opacity-50 hover:brightness-110"
                            style={{ background: "linear-gradient(135deg,#06d6a0,#04a57a)", color: "#001a12", boxShadow: "0 0 16px rgba(6,214,160,0.3)" }}>
                            {collecting ? "Recogiendo..." : "⛏ Recoger"}
                        </button>
                    ) : (
                        <ProgressBar ms={nextCollectMs ?? 4 * 3600 * 1000} totalMs={4 * 3600 * 1000}
                            color={STRUCTURE_XP_COLOR.mine} />
                    )}
                </div>
            </div>
        </>
    );
}

// ─── FORJA ────────────────────────────────────────────────────────────────────
function ForgeCard() {
    const navigate = useNavigate();
    const [forge, setForge] = useState<any>(null);
    const [fragmentCount, setFragmentCount] = useState<number>(0);
    const [collecting, setCollecting] = useState(false);
    const [upgrading, setUpgrading] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeMaterialQty, setUpgradeMaterialQty] = useState(0);
    const [msg, setMsg] = useState("");

    const load = useCallback(async () => {
        try {
            const [f, inv] = await Promise.all([api.forgeStatus(), api.inventory()]);
            setForge(f);
            const frag = (inv as any[]).find((i: any) => i.item === "FRAGMENT");
            setFragmentCount(frag?.quantity ?? 0);
            if (f?.upgradeRequirement) {
                const mat = (inv as any[]).find((i: any) => i.item === f.upgradeRequirement.item);
                setUpgradeMaterialQty(mat?.quantity ?? 0);
            }
        } catch {}
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleCollect() {
        setCollecting(true); setMsg("");
        try {
            await api.forgeCollect();
            setMsg("Fragmento recogido");
            load();
        } catch (e: any) { setMsg(e.message); }
        finally { setCollecting(false); }
    }

    async function handleUpgrade() {
        setUpgrading(true);
        try {
            await api.forgeUpgrade();
            setMsg(`⬆ Forja subida a Nv. ${(forge?.level ?? 1) + 1}`);
            setShowUpgradeModal(false);
            load();
        } catch (e: any) { setMsg(e.message); setShowUpgradeModal(false); }
        finally { setUpgrading(false); }
    }

    const ready = forge?.ready ?? false;
    const nextCollectMs = forge?.nextCollectMs ?? null;
    const canUpgrade = forge?.canUpgradeXp && forge?.upgradeRequirement;

    return (
        <>
            {showUpgradeModal && forge?.upgradeRequirement && (
                <UpgradeModal
                    structureName="Forja" structureIcon="🏭"
                    currentLevel={forge.level ?? 1}
                    requiredItem={forge.upgradeRequirement.item}
                    requiredQty={forge.upgradeRequirement.quantity}
                    availableQty={upgradeMaterialQty}
                    onConfirm={handleUpgrade}
                    onCancel={() => setShowUpgradeModal(false)}
                    loading={upgrading}
                />
            )}

            <div className="relative rounded-2xl overflow-hidden flex flex-col" style={{
                border: ready ? "1px solid rgba(76,201,240,0.4)" : "1px solid rgba(255,255,255,0.07)",
                boxShadow: ready ? "0 0 24px rgba(76,201,240,0.12)" : "none",
                background: "#0a1520",
            }}>
                <div className="absolute inset-0" style={{
                    backgroundImage: `url('${POSADA_IMAGES.forja}')`,
                    backgroundSize: "cover", backgroundPosition: "center", opacity: 0.18,
                }} />
                <div className="absolute inset-0" style={{
                    background: "linear-gradient(180deg, rgba(10,21,32,0.3) 0%, rgba(10,21,32,0.95) 55%)",
                }} />

                <div className="relative z-10 flex flex-col h-full p-5">
                    <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl"
                                style={{ background: "rgba(76,201,240,0.12)", border: "1px solid rgba(76,201,240,0.2)" }}>
                                ◈
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm leading-tight">Forja de Fragmentos</p>
                                <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Invocación de Myths</p>
                            </div>
                        </div>
                        <LevelBadge
                            level={forge?.level ?? 1}
                            xp={forge?.structureXp}
                            xpToNext={forge?.xpToNextLevel}
                            xpColor={STRUCTURE_XP_COLOR.forge}
                        />
                    </div>

                    {/* Tasas de rareza */}
                    <div className="grid grid-cols-5 gap-1.5 mb-3">
                        {FRAGMENT_RATES.map((r) => (
                            <div key={r.rarity} className="flex flex-col items-center gap-1 rounded-xl py-2 px-1"
                                style={{ background: r.bg, border: `1px solid ${r.border}` }}>
                                <span className="text-xs font-mono font-bold" style={{ color: r.color }}>{r.pct}</span>
                                <span className="text-[9px] font-mono text-center leading-tight"
                                    style={{ color: "rgba(255,255,255,0.4)" }}>{r.rarity}</span>
                            </div>
                        ))}
                    </div>

                    {/* Fragmento ◈ animado grande */}
                    <div className="flex justify-center mb-3">
                        <div className="relative flex items-center justify-center w-20 h-20">
                            <div className="absolute inset-0 rounded-full"
                                style={{ background: "radial-gradient(circle,rgba(76,201,240,0.18) 0%,transparent 70%)", animation: "forgeGlow 2.5s ease-in-out infinite" }} />
                            <div className="absolute inset-0 rounded-full"
                                style={{ background: "radial-gradient(circle,rgba(123,47,255,0.12) 0%,transparent 70%)", animation: "forgeGlow 2.5s ease-in-out infinite 0.8s" }} />
                            <span className="text-5xl relative z-10" style={{
                                filter: "drop-shadow(0 0 14px rgba(76,201,240,0.9)) drop-shadow(0 0 28px rgba(76,201,240,0.4))",
                                color: "#4cc9f0",
                                animation: "forgeFloat 3s ease-in-out infinite",
                            }}>◈</span>
                        </div>
                    </div>

                    <div className="flex-1" />

                    {msg && (
                        <p className="text-xs font-mono mb-2 px-2 py-1 rounded-lg text-center"
                            style={{ background: "rgba(6,214,160,0.1)", color: "#06d6a0", border: "1px solid rgba(6,214,160,0.2)" }}>
                            ✅ {msg}
                        </p>
                    )}

                    {canUpgrade && (
                        <button onClick={() => setShowUpgradeModal(true)}
                            className="w-full py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all hover:brightness-110 mb-2"
                            style={{ background: "linear-gradient(135deg,#4cc9f0,#7b2fff)", color: "#fff", boxShadow: "0 0 16px rgba(76,201,240,0.3)" }}>
                            ⬆ Subir Forja de nivel
                        </button>
                    )}

                    {ready ? (
                        <button onClick={handleCollect} disabled={collecting}
                            className="w-full py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all disabled:opacity-50 hover:brightness-110 mb-2"
                            style={{ background: "linear-gradient(135deg,#06d6a0,#04a57a)", color: "#001a12", boxShadow: "0 0 16px rgba(6,214,160,0.3)" }}>
                            {collecting ? "..." : "Recoger fragmento"}
                        </button>
                    ) : (
                        <div className="mb-2">
                            <ProgressBar ms={nextCollectMs ?? 6 * 3600 * 1000} totalMs={6 * 3600 * 1000}
                                color={STRUCTURE_XP_COLOR.forge} />
                        </div>
                    )}

                    {fragmentCount > 0 && (
                        <button onClick={() => navigate("/fragment")}
                            className="w-full py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all hover:brightness-110"
                            style={{ background: "linear-gradient(135deg,#4cc9f0 0%,#7b2fff 100%)", color: "#fff", boxShadow: "0 0 16px rgba(76,201,240,0.25)" }}>
                            ◈ Abrir fragmentos ({fragmentCount})
                        </button>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes forgeFloat {
                    0%,100% { transform: translateY(0px); }
                    50%     { transform: translateY(-8px); }
                }
                @keyframes forgeGlow {
                    0%,100% { opacity: 0.6; transform: scale(1); }
                    50%     { opacity: 1; transform: scale(1.1); }
                }
            `}</style>
        </>
    );
}

// ─── LAB ──────────────────────────────────────────────────────────────────────
function LabCard() {
    const [lab, setLab] = useState<any>(null);
    const [collecting, setCollecting] = useState(false);
    const [upgrading, setUpgrading] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeMaterialQty, setUpgradeMaterialQty] = useState(0);
    const [msg, setMsg] = useState("");
    const [selectedItem, setSelectedItem] = useState<typeof LAB_ITEMS[0] | null>(null);

    const load = useCallback(async () => {
        try {
            const [l, inv] = await Promise.all([api.labStatus(), api.inventory()]);
            setLab(l);
            if (l?.upgradeRequirement) {
                const mat = (inv as any[]).find((i: any) => i.item === l.upgradeRequirement.item);
                setUpgradeMaterialQty(mat?.quantity ?? 0);
            }
        } catch {}
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleCollect() {
        setCollecting(true); setMsg("");
        try {
            await api.labCollect();
            setMsg("+1× Elixir");
            load();
        } catch (e: any) { setMsg(e.message); }
        finally { setCollecting(false); }
    }

    async function handleUpgrade() {
        setUpgrading(true);
        try {
            await api.labUpgrade();
            setMsg(`⬆ Lab subido a Nv. ${(lab?.level ?? 1) + 1}`);
            setShowUpgradeModal(false);
            load();
        } catch (e: any) { setMsg(e.message); setShowUpgradeModal(false); }
        finally { setUpgrading(false); }
    }

    const ready = lab?.ready ?? false;
    const nextCollectMs = lab?.nextCollectMs ?? null;
    const canUpgrade = lab?.canUpgradeXp && lab?.upgradeRequirement;

    return (
        <>
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
                        <span className="text-xs font-mono px-3 py-1 rounded-full"
                            style={{ background: `${selectedItem.color}15`, color: selectedItem.color, border: `1px solid ${selectedItem.color}30` }}>
                            Próximamente
                        </span>
                        <button onClick={() => setSelectedItem(null)}
                            className="mt-1 text-xs text-white/30 hover:text-white/60 transition-colors">
                            Cerrar ✕
                        </button>
                    </div>
                </div>
            )}

            {showUpgradeModal && lab?.upgradeRequirement && (
                <UpgradeModal
                    structureName="Laboratorio" structureIcon="🧪"
                    currentLevel={lab.level ?? 1}
                    requiredItem={lab.upgradeRequirement.item}
                    requiredQty={lab.upgradeRequirement.quantity}
                    availableQty={upgradeMaterialQty}
                    onConfirm={handleUpgrade}
                    onCancel={() => setShowUpgradeModal(false)}
                    loading={upgrading}
                />
            )}

            <div className="relative rounded-2xl overflow-hidden flex flex-col" style={{
                border: ready ? "1px solid rgba(6,214,160,0.4)" : "1px solid rgba(255,255,255,0.07)",
                boxShadow: ready ? "0 0 24px rgba(6,214,160,0.12)" : "none",
                background: "#0a1520",
            }}>
                <div className="absolute inset-0" style={{
                    backgroundImage: `url('${POSADA_IMAGES.laboratorio}')`,
                    backgroundSize: "cover", backgroundPosition: "center", opacity: 0.18,
                }} />
                <div className="absolute inset-0" style={{
                    background: "linear-gradient(180deg, rgba(10,21,32,0.3) 0%, rgba(10,21,32,0.95) 50%)",
                }} />

                <div className="relative z-10 flex flex-col h-full p-5">
                    <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl"
                                style={{ background: "rgba(6,214,160,0.12)", border: "1px solid rgba(6,214,160,0.2)" }}>
                                🧪
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm leading-tight">Laboratorio</p>
                                <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Objetos y consumibles</p>
                            </div>
                        </div>
                        <LevelBadge
                            level={lab?.level ?? 1}
                            xp={lab?.structureXp}
                            xpToNext={lab?.xpToNextLevel}
                            xpColor={STRUCTURE_XP_COLOR.lab}
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide"
                        style={{ scrollbarWidth: "none" }}>
                        {LAB_ITEMS.map((item) => (
                            <button key={item.id} onClick={() => setSelectedItem(item)}
                                className="flex-shrink-0 flex flex-col items-center gap-1.5 rounded-xl p-2.5 transition-all hover:scale-105 hover:brightness-110"
                                style={{ width: 64, background: `${item.color}10`, border: `1px solid ${item.color}25` }}>
                                <span className="text-2xl" style={{ filter: `drop-shadow(0 0 6px ${item.color}80)` }}>
                                    {item.icon}
                                </span>
                                <span className="text-[9px] font-mono text-center leading-tight"
                                    style={{ color: "rgba(255,255,255,0.5)" }}>
                                    {item.name.split(" ")[0]}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="flex-1" />

                    {msg && (
                        <p className="text-xs font-mono mb-2 px-2 py-1 rounded-lg text-center"
                            style={{ background: "rgba(6,214,160,0.1)", color: "#06d6a0", border: "1px solid rgba(6,214,160,0.2)" }}>
                            ✅ {msg}
                        </p>
                    )}

                    {canUpgrade && (
                        <button onClick={() => setShowUpgradeModal(true)}
                            className="w-full py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all hover:brightness-110 mb-2"
                            style={{ background: "linear-gradient(135deg,#06d6a0,#0891b2)", color: "#fff", boxShadow: "0 0 16px rgba(6,214,160,0.3)" }}>
                            ⬆ Subir Laboratorio de nivel
                        </button>
                    )}

                    {ready ? (
                        <button onClick={handleCollect} disabled={collecting}
                            className="w-full py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all disabled:opacity-50 hover:brightness-110"
                            style={{ background: "linear-gradient(135deg,#06d6a0,#04a57a)", color: "#001a12", boxShadow: "0 0 16px rgba(6,214,160,0.3)" }}>
                            {collecting ? "..." : "🧪 Recoger Elixir"}
                        </button>
                    ) : (
                        <ProgressBar ms={nextCollectMs ?? 8 * 3600 * 1000} totalMs={8 * 3600 * 1000}
                            color={STRUCTURE_XP_COLOR.lab} />
                    )}
                </div>
            </div>
        </>
    );
}

// ─── GUARDERÍA ────────────────────────────────────────────────────────────────
function NurseryCard() {
    const [nursery, setNursery] = useState<any>(null);
    const [allMyths, setAllMyths] = useState<any[]>([]);
    const [collecting, setCollecting] = useState(false);
    const [assigning, setAssigning] = useState(false);
    const [upgrading, setUpgrading] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [upgradeMaterialQty, setUpgradeMaterialQty] = useState(0);
    const [msg, setMsg] = useState("");

    const load = useCallback(async () => {
        try {
            const [n, all, inv] = await Promise.all([api.nurseryStatus(), api.creatures(), api.inventory()]);
            setNursery(n);
            setAllMyths((all as any[]).filter((c: any) => !c.inNursery && c.level < 60));
            if (n?.upgradeRequirement) {
                const mat = (inv as any[]).find((i: any) => i.item === n.upgradeRequirement.item);
                setUpgradeMaterialQty(mat?.quantity ?? 0);
            }
        } catch {}
    }, []);

    useEffect(() => { load(); }, [load]);

    async function handleAssign(creatureId: string) {
        setAssigning(true); setShowPicker(false);
        try {
            await api.nurseryAssign(creatureId);
            setMsg("Myth asignado");
            load();
        } catch (e: any) { setMsg(e.message); }
        finally { setAssigning(false); }
    }

    async function handleCollect() {
        setCollecting(true); setMsg("");
        try {
            const res = await api.nurseryCollect();
            setMsg(`⬆ ${res.myth.name ?? res.myth.speciesId} → Nv. ${res.newLevel}`);
            load();
        } catch (e: any) { setMsg(e.message); }
        finally { setCollecting(false); }
    }

    async function handleRemove() {
        try {
            await api.nurseryRemove();
            setMsg("Myth devuelto al almacén");
            load();
        } catch (e: any) { setMsg(e.message); }
    }

    async function handleUpgrade() {
        setUpgrading(true);
        try {
            await api.nurseryUpgrade();
            setMsg(`⬆ Guardería subida a Nv. ${(nursery?.level ?? 1) + 1}`);
            setShowUpgradeModal(false);
            load();
        } catch (e: any) { setMsg(e.message); setShowUpgradeModal(false); }
        finally { setUpgrading(false); }
    }

    const hasMyth = !!nursery?.myth;
    const isReady = nursery?.ready ?? false;
    const isMaxLevel = nursery?.maxLevel ?? false;
    const canUpgrade = nursery?.canUpgradeXp && nursery?.upgradeRequirement;
    const inParty = allMyths.filter((c) => c.isInParty);
    const inStorage = allMyths.filter((c) => !c.isInParty);

    return (
        <>
            {showUpgradeModal && nursery?.upgradeRequirement && (
                <UpgradeModal
                    structureName="Guardería" structureIcon="🥚"
                    currentLevel={nursery.level ?? 1}
                    requiredItem={nursery.upgradeRequirement.item}
                    requiredQty={nursery.upgradeRequirement.quantity}
                    availableQty={upgradeMaterialQty}
                    onConfirm={handleUpgrade}
                    onCancel={() => setShowUpgradeModal(false)}
                    loading={upgrading}
                />
            )}

            <div className="relative rounded-2xl overflow-hidden flex flex-col" style={{
                border: isReady ? "1px solid rgba(255,214,10,0.4)" : "1px solid rgba(255,255,255,0.07)",
                boxShadow: isReady ? "0 0 24px rgba(255,214,10,0.1)" : "none",
                background: "#0a1520",
            }}>
                <div className="absolute inset-0" style={{
                    backgroundImage: `url('${POSADA_IMAGES.guarderia}')`,
                    backgroundSize: "cover", backgroundPosition: "center", opacity: 0.18,
                }} />
                <div className="absolute inset-0" style={{
                    background: "linear-gradient(180deg, rgba(10,21,32,0.3) 0%, rgba(10,21,32,0.95) 55%)",
                }} />

                <div className="relative z-10 flex flex-col h-full p-5">
                    <div className="flex items-start justify-between mb-1">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl"
                                style={{ background: "rgba(255,214,10,0.1)", border: "1px solid rgba(255,214,10,0.2)" }}>
                                🥚
                            </div>
                            <div>
                                <p className="font-bold text-white text-sm leading-tight">Guardería</p>
                                <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Entrenamiento pasivo</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {hasMyth && (
                                <button onClick={handleRemove}
                                    className="text-xs px-2 py-0.5 rounded-md transition-colors hover:text-red-400"
                                    style={{ color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                    ✕
                                </button>
                            )}
                            <LevelBadge
                                level={nursery?.level ?? 1}
                                xp={nursery?.structureXp}
                                xpToNext={nursery?.xpToNextLevel}
                                xpColor={STRUCTURE_XP_COLOR.nursery}
                            />
                        </div>
                    </div>

                    {!hasMyth && (
                        <>
                            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-2">
                                <div className="text-4xl opacity-20">🥚</div>
                                <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                                    Sin Myth asignado
                                </p>
                            </div>
                            <button onClick={() => setShowPicker((s) => !s)} disabled={assigning}
                                className="w-full py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all disabled:opacity-50"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,214,10,0.25)", color: "rgba(255,214,10,0.8)" }}>
                                {assigning ? "..." : "＋ Asignar Myth"}
                            </button>
                            {showPicker && (
                                <div className="mt-2 flex flex-col gap-1.5 max-h-40 overflow-y-auto pr-1">
                                    {allMyths.length === 0 && (
                                        <p className="text-xs text-center py-2" style={{ color: "rgba(255,255,255,0.3)" }}>Sin Myths disponibles</p>
                                    )}
                                    {inParty.length > 0 && (
                                        <>
                                            <p className="text-[9px] font-mono uppercase tracking-widest px-1 mb-0.5"
                                                style={{ color: "rgba(255,255,255,0.25)" }}>Equipo</p>
                                            {inParty.map((c: any) => (
                                                <button key={c.id} onClick={() => handleAssign(c.id)}
                                                    className="flex items-center justify-between px-3 py-1.5 rounded-lg transition-all text-xs"
                                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                                    <span className="font-bold" style={{ color: "#60a5fa" }}>{c.name ?? c.speciesId}</span>
                                                    <span style={{ color: "rgba(255,255,255,0.35)" }}>Nv. {c.level}</span>
                                                </button>
                                            ))}
                                        </>
                                    )}
                                    {inStorage.length > 0 && (
                                        <>
                                            <p className="text-[9px] font-mono uppercase tracking-widest px-1 mb-0.5 mt-1"
                                                style={{ color: "rgba(255,255,255,0.25)" }}>Almacén</p>
                                            {inStorage.map((c: any) => (
                                                <button key={c.id} onClick={() => handleAssign(c.id)}
                                                    className="flex items-center justify-between px-3 py-1.5 rounded-lg transition-all text-xs"
                                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                                    <span className="font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>{c.name ?? c.speciesId}</span>
                                                    <span style={{ color: "rgba(255,255,255,0.35)" }}>Nv. {c.level}</span>
                                                </button>
                                            ))}
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {hasMyth && !isMaxLevel && (
                        <>
                            <div className="flex-1 flex flex-col items-center justify-center relative mb-3">
                                <div className="absolute rounded-full"
                                    style={{
                                        width: 120, height: 120,
                                        background: "radial-gradient(circle, rgba(255,214,10,0.15) 0%, transparent 70%)",
                                        animation: "nurseryPulse 2.5s ease-in-out infinite",
                                    }} />
                                <div className="absolute rounded-full"
                                    style={{
                                        width: 80, height: 80,
                                        background: "radial-gradient(circle, rgba(255,214,10,0.25) 0%, transparent 70%)",
                                        animation: "nurseryPulse 2.5s ease-in-out infinite 0.4s",
                                    }} />
                                <div className="relative z-10 text-7xl select-none"
                                    style={{
                                        filter: "drop-shadow(0 0 16px rgba(255,214,10,0.6)) drop-shadow(0 0 32px rgba(255,214,10,0.3))",
                                        animation: "nurseryFloat 3s ease-in-out infinite",
                                    }}>
                                    {nursery.myth.art?.front ?? "❓"}
                                </div>
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="absolute rounded-full pointer-events-none"
                                        style={{
                                            width: 4, height: 4,
                                            background: "#ffd60a",
                                            boxShadow: "0 0 6px #ffd60a",
                                            left: `${30 + i * 13}%`,
                                            animation: `nurseryXP 2s ease-in-out infinite ${i * 0.5}s`,
                                        }} />
                                ))}
                            </div>

                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="font-bold text-sm" style={{ color: "#ffd60a" }}>
                                        {nursery.myth.name ?? nursery.myth.speciesId}
                                    </p>
                                    <p className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
                                        Nv. {nursery.myth.level} → {nursery.myth.level + 1}
                                    </p>
                                </div>
                                {isReady && (
                                    <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                                        style={{ background: "rgba(255,214,10,0.15)", color: "#ffd60a", border: "1px solid rgba(255,214,10,0.3)" }}>
                                        ⚡ Listo
                                    </span>
                                )}
                            </div>

                            {msg && (
                                <p className="text-xs font-mono mb-2 px-2 py-1 rounded-lg text-center"
                                    style={{ background: "rgba(6,214,160,0.1)", color: "#06d6a0", border: "1px solid rgba(6,214,160,0.2)" }}>
                                    {msg}
                                </p>
                            )}

                            {canUpgrade && (
                                <button onClick={() => setShowUpgradeModal(true)}
                                    className="w-full py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all hover:brightness-110 mb-2"
                                    style={{ background: "linear-gradient(135deg,#ffd60a,#e6a800)", color: "#1a0f00", boxShadow: "0 0 16px rgba(255,214,10,0.3)" }}>
                                    ⬆ Subir Guardería de nivel
                                </button>
                            )}

                            {isReady ? (
                                <button onClick={handleCollect} disabled={collecting}
                                    className="w-full py-2.5 rounded-xl font-bold text-xs tracking-widest uppercase transition-all disabled:opacity-50 hover:brightness-110"
                                    style={{ background: "linear-gradient(135deg,#ffd60a,#e6a800)", color: "#1a0f00", boxShadow: "0 0 16px rgba(255,214,10,0.3)" }}>
                                    {collecting ? "..." : "⬆ Subir nivel"}
                                </button>
                            ) : (
                                <ProgressBar ms={nursery.nextCollectMs} totalMs={nursery.currentLevelCooldownMs}
                                    color={STRUCTURE_XP_COLOR.nursery} />
                            )}
                        </>
                    )}

                    {hasMyth && isMaxLevel && (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2">
                            <div className="text-5xl" style={{ filter: "drop-shadow(0 0 12px rgba(255,214,10,0.6))" }}>
                                {nursery.myth.art?.front ?? "❓"}
                            </div>
                            <p className="text-xs font-bold" style={{ color: "#ffd60a" }}>🏆 Nivel máximo (60)</p>
                            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                                {nursery.myth.name ?? nursery.myth.speciesId}
                            </p>
                        </div>
                    )}
                </div>

                <style>{`
                    @keyframes nurseryPulse {
                        0%,100% { transform: scale(1); opacity: 0.6; }
                        50%      { transform: scale(1.15); opacity: 1; }
                    }
                    @keyframes nurseryFloat {
                        0%,100% { transform: translateY(0px); }
                        50%     { transform: translateY(-8px); }
                    }
                    @keyframes nurseryXP {
                        0%   { transform: translateY(0px); opacity: 0; }
                        30%  { opacity: 1; }
                        100% { transform: translateY(-40px); opacity: 0; }
                    }
                `}</style>
            </div>
        </>
    );
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────────
export default function PosadaPage() {
    const [inventory, setInventory] = useState<any[]>([]);

    useEffect(() => {
        api.inventory().then(setInventory).catch(() => {});
    }, []);

    return (
        <Layout sidebar={<TrainerSidebar />}>
            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
            `}</style>

            <div className="flex-shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
                <h1 className="font-display font-bold text-2xl tracking-widest">
                    Mi <span className="text-red">Posada</span>
                </h1>
                <div className="flex gap-2">
                    {inventory.slice(0, 4).map((item: any) => (
                        <div key={item.item}
                            className="bg-bg3 border border-border rounded-lg px-2 py-1 flex items-center gap-1.5 text-xs">
                            <span className="text-yellow font-bold font-display text-sm">{item.quantity}</span>
                            <span className="text-muted">{item.item.replace(/_/g, " ")}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex-1 p-5 grid grid-cols-2 grid-rows-2 gap-4 overflow-hidden">
                <MineCard />
                <ForgeCard />
                <LabCard />
                <NurseryCard />
            </div>
        </Layout>
    );
}
