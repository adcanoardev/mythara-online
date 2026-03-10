import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import TrainerSidebar from "../components/TrainerSidebar";
import { api } from "../lib/api";

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

// ─────────────────────────────────────────
// Animation queue
// ─────────────────────────────────────────

type AnimStep =
    | { type: "attack-out"; side: "player" | "npc"; mythId: string; affinity: Affinity }
    | {
          type: "impact";
          side: "player" | "npc";
          mythId: string;
          affinity: Affinity;
          damage: number;
          crit: boolean;
          mult: number;
      }
    | { type: "hp-update"; session: BattleSession }
    | { type: "defeated"; mythId: string }
    | { type: "log"; text: string };

// ─────────────────────────────────────────
// Affinity config
// ─────────────────────────────────────────

const AFFINITY_CONFIG: Record<Affinity, { color: string; bg: string; flash: string; emoji: string; label: string }> = {
    EMBER: {
        color: "text-orange-400",
        bg: "bg-orange-500/20",
        flash: "shadow-orange-500/80",
        emoji: "🔥",
        label: "Brasa",
    },
    TIDE: { color: "text-blue-400", bg: "bg-blue-500/20", flash: "shadow-blue-500/80", emoji: "🌊", label: "Marea" },
    GROVE: {
        color: "text-green-400",
        bg: "bg-green-500/20",
        flash: "shadow-green-500/80",
        emoji: "🌿",
        label: "Bosque",
    },
    VOLT: {
        color: "text-yellow-300",
        bg: "bg-yellow-400/20",
        flash: "shadow-yellow-400/80",
        emoji: "⚡",
        label: "Voltio",
    },
    STONE: {
        color: "text-stone-400",
        bg: "bg-stone-500/20",
        flash: "shadow-stone-400/80",
        emoji: "🪨",
        label: "Piedra",
    },
    FROST: {
        color: "text-cyan-300",
        bg: "bg-cyan-500/20",
        flash: "shadow-cyan-400/80",
        emoji: "❄️",
        label: "Escarcha",
    },
    VENOM: {
        color: "text-purple-400",
        bg: "bg-purple-500/20",
        flash: "shadow-purple-500/80",
        emoji: "🧪",
        label: "Veneno",
    },
    ASTRAL: {
        color: "text-indigo-300",
        bg: "bg-indigo-500/20",
        flash: "shadow-indigo-400/80",
        emoji: "✨",
        label: "Astral",
    },
    IRON: {
        color: "text-slate-300",
        bg: "bg-slate-500/20",
        flash: "shadow-slate-400/80",
        emoji: "⚙️",
        label: "Hierro",
    },
    SHADE: {
        color: "text-violet-400",
        bg: "bg-violet-700/20",
        flash: "shadow-violet-600/80",
        emoji: "🌑",
        label: "Sombra",
    },
};

const RARITY_COLOR: Record<string, string> = {
    COMMON: "border-slate-500",
    RARE: "border-sky-400",
    ELITE: "border-violet-400",
    LEGENDARY: "border-yellow-400",
    MYTHIC: "border-pink-400",
};

// ─────────────────────────────────────────
// HP Bar
// ─────────────────────────────────────────

