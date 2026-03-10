import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import TrainerSidebar from "../components/TrainerSidebar";
import { api } from "../lib/api";
import { useTrainer } from "../context/TrainerContext";
// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

type Affinity = "EMBER" | "TIDE" | "GROVE" | "VOLT" | "STONE" | "FROST" | "VENOM" | "ASTRAL" | "IRON" | "SHADE";

interface Move {
    id: string;
    name: string;
    affinity: Affinity;
    power: number;
    accuracy: number;
    description: string;
}

interface BattleMyth {
    instanceId: string;
    speciesId: string;
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
    affinities: Affinity[];
    moves: Move[];
    art: { portrait: string; front: string; back: string };
    status: null | "poisoned" | "burned" | "stunned";
    defeated: boolean;
}

interface BattleSession {
    battleId: string;
    playerTeam: BattleMyth[];
    enemyTeam: BattleMyth[];
    turn: number;
    status: "ongoing" | "win" | "lose";
}

// Deep clone para forzar re-render en React (CRÍTICO para que el HP se actualice visualmente)
function cloneSession(s: any): BattleSession {
    return JSON.parse(JSON.stringify(s));
}

// ─────────────────────────────────────────
// Affinity config — colores, emojis y efectos de proyectil
// ─────────────────────────────────────────

const AFFINITY_CONFIG: Record<
    Affinity,
    {
        color: string;
        bg: string;
        glow: string;
        emoji: string;
        label: string;
        projEmoji: string;
        projTrail: string;
    }
> = {
    EMBER: {
        color: "text-orange-400",
        bg: "bg-orange-500/20",
        glow: "#f97316",
        emoji: "🔥",
        label: "Brasa",
        projEmoji: "🔥",
        projTrail: "rgba(249,115,22,0.6)",
    },
    TIDE: {
        color: "text-blue-400",
        bg: "bg-blue-500/20",
        glow: "#3b82f6",
        emoji: "🌊",
        label: "Marea",
        projEmoji: "💧",
        projTrail: "rgba(59,130,246,0.6)",
    },
    GROVE: {
        color: "text-green-400",
        bg: "bg-green-500/20",
        glow: "#22c55e",
        emoji: "🌿",
        label: "Bosque",
        projEmoji: "🍃",
        projTrail: "rgba(34,197,94,0.6)",
    },
    VOLT: {
        color: "text-yellow-300",
        bg: "bg-yellow-400/20",
        glow: "#fde047",
        emoji: "⚡",
        label: "Voltio",
        projEmoji: "⚡",
        projTrail: "rgba(253,224,71,0.8)",
    },
    STONE: {
        color: "text-stone-400",
        bg: "bg-stone-500/20",
        glow: "#a8a29e",
        emoji: "🪨",
        label: "Piedra",
        projEmoji: "🪨",
        projTrail: "rgba(168,162,158,0.6)",
    },
    FROST: {
        color: "text-cyan-300",
        bg: "bg-cyan-500/20",
        glow: "#67e8f9",
        emoji: "❄️",
        label: "Escarcha",
        projEmoji: "❄️",
        projTrail: "rgba(103,232,249,0.7)",
    },
    VENOM: {
        color: "text-purple-400",
        bg: "bg-purple-500/20",
        glow: "#a855f7",
        emoji: "🧪",
        label: "Veneno",
        projEmoji: "☠️",
        projTrail: "rgba(168,85,247,0.6)",
    },
    ASTRAL: {
        color: "text-indigo-300",
        bg: "bg-indigo-500/20",
        glow: "#818cf8",
        emoji: "✨",
        label: "Astral",
        projEmoji: "✨",
        projTrail: "rgba(129,140,248,0.7)",
    },
    IRON: {
        color: "text-slate-300",
        bg: "bg-slate-500/20",
        glow: "#94a3b8",
        emoji: "⚙️",
        label: "Hierro",
        projEmoji: "⚙️",
        projTrail: "rgba(148,163,184,0.6)",
    },
    SHADE: {
        color: "text-violet-400",
        bg: "bg-violet-700/20",
        glow: "#7c3aed",
        emoji: "🌑",
        label: "Sombra",
        projEmoji: "🌑",
        projTrail: "rgba(124,58,237,0.7)",
    },
};

// ─────────────────────────────────────────
// HP Bar
// ─────────────────────────────────────────