function HpBar({ hp, maxHp, animate }: { hp: number; maxHp: number; animate?: boolean }) {
    const pct = maxHp > 0 ? Math.max(0, (hp / maxHp) * 100) : 0;
    const color = pct > 50 ? "bg-green-400" : pct > 25 ? "bg-yellow-400" : "bg-red-500";
    return (
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
                className={`h-full rounded-full ${color} ${animate ? "transition-all duration-500 ease-out" : ""}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

// ─────────────────────────────────────────
// Myth slot card
// ─────────────────────────────────────────

interface MythSlotProps {
    myth: BattleMyth;
    side: "player" | "enemy";
    selected?: boolean;
    targeted?: boolean;
    impactAffinity?: Affinity | null;
    attacking?: boolean;
    floatingDmg?: { value: number; crit: boolean; mult: number } | null;
    onClick?: () => void;
    disabled?: boolean;
}

function MythSlot({
    myth,
    side,
    selected,
    targeted,
    impactAffinity,
    attacking,
    floatingDmg,
    onClick,
    disabled,
}: MythSlotProps) {
    const cfg = impactAffinity ? AFFINITY_CONFIG[impactAffinity] : null;

    return (
        <div className="relative flex flex-col items-center gap-1 w-24 select-none">
            {/* Floating damage */}
            {floatingDmg && (
                <div
                    className={`absolute -top-8 left-1/2 -translate-x-1/2 z-20 font-display font-black text-lg
            pointer-events-none animate-float-up
            ${floatingDmg.crit ? "text-yellow scale-125" : floatingDmg.mult > 1 ? "text-orange-400" : floatingDmg.mult < 1 ? "text-blue-300" : "text-white"}`}
                >
                    {floatingDmg.value > 0 ? `-${floatingDmg.value}` : "¡Fallo!"}
                    {floatingDmg.crit && <span className="text-xs ml-1 text-yellow">CRÍTICO</span>}
                    {floatingDmg.mult >= 2 && <span className="text-xs ml-1 text-orange-300">×{floatingDmg.mult}</span>}
                </div>
            )}

            {/* Card */}
            <div
                onClick={!disabled && !myth.defeated && onClick ? onClick : undefined}
                className={`
          relative w-20 h-20 rounded-xl border-2 flex items-center justify-center
          transition-all duration-200 overflow-hidden
          ${
              myth.defeated
                  ? "border-slate-700 bg-slate-800/40 grayscale opacity-50 cursor-not-allowed"
                  : selected
                    ? "border-blue/80 bg-blue/10 shadow-lg shadow-blue/30 scale-105 cursor-pointer"
                    : targeted
                      ? "border-red/80 bg-red/10 shadow-lg shadow-red/40 scale-105 cursor-pointer animate-pulse-border"
                      : onClick && !disabled
                        ? "border-border bg-card hover:border-white/30 hover:scale-105 cursor-pointer"
                        : "border-border bg-card"
          }
          ${impactAffinity && cfg ? `shadow-xl ${cfg.flash}` : ""}
          ${attacking ? (side === "player" ? "translate-x-6" : "-translate-x-6") : ""}
        `}
                style={{ transition: attacking ? "transform 0.15s ease-out" : "transform 0.2s ease-in" }}
            >
                {myth.defeated && (
                    <span className="absolute inset-0 flex items-center justify-center text-2xl z-10">❌</span>
                )}
                <span className={`text-4xl ${myth.defeated ? "opacity-30" : ""}`}>{myth.art?.front ?? "❓"}</span>

                {/* Impact flash overlay */}
                {impactAffinity && cfg && (
                    <div className={`absolute inset-0 ${cfg.bg} animate-flash pointer-events-none rounded-xl`} />
                )}

                {/* Selected glow ring */}
                {selected && !myth.defeated && (
                    <div className="absolute inset-0 rounded-xl border-2 border-blue/60 animate-pulse pointer-events-none" />
                )}
                {targeted && !myth.defeated && (
                    <div className="absolute inset-0 rounded-xl border-2 border-red/60 animate-pulse pointer-events-none" />
                )}
            </div>

            {/* Name + level */}
            <div className="text-center">
                <p
                    className={`font-display text-xs font-bold truncate w-20 text-center
          ${myth.defeated ? "text-slate-600" : selected ? "text-blue" : targeted ? "text-red" : "text-white"}`}
                >
                    {myth.name}
                </p>
                <p className="text-muted text-xs">Nv.{myth.level}</p>
            </div>

            {/* HP bar */}
            {!myth.defeated && (
                <div className="w-20">
                    <HpBar hp={myth.hp} maxHp={myth.maxHp} animate />
                    <p className="text-muted text-xs text-center mt-0.5">
                        {myth.hp}/{myth.maxHp}
                    </p>
                </div>
            )}

            {/* Affinity badge */}
            {!myth.defeated && myth.affinities?.[0] && (
                <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-display
          ${AFFINITY_CONFIG[myth.affinities[0] as Affinity]?.bg ?? "bg-white/10"}
          ${AFFINITY_CONFIG[myth.affinities[0] as Affinity]?.color ?? "text-white"}`}
                >
                    {AFFINITY_CONFIG[myth.affinities[0] as Affinity]?.emoji} {myth.affinities[0]}
                </span>
            )}
        </div>
    );
}

// ─────────────────────────────────────────
// Preparation screen — drag & drop
// ─────────────────────────────────────────

interface PrepScreenProps {
    myths: any[];
    onStart: (order: string[]) => void;
    loading: boolean;
}