function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
    const pct = maxHp > 0 ? Math.max(0, (hp / maxHp) * 100) : 0;
    const color = pct > 50 ? "bg-emerald-400" : pct > 25 ? "bg-yellow-400" : "bg-red-500";
    return (
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
                className={`h-full rounded-full ${color} transition-all duration-700 ease-out`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

// ─────────────────────────────────────────
// Projectile — viaja de un lado a otro
// ─────────────────────────────────────────

interface ProjectileState {
    affinity: Affinity;
    direction: "ltr" | "rtl"; // ltr = player → enemy, rtl = enemy → player
}

function Projectile({ proj }: { proj: ProjectileState }) {
    const cfg = AFFINITY_CONFIG[proj.affinity];
    return (
        <div
            className={`absolute top-1/2 z-50 pointer-events-none text-3xl
                ${proj.direction === "ltr" ? "animate-proj-ltr left-8" : "animate-proj-rtl right-8"}`}
            style={{ filter: `drop-shadow(0 0 10px ${cfg.glow}) drop-shadow(0 0 20px ${cfg.glow})` }}
        >
            {cfg.projEmoji}
        </div>
    );
}

// ─────────────────────────────────────────
// Myth slot card
// ─────────────────────────────────────────

interface MythSlotProps {
    myth: BattleMyth;
    selected?: boolean;
    targeted?: boolean;
    flashAffinity?: Affinity | null;
    floatingDmg?: { value: number; crit: boolean; mult: number } | null;
    onClick?: () => void;
}

function MythSlot({ myth, selected, targeted, flashAffinity, floatingDmg, onClick }: MythSlotProps) {
    const cfg = flashAffinity ? AFFINITY_CONFIG[flashAffinity] : null;
    const canClick = onClick && !myth.defeated;

    return (
        <div className="relative flex flex-col items-center gap-1 w-24">
            {/* Daño flotante */}
            {floatingDmg && (
                <div
                    className={`absolute -top-8 left-1/2 z-30 font-black text-sm pointer-events-none animate-float-dmg
                    ${floatingDmg.crit ? "text-yellow-300 scale-125" : floatingDmg.mult >= 2 ? "text-orange-400" : floatingDmg.mult <= 0.5 ? "text-blue-300" : "text-white"}`}
                >
                    {floatingDmg.value > 0 ? `-${floatingDmg.value}` : "¡Fallo!"}
                    {floatingDmg.crit && <span className="text-xs ml-0.5">!</span>}
                </div>
            )}

            {/* Tarjeta del Myth */}
            <div
                onClick={canClick ? onClick : undefined}
                className={`relative w-20 h-20 rounded-xl border-2 flex items-center justify-center overflow-hidden
                    transition-all duration-200
                    ${
                        myth.defeated
                            ? "border-slate-700 bg-slate-900/60 grayscale opacity-30 cursor-not-allowed"
                            : selected
                              ? "border-blue-400 bg-blue-500/10 shadow-lg cursor-pointer scale-110"
                              : targeted
                                ? "border-red-400 bg-red-500/10 shadow-lg cursor-pointer scale-110"
                                : canClick
                                  ? "border-slate-600 bg-slate-800/60 hover:border-slate-400 hover:scale-105 cursor-pointer"
                                  : "border-slate-700 bg-slate-800/40"
                    }`}
                style={{
                    boxShadow: selected
                        ? "0 0 16px rgba(96,165,250,0.5)"
                        : targeted
                          ? "0 0 16px rgba(248,113,113,0.5), 0 0 4px rgba(248,113,113,0.8)"
                          : cfg
                            ? `0 0 20px ${cfg.glow}`
                            : undefined,
                }}
            >
                {/* Flash de impacto */}
                {cfg && (
                    <div
                        className="absolute inset-0 rounded-xl animate-impact-flash pointer-events-none"
                        style={{ background: `${cfg.glow}55` }}
                    />
                )}

                {/* Pulso de selección */}
                {selected && !myth.defeated && (
                    <div className="absolute inset-0 rounded-xl border-2 border-blue-400/50 animate-pulse pointer-events-none" />
                )}
                {targeted && !myth.defeated && (
                    <div className="absolute inset-0 rounded-xl border-2 border-red-400/60 animate-pulse pointer-events-none" />
                )}

                {myth.defeated ? (
                    <span className="text-3xl opacity-40">💀</span>
                ) : (
                    <span className={`text-4xl ${cfg ? "animate-myth-shake" : ""}`}>{myth.art?.front ?? "❓"}</span>
                )}
            </div>

            <p
                className={`text-xs font-bold truncate w-20 text-center font-mono
                ${myth.defeated ? "text-slate-600" : selected ? "text-blue-300" : targeted ? "text-red-400" : "text-slate-200"}`}
            >
                {myth.name}
            </p>
            <p className="text-slate-500 text-xs font-mono">Nv.{myth.level}</p>

            {!myth.defeated && (
                <div className="w-20">
                    <HpBar hp={myth.hp} maxHp={myth.maxHp} />
                    <p className="text-slate-500 text-xs text-center mt-0.5 font-mono tabular-nums">
                        {myth.hp}
                        <span className="text-slate-700">/{myth.maxHp}</span>
                    </p>
                </div>
            )}

            {!myth.defeated &&
                myth.affinities?.[0] &&
                (() => {
                    const ac = AFFINITY_CONFIG[myth.affinities[0] as Affinity];
                    return ac ? (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${ac.bg} ${ac.color} font-mono`}>
                            {ac.emoji} {myth.affinities[0]}
                        </span>
                    ) : null;
                })()}
        </div>
    );
}

// ─────────────────────────────────────────
// Prep screen — drag & drop con equipo + almacén
// ─────────────────────────────────────────

function PrepScreen({
    myths,
    onStart,
    loading,
}: {
    myths: any[];
    onStart: (order: string[]) => void;
    loading: boolean;
}) {
    const [slots, setSlots] = useState<(any | null)[]>([null, null, null]);
    const [bench, setBench] = useState<any[]>([]);
    const [ready, setReady] = useState(false);
    const dragRef = useRef<{ myth: any; from: "slot" | "bench"; slotIdx: number } | null>(null);

    useEffect(() => {
        if (myths.length > 0 && !ready) {
            setBench(myths);
            setReady(true);
        }
    }, [myths, ready]);

    const mythId = (m: any): string => m.id ?? m.instanceId ?? "";

    const handleDragStart = (myth: any, from: "slot" | "bench", slotIdx: number) => {
        dragRef.current = { myth, from, slotIdx };
    };

    const handleDropSlot = (idx: number) => {
        if (!dragRef.current) return;
        const { myth, from, slotIdx } = dragRef.current;
        const ns = [...slots];
        const nb = [...bench];

        if (from === "bench") {
            const displaced = ns[idx];
            ns[idx] = myth;
            if (displaced) nb.push(displaced);
            setBench(nb.filter((m) => mythId(m) !== mythId(myth)));
        } else {
            const tmp = ns[idx];
            ns[idx] = myth;
            ns[slotIdx] = tmp;
        }
        setSlots(ns);
        dragRef.current = null;
    };

    const handleDropBench = () => {
        if (!dragRef.current || dragRef.current.from !== "slot") {
            dragRef.current = null;
            return;
        }
        const { myth, slotIdx } = dragRef.current;
        const ns = [...slots];
        ns[slotIdx] = null;
        setSlots(ns);
        setBench((b) => [...b, myth]);
        dragRef.current = null;
    };

    const order = slots.filter(Boolean).map(mythId);
    const canStart = order.length >= 1;
    const partyMyths = bench.filter((m) => m.isInParty);
    const storeMyths = bench.filter((m) => !m.isInParty);

    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 overflow-auto">
            <div className="text-center">
                <h2 className="font-mono text-xl font-black tracking-widest text-yellow-400 uppercase">
                    ⚔️ Preparación de combate
                </h2>
                <p className="text-slate-400 text-sm mt-1">Arrastra hasta 3 Myths a los slots para combatir</p>
            </div>

            {/* Slots */}
            <div className="flex gap-4">
                {slots.map((myth, i) => (
                    <div
                        key={i}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDropSlot(i)}
                        className={`w-24 h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all
                            ${myth ? "border-blue-500/60 bg-blue-500/5" : "border-slate-700 bg-slate-800/30 hover:border-slate-500"}`}
                    >
                        {myth ? (
                            <div
                                draggable
                                onDragStart={() => handleDragStart(myth, "slot", i)}
                                className="flex flex-col items-center gap-1 cursor-grab px-2 w-full"
                            >
                                <span className="text-4xl">{myth.art?.front ?? "❓"}</span>
                                <p className="font-mono text-xs text-white font-bold truncate w-full text-center">
                                    {myth.name}
                                </p>
                                <p className="text-slate-400 text-xs font-mono">Nv.{myth.level}</p>
                                {myth.affinities?.[0] &&
                                    (() => {
                                        const ac = AFFINITY_CONFIG[myth.affinities[0] as Affinity];
                                        return ac ? (
                                            <span
                                                className={`text-xs px-1.5 py-0.5 rounded-full ${ac.bg} ${ac.color} font-mono`}
                                            >
                                                {ac.emoji}
                                            </span>
                                        ) : null;
                                    })()}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-1 opacity-25">
                                <span className="text-2xl">＋</span>
                                <p className="font-mono text-xs text-slate-500">Slot {i + 1}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Bench */}
            <div className="w-full max-w-2xl" onDragOver={(e) => e.preventDefault()} onDrop={handleDropBench}>
                <p className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-2 text-center">
                    — Myths disponibles —
                </p>
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-4 min-h-20">
                    {bench.length === 0 && (
                        <p className="text-slate-600 text-xs text-center font-mono">
                            Todos los Myths en posición de combate
                        </p>
                    )}
                    {partyMyths.length > 0 && (
                        <div className="mb-3">
                            <p className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-2">
                                ⚔️ Equipo <span className="text-slate-600">({partyMyths.length})</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {partyMyths.map((m) => (
                                    <BenchCard key={mythId(m)} myth={m} onDragStart={handleDragStart} />
                                ))}
                            </div>
                        </div>
                    )}
                    {storeMyths.length > 0 && (
                        <div>
                            <p className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-2">
                                📦 Almacén <span className="text-slate-600">({storeMyths.length})</span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {storeMyths.map((m) => (
                                    <BenchCard key={mythId(m)} myth={m} onDragStart={handleDragStart} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={() => canStart && onStart(order)}
                disabled={!canStart || loading}
                className={`px-12 py-3 rounded-xl font-mono font-black text-sm tracking-widest uppercase transition-all
                    ${
                        canStart && !loading
                            ? "bg-red-600 text-white hover:bg-red-500 hover:scale-105 shadow-lg shadow-red-900/50"
                            : "bg-slate-800 text-slate-600 cursor-not-allowed"
                    }`}
            >
                {loading ? "Iniciando..." : `⚔️ Combatir (${order.length} Myth${order.length !== 1 ? "s" : ""})`}
            </button>
        </div>
    );
}

function BenchCard({ myth, onDragStart }: { myth: any; onDragStart: (m: any, from: "bench", idx: number) => void }) {
    const mythId = (m: any) => m.id ?? m.instanceId ?? "";
    return (
        <div
            draggable
            onDragStart={() => onDragStart(myth, "bench", -1)}
            className="flex flex-col items-center gap-1 w-20 cursor-grab active:cursor-grabbing
                p-2 rounded-lg border border-slate-700 bg-slate-800/60 hover:border-slate-500 transition-all select-none"
        >
            <span className="text-3xl">{myth.art?.front ?? "❓"}</span>
            <p className="font-mono text-xs text-white font-bold truncate w-full text-center">{myth.name}</p>
            <p className="text-slate-500 text-xs font-mono">Nv.{myth.level}</p>
            {myth.isInParty ? (
                <span className="text-xs text-blue-400 font-mono">equipo</span>
            ) : (
                <span className="text-xs text-slate-500 font-mono">almacén</span>
            )}
        </div>
    );
}

// ─────────────────────────────────────────
// Main BattlePage
// ─────────────────────────────────────────

type Phase = "prep" | "battle" | "result";
type BattleMode = "npc" | "pvp";

export default function BattlePage() {
    const location = useLocation();
    const navigate = useNavigate();

    const searchParams = new URLSearchParams(location.search);
    const initialMode: BattleMode =
        (location.state as any)?.mode === "pvp" || searchParams.get("mode") === "pvp" ? "pvp" : "npc";
    const [mode, setMode] = useState<BattleMode>(initialMode);

    useEffect(() => {
        const m = (location.state as any)?.mode;
        if (m === "pvp" || m === "npc") setMode(m);
    }, [location.state]);

    const [phase, setPhase] = useState<Phase>("prep");
    const [allMyths, setAllMyths] = useState<any[]>([]);
    const [session, setSession] = useState<BattleSession | null>(null);
    const [loadingStart, setLoadingStart] = useState(false);
    const [animating, setAnimating] = useState(false);

    const [activePlayerMythId, setActivePlayerMythId] = useState<string | null>(null);
    const [targetEnemyMythId, setTargetEnemyMythId] = useState<string | null>(null);

    // Animaciones
    const [projectile, setProjectile] = useState<ProjectileState | null>(null);
    const [flashMap, setFlashMap] = useState<Record<string, Affinity>>({});
    const [floatMap, setFloatMap] = useState<Record<string, { value: number; crit: boolean; mult: number }>>({});

    const [log, setLog] = useState<{ text: string; type: "normal" | "good" | "bad" | "crit" | "miss" | "system" }[]>(
        [],
    );
    const logRef = useRef<HTMLDivElement>(null);
    const [result, setResult] = useState<{ status: "win" | "lose"; xp?: number; coins?: number } | null>(null);
    const { reload } = useTrainer();

    useEffect(() => {
        api.creatures()
            .then((d) => setAllMyths(d ?? []))
            .catch(() => {});
        api.battleNpcActive()
            .then((s: any) => {
                if (s?.status === "ongoing") {
                    setSession(cloneSession(s));
                    setPhase("battle");
                    autoSelect(s);
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [log]);

    function autoSelect(s: BattleSession) {
        const fp = s.playerTeam.find((m) => !m.defeated);
        const fe = s.enemyTeam.find((m) => !m.defeated);
        if (fp) setActivePlayerMythId(fp.instanceId);
        if (fe) setTargetEnemyMythId(fe.instanceId);
    }

    type LogType = "normal" | "good" | "bad" | "crit" | "miss" | "system";
    function addLog(text: string, type: LogType = "normal") {
        setLog((l) => [...l.slice(-50), { text, type }]);
    }

    function sleep(ms: number) {
        return new Promise<void>((r) => setTimeout(r, ms));
    }

    async function flashAndFloat(instanceId: string, affinity: Affinity, dmg: number, crit: boolean, mult: number) {
        setFlashMap((m) => ({ ...m, [instanceId]: affinity }));
        setFloatMap((m) => ({ ...m, [instanceId]: { value: dmg, crit, mult } }));
        await sleep(600);
        setFlashMap((m) => {
            const n = { ...m };
            delete n[instanceId];
            return n;
        });
        await sleep(400);
        setFloatMap((m) => {
            const n = { ...m };
            delete n[instanceId];
            return n;
        });
    }

    async function handleStart(order: string[]) {
        setLoadingStart(true);
        try {
            const s = await api.battleNpcStart(order);
            setSession(cloneSession(s));
            setPhase("battle");
            autoSelect(s);
            addLog("⚔️ ¡Comienza el combate!", "system");
            await reload();
        } catch (e: any) {
            alert(e.message ?? "Error al iniciar combate");
        } finally {
            setLoadingStart(false);
        }
    }

    async function handleMove(moveId: string) {
        if (!session || !activePlayerMythId || animating) return;

        const playerMyth = session.playerTeam.find((m) => m.instanceId === activePlayerMythId);
        const targetMyth = session.enemyTeam.find((m) => m.instanceId === targetEnemyMythId);
        if (!playerMyth || !targetMyth) return;
        const move = playerMyth.moves.find((mv) => mv.id === moveId);
        if (!move) return;

        setAnimating(true);
        try {
            const res = await api.battleNpcTurn(
                session.battleId,
                activePlayerMythId,
                moveId,
                targetEnemyMythId ?? undefined,
            );
            const { session: rawSession, playerAction, npcAction, xpGained, coinsGained } = res;
            const newSession: BattleSession = cloneSession(rawSession);

            // ── 1. Log acción del jugador ──
            addLog(`${playerAction.myth} → ${playerAction.move} → ${playerAction.target}`, "normal");

            // ── 2. Proyectil player → enemy ──
            setProjectile({ affinity: playerAction.moveAffinity as Affinity, direction: "ltr" });
            await sleep(480);
            setProjectile(null);
            await sleep(80);

            // ── 3. Flash + daño en el enemigo objetivo ──
            const eTarget = newSession.enemyTeam.find((m: BattleMyth) => m.name === playerAction.target);
            if (eTarget) {
                await flashAndFloat(
                    eTarget.instanceId,
                    playerAction.moveAffinity as Affinity,
                    playerAction.damage,
                    playerAction.crit,
                    playerAction.mult,
                );
            }

            if (playerAction.mult >= 2) addLog(`¡Súper eficaz! ×${playerAction.mult}`, "good");
            else if (playerAction.mult < 1) addLog(`Poco eficaz... ×${playerAction.mult}`, "bad");
            if (playerAction.crit) addLog("💥 ¡Golpe crítico!", "crit");
            if (playerAction.damage === 0) addLog("El ataque falló", "miss");

            // ── 4. Actualizar HP parcial del enemigo impactado ──
            setSession((prev) => {
                if (!prev) return prev;
                const next = cloneSession(prev);
                const updated = newSession.enemyTeam.find((m: BattleMyth) => m.instanceId === eTarget?.instanceId);
                if (updated) {
                    const t = next.enemyTeam.find((m: BattleMyth) => m.instanceId === updated.instanceId);
                    if (t) {
                        t.hp = updated.hp;
                        t.defeated = updated.defeated;
                    }
                }
                return next;
            });
            await sleep(200);

            // ── 5. NPC contraataca ──
            addLog(`${npcAction.myth} → ${npcAction.move} → ${npcAction.target}`, "normal");
            setProjectile({ affinity: npcAction.moveAffinity as Affinity, direction: "rtl" });
            await sleep(480);
            setProjectile(null);
            await sleep(80);

            const pTarget = newSession.playerTeam.find((m: BattleMyth) => m.name === npcAction.target);
            if (pTarget) {
                await flashAndFloat(
                    pTarget.instanceId,
                    npcAction.moveAffinity as Affinity,
                    npcAction.damage,
                    npcAction.crit,
                    npcAction.mult,
                );
            }

            if (npcAction.mult >= 2) addLog(`¡Rival súper eficaz! ×${npcAction.mult}`, "bad");
            else if (npcAction.mult < 1) addLog(`Rival poco eficaz ×${npcAction.mult}`, "good");
            if (npcAction.crit) addLog("💥 ¡Crítico del rival!", "crit");
            if (npcAction.damage === 0) addLog("El rival falló", "miss");

            // ── 6. Aplicar sesión completa (actualiza TODOS los HP) ──
            setSession(newSession);
            await sleep(150);

            // ── 7. Fin de combate ──
            if (newSession.status === "win" || newSession.status === "lose") {
                addLog(
                    newSession.status === "win" ? "🏆 ¡Victoria!" : "💀 Derrota...",
                    newSession.status === "win" ? "good" : "bad",
                );
                setResult({ status: newSession.status, xp: xpGained, coins: coinsGained });
                setPhase("result");
                window.dispatchEvent(new Event("sidebar:reload"));
            } else {
                // Auto-reselect primer vivo
                const np = newSession.playerTeam.find((m: BattleMyth) => !m.defeated);
                const ne = newSession.enemyTeam.find((m: BattleMyth) => !m.defeated);
                if (np) setActivePlayerMythId(np.instanceId);
                if (ne) setTargetEnemyMythId(ne.instanceId);
            }
        } catch (e: any) {
            addLog(`Error: ${e.message}`, "bad");
        } finally {
            setAnimating(false);
        }
    }

    async function handleCapture() {
        if (!session || !targetEnemyMythId || animating) return;
        setAnimating(true);
        try {
            const res = await api.battleNpcCapture(session.battleId, targetEnemyMythId);
            if (res.success) {
                addLog("✅ ¡Captura exitosa!", "good");
                const ns = cloneSession(res.session);
                setSession(ns);
                if (ns.status === "win") {
                    setResult({ status: "win" });
                    setPhase("result");
                    window.dispatchEvent(new Event("sidebar:reload"));
                }
            } else {
                addLog(
                    `❌ Captura fallida${res.counterDamage ? ` — contraataque: ${res.counterDamage} dmg` : ""}`,
                    "bad",
                );
                const ns = cloneSession(res.session);
                setSession(ns);
                if (ns.status === "lose") {
                    setResult({ status: "lose" });
                    setPhase("result");
                }
            }
        } catch (e: any) {
            addLog(`Error: ${e.message}`, "bad");
        } finally {
            setAnimating(false);
        }
    }

    async function handleFlee() {
        if (!session || animating) return;
        try {
            await api.battleNpcFlee(session.battleId);
            addLog("🏃 Huiste del combate", "bad");
            setResult({ status: "lose" });
            setPhase("result");
        } catch (e: any) {
            addLog(`Error: ${e.message}`, "bad");
        }
    }

    const activePlayerMyth = session?.playerTeam.find((m) => m.instanceId === activePlayerMythId);
    const targetEnemy = session?.enemyTeam.find((m) => m.instanceId === targetEnemyMythId);
    const canCapture = targetEnemy && !targetEnemy.defeated && targetEnemy.hp / targetEnemy.maxHp < 0.25;

    // ── PvP ──
    if (mode === "pvp") {
        return (
            <Layout sidebar={<TrainerSidebar />}>
                <div className="flex-1 flex flex-col overflow-hidden">
                    <TabBar mode={mode} onSwitch={setMode} />
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center max-w-sm">
                            <div className="text-6xl mb-4">⚔️</div>
                            <h2 className="font-mono text-2xl font-black text-yellow-400 tracking-widest mb-3">
                                PvP — Próximamente
                            </h2>
                            <p className="text-slate-400 text-sm leading-relaxed">
                                El combate entre Binders está en construcción.
                            </p>
                            <div className="mt-6 px-4 py-2 rounded-lg border border-slate-700 text-slate-500 text-xs font-mono tracking-wider">
                                🔒 En desarrollo
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    // ── Resultado ──
    if (phase === "result" && result) {
        return (
            <Layout sidebar={<TrainerSidebar />}>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-sm">
                        <div className="text-7xl mb-4 animate-bounce">{result.status === "win" ? "🏆" : "💀"}</div>
                        <h2
                            className={`font-mono text-3xl font-black tracking-widest mb-2 ${result.status === "win" ? "text-yellow-400" : "text-red-500"}`}
                        >
                            {result.status === "win" ? "¡VICTORIA!" : "DERROTA"}
                        </h2>
                        {result.status === "win" && (
                            <div className="flex gap-4 justify-center mt-4 mb-6">
                                {result.xp && (
                                    <div className="px-4 py-2 rounded-lg border border-blue-500/40 bg-blue-500/10">
                                        <p className="font-mono font-black text-lg text-blue-300">+{result.xp}</p>
                                        <p className="text-slate-500 text-xs font-mono">XP</p>
                                    </div>
                                )}
                                {result.coins && (
                                    <div className="px-4 py-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10">
                                        <p className="font-mono font-black text-lg text-yellow-300">+{result.coins}</p>
                                        <p className="text-slate-500 text-xs font-mono">Monedas</p>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex gap-3 justify-center mt-4">
                            <button
                                onClick={() => {
                                    setPhase("prep");
                                    setSession(null);
                                    setLog([]);
                                    setResult(null);
                                }}
                                className="px-6 py-2.5 rounded-xl bg-red-700 text-white font-mono font-black text-sm tracking-widest uppercase hover:bg-red-600 transition-all"
                            >
                                ⚔️ Volver a combatir
                            </button>
                            <button
                                onClick={() => navigate("/")}
                                className="px-6 py-2.5 rounded-xl border border-slate-700 text-slate-400 font-mono text-sm tracking-widest uppercase hover:border-slate-500 hover:text-white transition-all"
                            >
                                🏡 Posada
                            </button>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    // ── Prep ──
    if (phase === "prep") {
        return (
            <Layout sidebar={<TrainerSidebar />}>
                <div className="flex-1 flex flex-col overflow-hidden">
                    <TabBar mode={mode} onSwitch={setMode} />
                    <PrepScreen myths={allMyths} onStart={handleStart} loading={loadingStart} />
                </div>
            </Layout>
        );
    }

    // ── Arena ──
    return (
        <Layout sidebar={<TrainerSidebar />}>
            <style>{`
                @keyframes projLtr {
                    0%   { opacity:0; transform:translateY(-50%) scale(0.5) translateX(0px); }
                    15%  { opacity:1; transform:translateY(-50%) scale(1.2) translateX(20px); }
                    85%  { opacity:1; transform:translateY(-50%) scale(1) translateX(240px); }
                    100% { opacity:0; transform:translateY(-50%) scale(0.8) translateX(280px); }
                }
                @keyframes projRtl {
                    0%   { opacity:0; transform:translateY(-50%) scale(0.5) translateX(0px); }
                    15%  { opacity:1; transform:translateY(-50%) scale(1.2) translateX(-20px); }
                    85%  { opacity:1; transform:translateY(-50%) scale(1) translateX(-240px); }
                    100% { opacity:0; transform:translateY(-50%) scale(0.8) translateX(-280px); }
                }
                @keyframes floatDmg {
                    0%   { opacity:0; transform:translateX(-50%) translateY(0) scale(0.8); }
                    15%  { opacity:1; transform:translateX(-50%) translateY(-4px) scale(1.1); }
                    80%  { opacity:1; transform:translateX(-50%) translateY(-20px) scale(1); }
                    100% { opacity:0; transform:translateX(-50%) translateY(-32px) scale(0.9); }
                }
                @keyframes impactFlash {
                    0%,100% { opacity:0; }
                    20%,70% { opacity:1; }
                }
                @keyframes mythShake {
                    0%,100% { transform:translateX(0) rotate(0deg); }
                    20%     { transform:translateX(-5px) rotate(-2deg); }
                    40%     { transform:translateX(5px) rotate(2deg); }
                    60%     { transform:translateX(-3px) rotate(-1deg); }
                    80%     { transform:translateX(3px) rotate(1deg); }
                }
                @keyframes logFadeIn {
                    from { opacity:0; transform:translateX(-6px); }
                    to   { opacity:1; transform:translateX(0); }
                }
                .animate-proj-ltr { animation: projLtr 0.52s cubic-bezier(0.4,0,0.2,1) forwards; }
                .animate-proj-rtl { animation: projRtl 0.52s cubic-bezier(0.4,0,0.2,1) forwards; }
                .animate-float-dmg { animation: floatDmg 0.9s ease-out forwards; }
                .animate-impact-flash { animation: impactFlash 0.55s ease-in-out; }
                .animate-myth-shake { animation: mythShake 0.45s ease-in-out; }
                .animate-log-in { animation: logFadeIn 0.2s ease-out both; }
            `}</style>

            <div className="flex-1 flex flex-col overflow-hidden">
                <TabBar mode={mode} onSwitch={setMode} />

                <div className="flex-1 flex overflow-hidden">
                    {/* ── Arena + controles ── */}
                    <div className="flex-1 flex flex-col p-4 gap-3 overflow-auto min-w-0">
                        <div className="flex items-center justify-between flex-shrink-0">
                            <span className="font-mono text-xs text-slate-500 tracking-widest">
                                Turno {session?.turn ?? 0}
                            </span>
                            {animating && (
                                <span className="font-mono text-xs text-yellow-400 animate-pulse tracking-widest">
                                    ⚡ Resolviendo turno...
                                </span>
                            )}
                        </div>

                        {/* Rivales */}
                        <div className="flex-shrink-0">
                            <p className="font-mono text-xs text-slate-500 tracking-widest uppercase mb-2 text-center">
                                ▲ Rivales
                            </p>
                            <div className="relative flex gap-4 justify-center min-h-32">
                                {projectile?.direction === "ltr" && <Projectile proj={projectile} />}
                                {session?.enemyTeam.map((myth) => (
                                    <MythSlot
                                        key={myth.instanceId}
                                        myth={myth}
                                        targeted={myth.instanceId === targetEnemyMythId}
                                        flashAffinity={flashMap[myth.instanceId]}
                                        floatingDmg={floatMap[myth.instanceId]}
                                        onClick={() => {
                                            if (!myth.defeated && !animating) setTargetEnemyMythId(myth.instanceId);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Divisor VS */}
                        <div className="flex-shrink-0 flex items-center gap-3 px-4">
                            <div className="flex-1 h-px bg-slate-800" />
                            <span className="text-slate-600 text-xs font-mono tracking-widest">— VS —</span>
                            <div className="flex-1 h-px bg-slate-800" />
                        </div>

                        {/* Jugador */}
                        <div className="flex-shrink-0">
                            <p className="font-mono text-xs text-slate-500 tracking-widest uppercase mb-2 text-center">
                                ▼ Tu equipo
                            </p>
                            <div className="relative flex gap-4 justify-center min-h-32">
                                {projectile?.direction === "rtl" && <Projectile proj={projectile} />}
                                {session?.playerTeam.map((myth) => (
                                    <MythSlot
                                        key={myth.instanceId}
                                        myth={myth}
                                        selected={myth.instanceId === activePlayerMythId}
                                        flashAffinity={flashMap[myth.instanceId]}
                                        floatingDmg={floatMap[myth.instanceId]}
                                        onClick={() => {
                                            if (!myth.defeated && !animating) setActivePlayerMythId(myth.instanceId);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Indicador selección */}
                        <div className="flex-shrink-0 flex items-center justify-center gap-4 text-xs font-mono">
                            <span className={activePlayerMyth ? "text-blue-400" : "text-slate-600"}>
                                {activePlayerMyth ? `🔵 ${activePlayerMyth.name}` : "🔵 Elige tu Myth"}
                            </span>
                            <span className="text-slate-700">→ ataca →</span>
                            <span className={targetEnemy ? "text-red-400" : "text-slate-600"}>
                                {targetEnemy ? `🔴 ${targetEnemy.name}` : "🔴 Elige objetivo"}
                            </span>
                        </div>

                        {/* Moves */}
                        <div className="flex-shrink-0">
                            {activePlayerMyth && !activePlayerMyth.defeated ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {activePlayerMyth.moves.map((move) => {
                                        const cfg = AFFINITY_CONFIG[move.affinity];
                                        const ok = !animating && !!targetEnemy && !targetEnemy.defeated;
                                        return (
                                            <button
                                                key={move.id}
                                                onClick={() => ok && handleMove(move.id)}
                                                disabled={!ok}
                                                title={move.description}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all
                                                    ${
                                                        ok
                                                            ? `${cfg.bg} ${cfg.color} border-white/10 hover:border-white/25 hover:scale-[1.02] active:scale-[0.98]`
                                                            : "bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-50"
                                                    }`}
                                            >
                                                <span className="text-xl">{cfg.emoji}</span>
                                                <div className="min-w-0">
                                                    <p className="font-mono text-xs font-bold truncate">{move.name}</p>
                                                    <p className="text-xs opacity-60 font-mono">
                                                        {move.power > 0 ? `${move.power} pow` : "estado"} ·{" "}
                                                        {move.accuracy}%
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="h-20 flex items-center justify-center">
                                    <p className="text-slate-600 text-sm font-mono">
                                        {session?.playerTeam.every((m) => m.defeated)
                                            ? "Todos tus Myths han caído..."
                                            : "← Selecciona un Myth activo"}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Captura + Huir */}
                        <div className="flex-shrink-0 flex gap-2 mt-1">
                            {canCapture && (
                                <button
                                    onClick={handleCapture}
                                    disabled={animating}
                                    className="flex-1 py-2.5 rounded-xl border border-yellow-500/50 bg-yellow-500/10 text-yellow-400
                                        font-mono font-black text-xs tracking-widest uppercase
                                        hover:bg-yellow-500/20 transition-all disabled:opacity-40 animate-pulse"
                                >
                                    ◈ Capturar · {targetEnemy?.name}
                                </button>
                            )}
                            <button
                                onClick={handleFlee}
                                disabled={animating}
                                className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-500
                                    font-mono text-xs tracking-widest uppercase
                                    hover:border-red-700/60 hover:text-red-500 transition-all disabled:opacity-40"
                            >
                                🏃 Huir
                            </button>
                        </div>
                    </div>

                    {/* ── Log panel ── */}
                    <div className="w-72 flex-shrink-0 border-l border-slate-800 flex flex-col overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60 flex-shrink-0">
                            <p className="font-mono text-xs text-yellow-400 uppercase tracking-widest font-bold">
                                📜 Registro de combate
                            </p>
                        </div>
                        <div
                            ref={logRef}
                            className="flex-1 overflow-y-auto p-3 flex flex-col gap-1 scroll-smooth"
                            style={{ scrollbarWidth: "thin", scrollbarColor: "#334155 transparent" }}
                        >
                            {log.length === 0 && (
                                <p className="text-slate-700 text-xs font-mono italic text-center mt-6">
                                    Esperando acción...
                                </p>
                            )}
                            {log.map((entry, i) => (
                                <div key={i} className="animate-log-in flex items-start gap-1.5">
                                    <span className="text-slate-700 font-mono text-xs mt-px flex-shrink-0">›</span>
                                    <p
                                        className="font-mono text-xs leading-relaxed break-words"
                                        style={{
                                            color:
                                                entry.type === "good"
                                                    ? "#4ade80"
                                                    : entry.type === "bad"
                                                      ? "#f87171"
                                                      : entry.type === "crit"
                                                        ? "#fbbf24"
                                                        : entry.type === "miss"
                                                          ? "#64748b"
                                                          : entry.type === "system"
                                                            ? "#818cf8"
                                                            : "#94a3b8",
                                        }}
                                    >
                                        {entry.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

// ─────────────────────────────────────────
// TabBar
// ─────────────────────────────────────────

function TabBar({ mode, onSwitch }: { mode: BattleMode; onSwitch: (m: BattleMode) => void }) {
    return (
        <div className="flex border-b border-slate-800 flex-shrink-0">
            {(["npc", "pvp"] as BattleMode[]).map((m) => (
                <button
                    key={m}
                    onClick={() => onSwitch(m)}
                    className={`px-6 py-3 font-mono text-sm tracking-widest uppercase transition-colors
                        ${mode === m ? "text-red-400 border-b-2 border-red-500" : "text-slate-500 hover:text-slate-300"}`}
                >
                    {m === "npc" ? "⚔️ NPC" : "👥 PvP"}
                </button>
            ))}
        </div>
    );
}