function PrepScreen({ myths, onStart, loading }: PrepScreenProps) {
    const [slots, setSlots] = useState<(any | null)[]>([null, null, null]);
    const [bench, setBench] = useState<any[]>(myths);
    const dragRef = useRef<{ myth: any; from: "slot" | "bench"; index: number } | null>(null);

    const handleDragStart = (myth: any, from: "slot" | "bench", index: number) => {
        dragRef.current = { myth, from, index };
    };

    const handleDropOnSlot = (slotIdx: number) => {
        if (!dragRef.current) return;
        const { myth, from, index } = dragRef.current;
        const newSlots = [...slots];
        const newBench = [...bench];

        if (from === "bench") {
            // Si ya hay algo en el slot, lo manda al bench
            if (newSlots[slotIdx]) newBench.push(newSlots[slotIdx]);
            newSlots[slotIdx] = myth;
            setBench(newBench.filter((m) => m.id !== myth.id));
        } else {
            // Swap de slot a slot
            const prev = newSlots[slotIdx];
            newSlots[slotIdx] = myth;
            newSlots[index] = prev;
        }
        setSlots(newSlots);
        dragRef.current = null;
    };

    const handleDropOnBench = () => {
        if (!dragRef.current) return;
        const { myth, from, index } = dragRef.current;
        if (from === "slot") {
            const newSlots = [...slots];
            newSlots[index] = null;
            setSlots(newSlots);
            setBench((b) => [...b, myth]);
        }
        dragRef.current = null;
    };

    const order = slots.filter(Boolean).map((m) => m.id);
    const canStart = order.length >= 1;

    return (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 p-6 overflow-hidden">
            {/* Title */}
            <div className="text-center">
                <h2 className="font-display text-2xl font-black tracking-widest text-yellow uppercase">
                    ⚔️ Preparación
                </h2>
                <p className="text-muted text-sm mt-1">Arrastra tus Myths a los slots de combate (máx. 3)</p>
            </div>

            {/* Battle slots */}
            <div className="flex gap-4">
                {slots.map((myth, i) => (
                    <div
                        key={i}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => handleDropOnSlot(i)}
                        className={`w-24 h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1
              transition-all duration-200
              ${myth ? "border-blue/60 bg-blue/5" : "border-border/50 bg-card/30 hover:border-border"}`}
                    >
                        {myth ? (
                            <div
                                draggable
                                onDragStart={() => handleDragStart(myth, "slot", i)}
                                className="flex flex-col items-center gap-1 cursor-grab active:cursor-grabbing"
                            >
                                <span className="text-4xl">{myth.art?.front ?? "❓"}</span>
                                <p className="font-display text-xs text-white font-bold truncate w-20 text-center">
                                    {myth.name}
                                </p>
                                <p className="text-muted text-xs">Nv.{myth.level}</p>
                                {myth.affinities?.[0] && (
                                    <span
                                        className={`text-xs px-1.5 py-0.5 rounded-full
                    ${AFFINITY_CONFIG[myth.affinities[0] as Affinity]?.bg ?? "bg-white/10"}
                    ${AFFINITY_CONFIG[myth.affinities[0] as Affinity]?.color ?? "text-white"}`}
                                    >
                                        {AFFINITY_CONFIG[myth.affinities[0] as Affinity]?.emoji}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-1 opacity-30">
                                <span className="text-2xl">＋</span>
                                <p className="font-display text-xs text-muted">Slot {i + 1}</p>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Bench */}
            <div onDragOver={(e) => e.preventDefault()} onDrop={handleDropOnBench} className="w-full max-w-lg">
                <p className="font-display text-xs text-muted uppercase tracking-widest mb-3 text-center">
                    — Equipo disponible —
                </p>
                <div className="flex flex-wrap gap-3 justify-center min-h-16 p-3 rounded-xl border border-dashed border-border/40 bg-card/20">
                    {bench.length === 0 && (
                        <p className="text-muted text-xs self-center">Todos los Myths en posición</p>
                    )}
                    {bench.map((myth) => (
                        <div
                            key={myth.id}
                            draggable
                            onDragStart={() => handleDragStart(myth, "bench", -1)}
                            className="flex flex-col items-center gap-1 w-20 cursor-grab active:cursor-grabbing
                p-2 rounded-lg border border-border bg-card hover:border-white/20 transition-all"
                        >
                            <span className="text-3xl">{myth.art?.front ?? "❓"}</span>
                            <p className="font-display text-xs text-white font-bold truncate w-full text-center">
                                {myth.name}
                            </p>
                            <p className="text-muted text-xs">Nv.{myth.level}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Start button */}
            <button
                onClick={() => canStart && onStart(order)}
                disabled={!canStart || loading}
                className={`px-10 py-3 rounded-xl font-display font-black text-base tracking-widest uppercase
          transition-all duration-200
          ${
              canStart && !loading
                  ? "bg-red text-white hover:bg-red/80 hover:scale-105 shadow-lg shadow-red/30"
                  : "bg-border text-muted cursor-not-allowed opacity-50"
          }`}
            >
                {loading ? "Iniciando..." : `⚔️ Combatir (${order.length} Myth${order.length !== 1 ? "s" : ""})`}
            </button>
        </div>
    );
}

// ─────────────────────────────────────────
// Battle log line
// ─────────────────────────────────────────

function LogLine({ text, index }: { text: string; index: number }) {
    return (
        <p
            className="text-xs font-mono text-white/70 leading-relaxed animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            <span className="text-muted mr-1">›</span>
            {text}
        </p>
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

    // Mode from location state or search params
    const searchParams = new URLSearchParams(location.search);
    const initialMode: BattleMode =
        (location.state as any)?.mode === "pvp" || searchParams.get("mode") === "pvp" ? "pvp" : "npc";
    const [mode, setMode] = useState<BattleMode>(initialMode);

    useEffect(() => {
        const m = (location.state as any)?.mode;
        if (m === "pvp" || m === "npc") setMode(m);
    }, [location.state]);

    // State
    const [phase, setPhase] = useState<Phase>("prep");
    const [myths, setMyths] = useState<any[]>([]);
    const [session, setSession] = useState<BattleSession | null>(null);
    const [loadingStart, setLoadingStart] = useState(false);
    const [loadingTurn, setLoadingTurn] = useState(false);

    // Selection
    const [activePlayerMythId, setActivePlayerMythId] = useState<string | null>(null);
    const [targetEnemyMythId, setTargetEnemyMythId] = useState<string | null>(null);

    // Animation state
    const [animating, setAnimating] = useState(false);
    const [attackingMythId, setAttackingMythId] = useState<string | null>(null);
    const [impactMap, setImpactMap] = useState<Record<string, Affinity | null>>({});
    const [floatingDmgMap, setFloatingDmgMap] = useState<
        Record<string, { value: number; crit: boolean; mult: number } | null>
    >({});

    // Log
    const [log, setLog] = useState<string[]>([]);
    const logRef = useRef<HTMLDivElement>(null);

    // Result
    const [result, setResult] = useState<{ status: "win" | "lose"; xp?: number; coins?: number } | null>(null);

    // Load party on mount
    useEffect(() => {
        api.party()
            .then((data) => setMyths(data ?? []))
            .catch(() => {});

        // Try to recover active session
        api.battleNpcActive()
            .then((s: any) => {
                if (s?.status === "ongoing") {
                    setSession(s);
                    setPhase("battle");
                    autoSelectFirst(s);
                }
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, [log]);

    function autoSelectFirst(s: BattleSession) {
        const firstPlayer = s.playerTeam.find((m) => !m.defeated);
        const firstEnemy = s.enemyTeam.find((m) => !m.defeated);
        if (firstPlayer) setActivePlayerMythId(firstPlayer.instanceId);
        if (firstEnemy) setTargetEnemyMythId(firstEnemy.instanceId);
    }

    // ── Start battle ──
    async function handleStart(order: string[]) {
        setLoadingStart(true);
        try {
            const s: BattleSession = await api.battleNpcStart(order);
            setSession(s);
            setPhase("battle");
            autoSelectFirst(s);
            addLog("⚔️ ¡Comienza el combate 3v3!");
        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoadingStart(false);
        }
    }

    function addLog(text: string) {
        setLog((l) => [...l.slice(-30), text]);
    }

    // ── Animation queue processor ──
    async function runAnimQueue(steps: AnimStep[]) {
        setAnimating(true);
        for (const step of steps) {
            if (step.type === "attack-out") {
                setAttackingMythId(step.mythId);
                await delay(200);
                setAttackingMythId(null);
                await delay(100);
            } else if (step.type === "impact") {
                setImpactMap((m) => ({ ...m, [step.mythId]: step.affinity }));
                setFloatingDmgMap((m) => ({
                    ...m,
                    [step.mythId]: { value: step.damage, crit: step.crit, mult: step.mult },
                }));
                await delay(600);
                setImpactMap((m) => ({ ...m, [step.mythId]: null }));
                await delay(200);
                setFloatingDmgMap((m) => ({ ...m, [step.mythId]: null }));
            } else if (step.type === "hp-update") {
                setSession(step.session);
            } else if (step.type === "defeated") {
                await delay(300);
            } else if (step.type === "log") {
                addLog(step.text);
                await delay(80);
            }
        }
        setAnimating(false);
    }

    function delay(ms: number) {
        return new Promise<void>((r) => setTimeout(r, ms));
    }

    // ── Execute turn ──
    async function handleMove(moveId: string) {
        if (!session || !activePlayerMythId || animating || loadingTurn) return;

        const playerMyth = session.playerTeam.find((m) => m.instanceId === activePlayerMythId);
        const targetMyth = session.enemyTeam.find((m) => m.instanceId === targetEnemyMythId);
        if (!playerMyth || !targetMyth) return;

        const move = playerMyth.moves.find((mv) => mv.id === moveId);
        if (!move) return;

        setLoadingTurn(true);
        try {
            const res = await api.battleNpcTurn(
                session.battleId,
                activePlayerMythId,
                moveId,
                targetEnemyMythId ?? undefined,
            );
            const { session: newSession, playerAction, npcAction, xpGained, coinsGained } = res;

            // Build animation queue
            const steps: AnimStep[] = [];

            // Player attacks
            steps.push({
                type: "log",
                text: `${playerAction.myth} usa ${playerAction.move}${playerAction.stab ? " (STAB)" : ""}`,
            });
            steps.push({
                type: "attack-out",
                side: "player",
                mythId: playerMyth.instanceId,
                affinity: playerAction.moveAffinity,
            });
            steps.push({
                type: "impact",
                side: "npc",
                mythId: targetMyth.instanceId,
                affinity: playerAction.moveAffinity,
                damage: playerAction.damage,
                crit: playerAction.crit,
                mult: playerAction.mult,
            });
            if (playerAction.mult >= 2) steps.push({ type: "log", text: `¡Es muy eficaz! (×${playerAction.mult})` });
            if (playerAction.mult < 1) steps.push({ type: "log", text: `No es muy eficaz... (×${playerAction.mult})` });
            if (playerAction.crit) steps.push({ type: "log", text: "¡Golpe crítico!" });
            if (playerAction.damage === 0) steps.push({ type: "log", text: "¡El ataque falló!" });

            // NPC attacks
            steps.push({ type: "log", text: `${npcAction.myth} usa ${npcAction.move} contra ${npcAction.target}` });
            const npcAttackerInst = session.enemyTeam.find((m) => m.name === npcAction.myth);
            const npcTargetInst = session.playerTeam.find((m) => m.name === npcAction.target);
            if (npcAttackerInst)
                steps.push({
                    type: "attack-out",
                    side: "npc",
                    mythId: npcAttackerInst.instanceId,
                    affinity: npcAction.moveAffinity,
                });
            if (npcTargetInst)
                steps.push({
                    type: "impact",
                    side: "player",
                    mythId: npcTargetInst.instanceId,
                    affinity: npcAction.moveAffinity,
                    damage: npcAction.damage,
                    crit: npcAction.crit,
                    mult: npcAction.mult,
                });
            if (npcAction.mult >= 2) steps.push({ type: "log", text: `¡Es muy eficaz! (×${npcAction.mult})` });
            if (npcAction.mult < 1) steps.push({ type: "log", text: "No es muy eficaz..." });
            if (npcAction.crit) steps.push({ type: "log", text: "¡Golpe crítico del enemigo!" });

            // HP update after animations
            steps.push({ type: "hp-update", session: newSession });

            await runAnimQueue(steps);

            // After animations: check result
            if (newSession.status === "win" || newSession.status === "lose") {
                setResult({ status: newSession.status, xp: xpGained, coins: coinsGained });
                setPhase("result");
                window.dispatchEvent(new Event("sidebar:reload"));
            } else {
                // Auto-reselect first alive
                const updatedSession = newSession as BattleSession;
                const fp = updatedSession.playerTeam.find((m: BattleMyth) => !m.defeated);
                const fe = updatedSession.enemyTeam.find((m: BattleMyth) => !m.defeated);
                if (fp && fp.instanceId !== activePlayerMythId) setActivePlayerMythId(fp.instanceId);
                if (fe && fe.instanceId !== targetEnemyMythId) setTargetEnemyMythId(fe.instanceId);
            }
        } catch (e: any) {
            addLog(`Error: ${e.message}`);
        } finally {
            setLoadingTurn(false);
        }
    }

    // ── Capture ──
    async function handleCapture() {
        if (!session || !targetEnemyMythId || animating) return;
        setLoadingTurn(true);
        try {
            const res = await api.battleNpcCapture(session.battleId, targetEnemyMythId);
            if (res.success) {
                addLog(`✅ ¡Captura exitosa!`);
                setSession(res.session);
                if (res.session.status === "win") {
                    setResult({ status: "win" });
                    setPhase("result");
                    window.dispatchEvent(new Event("sidebar:reload"));
                }
            } else {
                addLog(
                    `❌ ¡La captura falló! El Myth recuperó HP${res.counterDamage ? ` y contraatacó por ${res.counterDamage}` : ""}`,
                );
                setSession(res.session);
                if (res.session.status === "lose") {
                    setResult({ status: "lose" });
                    setPhase("result");
                }
            }
        } catch (e: any) {
            addLog(`Error: ${e.message}`);
        } finally {
            setLoadingTurn(false);
        }
    }

    // ── Flee ──
    async function handleFlee() {
        if (!session) return;
        try {
            await api.battleNpcFlee(session.battleId);
            setResult({ status: "lose" });
            setPhase("result");
        } catch (e: any) {
            addLog(`Error: ${e.message}`);
        }
    }

    // ─────────────────────────────────────────
    // Render helpers
    // ─────────────────────────────────────────

    const activePlayerMyth = session?.playerTeam.find((m) => m.instanceId === activePlayerMythId);
    const targetEnemy = session?.enemyTeam.find((m) => m.instanceId === targetEnemyMythId);
    const canCapture = targetEnemy && !targetEnemy.defeated && targetEnemy.hp / targetEnemy.maxHp < 0.25;

    // ─────────────────────────────────────────
    // PvP tab
    // ─────────────────────────────────────────

    if (mode === "pvp") {
        return (
            <Layout sidebar={<TrainerSidebar />}>
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-border flex-shrink-0">
                        <button
                            onClick={() => setMode("npc")}
                            className="px-6 py-3 font-display text-sm tracking-widest uppercase text-muted hover:text-white transition-colors"
                        >
                            ⚔️ NPC
                        </button>
                        <button className="px-6 py-3 font-display text-sm tracking-widest uppercase text-red border-b-2 border-red">
                            👥 PvP
                        </button>
                    </div>

                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center max-w-sm">
                            <div className="text-6xl mb-4">⚔️</div>
                            <h2 className="font-display text-2xl font-black text-yellow tracking-widest mb-3">
                                PvP en desarrollo
                            </h2>
                            <p className="text-muted text-sm leading-relaxed">
                                El combate entre Binders está en construcción.
                                <br />
                                Próximamente podrás desafiar a otros jugadores en tiempo real.
                            </p>
                            <div className="mt-6 px-4 py-2 rounded-lg border border-border/50 bg-card/50 text-muted text-xs font-display tracking-wider">
                                🔒 Próximamente
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    // ─────────────────────────────────────────
    // RESULT screen
    // ─────────────────────────────────────────

    if (phase === "result" && result) {
        return (
            <Layout sidebar={<TrainerSidebar />}>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center max-w-sm">
                        <div className="text-7xl mb-4 animate-bounce">{result.status === "win" ? "🏆" : "💀"}</div>
                        <h2
                            className={`font-display text-3xl font-black tracking-widest mb-2
              ${result.status === "win" ? "text-yellow" : "text-red"}`}
                        >
                            {result.status === "win" ? "¡VICTORIA!" : "DERROTA"}
                        </h2>
                        {result.status === "win" && (
                            <div className="flex gap-4 justify-center mt-4 mb-6">
                                {result.xp && (
                                    <div className="px-4 py-2 rounded-lg bg-blue/10 border border-blue/30">
                                        <p className="text-blue font-display font-black text-lg">+{result.xp}</p>
                                        <p className="text-muted text-xs">XP</p>
                                    </div>
                                )}
                                {result.coins && (
                                    <div className="px-4 py-2 rounded-lg bg-yellow/10 border border-yellow/30">
                                        <p className="text-yellow font-display font-black text-lg">+{result.coins}</p>
                                        <p className="text-muted text-xs">Monedas</p>
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
                                className="px-6 py-2.5 rounded-xl bg-red text-white font-display font-black text-sm tracking-widest uppercase hover:bg-red/80 transition-all"
                            >
                                ⚔️ Volver a combatir
                            </button>
                            <button
                                onClick={() => navigate("/")}
                                className="px-6 py-2.5 rounded-xl border border-border text-muted font-display text-sm tracking-widest uppercase hover:border-white/30 hover:text-white transition-all"
                            >
                                🏡 Posada
                            </button>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    // ─────────────────────────────────────────
    // PREP screen
    // ─────────────────────────────────────────

    if (phase === "prep") {
        return (
            <Layout sidebar={<TrainerSidebar />}>
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Tabs */}
                    <div className="flex border-b border-border flex-shrink-0">
                        <button className="px-6 py-3 font-display text-sm tracking-widest uppercase text-red border-b-2 border-red">
                            ⚔️ NPC
                        </button>
                        <button
                            onClick={() => setMode("pvp")}
                            className="px-6 py-3 font-display text-sm tracking-widest uppercase text-muted hover:text-white transition-colors"
                        >
                            👥 PvP
                        </button>
                    </div>
                    <PrepScreen myths={myths} onStart={handleStart} loading={loadingStart} />
                </div>
            </Layout>
        );
    }

    // ─────────────────────────────────────────
    // BATTLE screen
    // ─────────────────────────────────────────

    return (
        <Layout sidebar={<TrainerSidebar />}>
            <style>{`
        @keyframes floatUp {
          0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
          100% { opacity: 0; transform: translateX(-50%) translateY(-40px); }
        }
        @keyframes flash {
          0%, 100% { opacity: 0; }
          30%, 70% { opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseBorder {
          0%, 100% { box-shadow: 0 0 0 0 rgba(230,57,70,0.4); }
          50%       { box-shadow: 0 0 0 6px rgba(230,57,70,0); }
        }
        .animate-float-up  { animation: floatUp 0.9s ease-out forwards; }
        .animate-flash      { animation: flash 0.5s ease-in-out; }
        .animate-fade-in    { animation: fadeIn 0.3s ease-out both; }
        .animate-pulse-border { animation: pulseBorder 1s infinite; }
      `}</style>

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tabs */}
                <div className="flex border-b border-border flex-shrink-0">
                    <button className="px-6 py-3 font-display text-sm tracking-widest uppercase text-red border-b-2 border-red">
                        ⚔️ NPC
                    </button>
                    <button
                        onClick={() => setMode("pvp")}
                        className="px-6 py-3 font-display text-sm tracking-widest uppercase text-muted hover:text-white transition-colors"
                    >
                        👥 PvP
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* ── Arena + controls (left/center) ── */}
                    <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
                        {/* Turn counter */}
                        <div className="flex items-center justify-between flex-shrink-0">
                            <span className="font-display text-xs text-muted tracking-widest uppercase">
                                Turno {session?.turn ?? 0}
                            </span>
                            {animating && (
                                <span className="font-display text-xs text-yellow animate-pulse tracking-widest">
                                    ⚡ Resolviendo...
                                </span>
                            )}
                        </div>

                        {/* ── Enemy row ── */}
                        <div className="flex-shrink-0">
                            <p className="font-display text-xs text-muted tracking-widest uppercase mb-2 text-center">
                                — Rivales —
                            </p>
                            <div className="flex gap-4 justify-center">
                                {session?.enemyTeam.map((myth) => (
                                    <MythSlot
                                        key={myth.instanceId}
                                        myth={myth}
                                        side="enemy"
                                        targeted={myth.instanceId === targetEnemyMythId}
                                        impactAffinity={impactMap[myth.instanceId] ?? null}
                                        attacking={attackingMythId === myth.instanceId}
                                        floatingDmg={floatingDmgMap[myth.instanceId]}
                                        onClick={() => {
                                            if (!myth.defeated && !animating) setTargetEnemyMythId(myth.instanceId);
                                        }}
                                        disabled={animating || myth.defeated}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="flex-shrink-0 flex items-center gap-3 px-4">
                            <div className="flex-1 h-px bg-border/60" />
                            <span className="text-muted text-xs font-display tracking-widest">VS</span>
                            <div className="flex-1 h-px bg-border/60" />
                        </div>

                        {/* ── Player row ── */}
                        <div className="flex-shrink-0">
                            <p className="font-display text-xs text-muted tracking-widest uppercase mb-2 text-center">
                                — Tu equipo —
                            </p>
                            <div className="flex gap-4 justify-center">
                                {session?.playerTeam.map((myth) => (
                                    <MythSlot
                                        key={myth.instanceId}
                                        myth={myth}
                                        side="player"
                                        selected={myth.instanceId === activePlayerMythId}
                                        impactAffinity={impactMap[myth.instanceId] ?? null}
                                        attacking={attackingMythId === myth.instanceId}
                                        floatingDmg={floatingDmgMap[myth.instanceId]}
                                        onClick={() => {
                                            if (!myth.defeated && !animating) setActivePlayerMythId(myth.instanceId);
                                        }}
                                        disabled={animating || myth.defeated}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* ── Selección activa info ── */}
                        <div className="flex-shrink-0 flex items-center justify-center gap-6 text-xs font-display tracking-wide">
                            <span className={`${activePlayerMyth ? "text-blue" : "text-muted"}`}>
                                {activePlayerMyth ? `🔵 ${activePlayerMyth.name}` : "🔵 Selecciona tu Myth"}
                            </span>
                            <span className="text-border">→</span>
                            <span className={`${targetEnemy ? "text-red" : "text-muted"}`}>
                                {targetEnemy ? `🔴 ${targetEnemy.name}` : "🔴 Selecciona objetivo"}
                            </span>
                        </div>

                        {/* ── Moves panel ── */}
                        <div className="flex-shrink-0">
                            {activePlayerMyth && !activePlayerMyth.defeated ? (
                                <div className="grid grid-cols-2 gap-2">
                                    {activePlayerMyth.moves.map((move) => {
                                        const cfg = AFFINITY_CONFIG[move.affinity];
                                        const ready =
                                            !animating && !loadingTurn && !!targetEnemy && !targetEnemy.defeated;
                                        return (
                                            <button
                                                key={move.id}
                                                onClick={() => ready && handleMove(move.id)}
                                                disabled={!ready}
                                                title={move.description}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left
                          transition-all duration-150 group
                          ${
                              ready
                                  ? `${cfg.bg} ${cfg.color} border-white/10 hover:border-white/30 hover:scale-102 active:scale-98`
                                  : "bg-card/30 border-border/30 text-muted cursor-not-allowed opacity-50"
                          }`}
                                            >
                                                <span className="text-lg">{cfg.emoji}</span>
                                                <div className="min-w-0">
                                                    <p className="font-display text-xs font-bold truncate">
                                                        {move.name}
                                                    </p>
                                                    <p className="text-xs opacity-70">
                                                        {move.power} pow · {move.accuracy}%
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="h-24 flex items-center justify-center">
                                    <p className="text-muted text-sm font-display">
                                        {session?.playerTeam.every((m) => m.defeated)
                                            ? "Todos tus Myths han sido derrotados"
                                            : "Selecciona un Myth activo"}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* ── Capture + Flee ── */}
                        <div className="flex-shrink-0 flex gap-2">
                            {canCapture && (
                                <button
                                    onClick={handleCapture}
                                    disabled={animating || loadingTurn}
                                    className="flex-1 py-2.5 rounded-xl border border-yellow/60 bg-yellow/10 text-yellow
                    font-display font-black text-sm tracking-widest uppercase
                    hover:bg-yellow/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                    animate-pulse"
                                >
                                    ◈ Capturar ({targetEnemy?.name})
                                </button>
                            )}
                            <button
                                onClick={handleFlee}
                                disabled={animating || loadingTurn}
                                className="px-4 py-2.5 rounded-xl border border-border text-muted
                  font-display text-sm tracking-widest uppercase
                  hover:border-red/50 hover:text-red transition-all disabled:opacity-50"
                            >
                                🏃 Huir
                            </button>
                        </div>
                    </div>

                    {/* ── Log panel (right) ── */}
                    <div className="w-52 flex-shrink-0 border-l border-border flex flex-col overflow-hidden">
                        <div className="flex-shrink-0 px-3 py-2 border-b border-border">
                            <p className="font-display text-xs text-muted uppercase tracking-widest">Registro</p>
                        </div>
                        <div ref={logRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-1 scroll-smooth">
                            {log.length === 0 && <p className="text-muted text-xs font-mono">Esperando acciones...</p>}
                            {log.map((line, i) => (
                                <LogLine key={i} text={line} index={i} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
