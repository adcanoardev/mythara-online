import { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import TrainerSidebar from "../components/TrainerSidebar";
import { api } from "../lib/api";

// ── Tipos ─────────────────────────────────────────────────────

interface Move {
    id: string;
    name: string;
    affinity: string;
    power: number;
    accuracy: number;
    description: string;
}

interface Combatant {
    speciesId: string;
    name: string;
    level: number;
    hp: number;
    maxHp: number;
    art: { portrait: string; front: string; back: string };
    affinities: string[];
    moves?: Move[];
}

interface TurnResult {
    turn: number;
    playerMove: string;
    playerMoveName: string;
    playerMoveAffinity: string;
    enemyMove: string;
    enemyMoveName: string;
    enemyMoveAffinity: string;
    playerDamage: number;
    enemyDamage: number;
    playerCritical: boolean;
    enemyCritical: boolean;
    playerTypeMultiplier: number;
    enemyTypeMultiplier: number;
    playerHpAfter: number;
    enemyHpAfter: number;
}

interface BattleState {
    battleId: string;
    player: Combatant;
    enemy: Combatant;
    playerFirst: boolean;
    log?: TurnResult[];
}

interface BattleResult {
    result: "WIN" | "LOSE";
    xpGained: number;
    coinsGained: number;
    trainerLevel: number;
    captured: any;
    evolution: any;
}

interface FloatingDmg {
    id: number;
    value: number;
    critical: boolean;
    side: "player" | "enemy";
}

// ── Constantes de afinidad ────────────────────────────────────

const AFFINITY_COLOR: Record<string, string> = {
    EMBER: "#ff6b35",
    TIDE: "#4cc9f0",
    GROVE: "#06d6a0",
    VOLT: "#ffd60a",
    STONE: "#adb5bd",
    FROST: "#a8dadc",
    VENOM: "#7b2fff",
    ASTRAL: "#e040fb",
    SHADE: "#e63946",
    IRON: "#90a4ae",
};

const AFFINITY_EMOJI: Record<string, string> = {
    EMBER: "🔥",
    TIDE: "💧",
    GROVE: "🌿",
    VOLT: "⚡",
    STONE: "🪨",
    FROST: "❄️",
    VENOM: "☠️",
    ASTRAL: "✨",
    SHADE: "🌑",
    IRON: "⚙️",
};

const SUPER_EFFECTIVE: Record<string, string[]> = {
    EMBER: ["GROVE", "FROST"],
    TIDE: ["EMBER", "STONE"],
    GROVE: ["TIDE", "STONE"],
    VOLT: ["TIDE", "IRON"],
    STONE: ["EMBER", "FROST"],
    FROST: ["GROVE"],
    VENOM: ["GROVE", "FROST"],
    ASTRAL: ["SHADE", "VENOM"],
    SHADE: ["ASTRAL", "GROVE"],
    IRON: ["FROST", "STONE"],
};

// ── Componentes pequeños ──────────────────────────────────────

function HpBar({ current, max, color }: { current: number; max: number; color: string }) {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    const isLow = pct < 25;
    return (
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                    width: `${pct}%`,
                    background: isLow ? "#e63946" : color,
                    boxShadow: `0 0 6px ${isLow ? "#e63946" : color}`,
                }}
            />
        </div>
    );
}

function TypeBadge({ affinity }: { affinity: string }) {
    const color = AFFINITY_COLOR[affinity] ?? "#5a6a85";
    return (
        <span
            className="text-xs font-display font-bold px-1.5 py-0.5 rounded"
            style={{ background: `${color}25`, color, border: `1px solid ${color}40` }}
        >
            {AFFINITY_EMOJI[affinity]} {affinity}
        </span>
    );
}

function MoveButton({ move, onClick, disabled }: { move: Move; onClick: () => void; disabled: boolean }) {
    const color = AFFINITY_COLOR[move.affinity] ?? "#5a6a85";
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="flex flex-col items-start p-3 rounded-xl border transition-all disabled:opacity-40 hover:scale-[1.02] active:scale-[0.98] text-left"
            style={{ borderColor: `${color}40`, background: `${color}10` }}
            onMouseEnter={(e) => {
                if (!disabled) (e.currentTarget as HTMLElement).style.borderColor = color;
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${color}40`;
            }}
        >
            <div className="flex items-center justify-between w-full mb-1">
                <span className="font-display font-bold text-sm tracking-wide" style={{ color }}>
                    {AFFINITY_EMOJI[move.affinity]} {move.name}
                </span>
                <span className="text-xs font-display font-bold text-muted">POW {move.power}</span>
            </div>
            <div className="text-xs text-muted leading-tight">{move.description}</div>
        </button>
    );
}

// ── Tabla de tipos siempre visible ────────────────────────────

function AffinityTable({
    playerAffinities,
    enemyAffinities,
}: {
    playerAffinities: string[];
    enemyAffinities: string[];
}) {
    const allTypes = Object.keys(AFFINITY_COLOR);

    const playerAdvantages = playerAffinities.flatMap((pa) =>
        (SUPER_EFFECTIVE[pa] ?? []).filter((t) => enemyAffinities.includes(t)).map((t) => ({ from: pa, to: t })),
    );
    const enemyAdvantages = enemyAffinities.flatMap((ea) =>
        (SUPER_EFFECTIVE[ea] ?? []).filter((t) => playerAffinities.includes(t)).map((t) => ({ from: ea, to: t })),
    );

    return (
        <div className="bg-card border border-border rounded-2xl p-3 flex flex-col gap-3 overflow-y-auto">
            <div className="font-display font-bold text-xs tracking-widest text-white uppercase flex-shrink-0">
                📊 Afinidades
            </div>

            {playerAdvantages.length > 0 && (
                <div className="flex-shrink-0">
                    <div className="text-xs font-display font-bold mb-1.5" style={{ color: "#06d6a0" }}>
                        ✅ Tus ventajas
                    </div>
                    <div className="flex flex-col gap-1">
                        {playerAdvantages.map((a, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-1 flex-wrap text-xs bg-green/10 border border-green/20 rounded-lg px-2 py-1"
                            >
                                <TypeBadge affinity={a.from} />
                                <span className="font-bold" style={{ color: "#06d6a0" }}>
                                    x2
                                </span>
                                <TypeBadge affinity={a.to} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {enemyAdvantages.length > 0 && (
                <div className="flex-shrink-0">
                    <div className="text-xs font-display font-bold mb-1.5" style={{ color: "#e63946" }}>
                        ⚠️ Ventajas rival
                    </div>
                    <div className="flex flex-col gap-1">
                        {enemyAdvantages.map((a, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-1 flex-wrap text-xs bg-red/10 border border-red/20 rounded-lg px-2 py-1"
                            >
                                <TypeBadge affinity={a.from} />
                                <span className="font-bold" style={{ color: "#e63946" }}>
                                    x2
                                </span>
                                <TypeBadge affinity={a.to} />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {playerAdvantages.length === 0 && enemyAdvantages.length === 0 && (
                <div className="text-xs text-muted text-center py-1 flex-shrink-0">Sin ventajas directas</div>
            )}

            <div className="border-t border-border/40 pt-2 flex-shrink-0">
                <div className="text-xs text-muted font-display mb-1.5">Tabla completa</div>
                <div className="flex flex-col gap-1">
                    {allTypes.map((atk) => {
                        const targets = SUPER_EFFECTIVE[atk];
                        if (!targets?.length) return null;
                        return (
                            <div key={atk} className="flex items-center gap-1 flex-wrap">
                                <TypeBadge affinity={atk} />
                                <span className="text-muted text-xs">→</span>
                                {targets.map((t) => (
                                    <TypeBadge key={t} affinity={t} />
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Daño flotante ─────────────────────────────────────────────

function FloatingDamage({ floats }: { floats: FloatingDmg[] }) {
    return (
        <>
            {floats.map((f) => (
                <div
                    key={f.id}
                    className="absolute pointer-events-none font-display font-black animate-bounce"
                    style={{
                        top: "20%",
                        left: f.side === "player" ? "8%" : "auto",
                        right: f.side === "enemy" ? "8%" : "auto",
                        fontSize: f.critical ? "2rem" : "1.4rem",
                        color: f.critical ? "#e63946" : "#ffffff",
                        textShadow: f.critical ? "0 0 12px #e63946" : "0 0 8px rgba(0,0,0,0.8)",
                        zIndex: 10,
                        animation: "floatUp 1.2s ease-out forwards",
                    }}
                >
                    -{f.value}
                    {f.critical ? " ⚡" : ""}
                </div>
            ))}
        </>
    );
}

// ── Página principal ──────────────────────────────────────────

export default function CombatPage() {
    const [mode, setMode] = useState<"npc" | "pvp">("npc");
    const [defId, setDefId] = useState("");
    const [error, setError] = useState("");

    const [battle, setBattle] = useState<BattleState | null>(null);
    const [playerHp, setPlayerHp] = useState(0);
    const [enemyHp, setEnemyHp] = useState(0);
    const [log, setLog] = useState<TurnResult[]>([]);
    const [result, setResult] = useState<BattleResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastTurn, setLastTurn] = useState<TurnResult | null>(null);
    const [pvpResult, setPvpResult] = useState<any>(null);
    const [floats, setFloats] = useState<FloatingDmg[]>([]);
    const floatCounter = useRef(0);
    const sidebarRef = useRef<{ reload: () => void }>(null);

    // Recuperar sesión activa al montar
    useEffect(() => {
        async function checkActive() {
            try {
                const res = await api.battleNpcActive();
                if (res?.battleId) {
                    setBattle(res);
                    setPlayerHp(res.player.hp);
                    setEnemyHp(res.enemy.hp);
                    setLog(res.log ?? []);
                    if (res.log?.length > 0) setLastTurn(res.log[res.log.length - 1]);
                }
            } catch {
                /* sin sesión activa */
            }
        }
        checkActive();
    }, []);

    // CSS para animación flotante
    useEffect(() => {
        const style = document.createElement("style");
        style.textContent = `
            @keyframes floatUp {
                0%   { opacity: 1; transform: translateY(0) scale(1); }
                60%  { opacity: 1; transform: translateY(-40px) scale(1.1); }
                100% { opacity: 0; transform: translateY(-70px) scale(0.9); }
            }
        `;
        document.head.appendChild(style);
        return () => {
            document.head.removeChild(style);
        };
    }, []);

    function spawnFloat(value: number, critical: boolean, side: "player" | "enemy") {
        const id = floatCounter.current++;
        setFloats((prev) => [...prev, { id, value, critical, side }]);
        setTimeout(() => setFloats((prev) => prev.filter((f) => f.id !== id)), 1300);
    }

    async function handleStartNpc() {
        setError("");
        setResult(null);
        setBattle(null);
        setLog([]);
        setLastTurn(null);
        setLoading(true);
        try {
            const res = await api.battleNpcStart();
            setBattle(res);
            setPlayerHp(res.player.hp);
            setEnemyHp(res.enemy.hp);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleMove(moveId: string) {
        if (!battle) return;
        setLoading(true);
        try {
            const res = await api.battleNpcTurn(battle.battleId, moveId);
            const turn: TurnResult = res.turn;
            setLog((prev) => [...prev, turn]);
            setLastTurn(turn);
            setPlayerHp(turn.playerHpAfter);
            setEnemyHp(turn.enemyHpAfter);

            // Daño flotante — el jugador recibe daño en la izquierda, el enemigo en la derecha
            if (turn.enemyDamage > 0) spawnFloat(turn.enemyDamage, turn.enemyCritical, "player");
            if (turn.playerDamage > 0) spawnFloat(turn.playerDamage, turn.playerCritical, "enemy");

            if (res.status !== "ongoing") {
                setResult({
                    result: res.result,
                    xpGained: res.xpGained,
                    coinsGained: res.coinsGained,
                    trainerLevel: res.trainerLevel,
                    captured: res.captured,
                    evolution: res.evolution,
                });
                setBattle(null);
                // Refrescar sidebar con nuevos tokens/XP/monedas
                window.dispatchEvent(new CustomEvent("sidebar:reload"));
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    async function handleFlee() {
        if (!battle) return;
        setLoading(true);
        try {
            await api.battleNpcFlee(battle.battleId);
            setBattle(null);
            setResult(null);
            setLog([]);
            setLastTurn(null);
            setError("Has huido del combate.");
            window.dispatchEvent(new CustomEvent("sidebar:reload"));
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    function handleReset() {
        setBattle(null);
        setResult(null);
        setLog([]);
        setLastTurn(null);
        setError("");
        setPvpResult(null);
    }

    async function handlePvp() {
        setError("");
        setPvpResult(null);
        setLoading(true);
        try {
            const res = await api.battlePvp(defId);
            setPvpResult(res);
            window.dispatchEvent(new CustomEvent("sidebar:reload"));
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    function typeMultiplierLabel(mult: number) {
        if (mult >= 2) return <span className="text-green font-bold"> ¡SUPER EFECTIVO!</span>;
        if (mult <= 0.5) return <span className="text-muted"> No muy efectivo</span>;
        return null;
    }

    const isBattleActive = !!battle;
    const isBattleOver = !!result;

    return (
        <Layout sidebar={<TrainerSidebar />}>
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
                <h1 className="font-display font-bold text-2xl tracking-widest">
                    ⚔️ <span className="text-red">Combate</span>
                </h1>
                {!isBattleActive && !isBattleOver && (
                    <div className="flex gap-2">
                        {(["npc", "pvp"] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => {
                                    setMode(m);
                                    handleReset();
                                }}
                                className={`px-4 py-1.5 rounded-lg font-display font-bold text-xs tracking-widest uppercase transition-all
                                    ${mode === m ? "text-bg" : "border border-border text-muted hover:border-blue hover:text-blue"}`}
                                style={
                                    mode === m
                                        ? {
                                              background:
                                                  m === "npc"
                                                      ? "linear-gradient(135deg,#ffd60a,#e6a800)"
                                                      : "linear-gradient(135deg,#e63946,#c1121f)",
                                          }
                                        : {}
                                }
                            >
                                {m === "npc" ? "⚔️ NPC" : "🔴 PvP"}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Columna principal */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {error && (
                        <div
                            className="flex-shrink-0 mx-4 mt-3 px-4 py-2 rounded-xl border text-sm font-semibold"
                            style={{
                                background: "rgba(230,57,70,0.1)",
                                borderColor: "rgba(230,57,70,0.3)",
                                color: "#e63946",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {/* Arena — altura fija */}
                    <div
                        className="flex-shrink-0 mx-4 mt-3 rounded-2xl border border-border overflow-hidden relative"
                        style={{ height: 200, background: "linear-gradient(135deg, #0d1525, #0f1923)" }}
                    >
                        {/* Daño flotante */}
                        <FloatingDamage floats={floats} />

                        {isBattleOver && (
                            <div
                                className={`text-center py-2 font-display font-bold text-2xl tracking-widest border-b
                                ${result!.result === "WIN" ? "text-green border-green/20" : "text-red border-red/20"}`}
                                style={{
                                    background:
                                        result!.result === "WIN" ? "rgba(6,214,160,0.08)" : "rgba(230,57,70,0.08)",
                                }}
                            >
                                {result!.result === "WIN" ? "🏆 VICTORIA" : "💀 DERROTA"}
                            </div>
                        )}

                        {(isBattleActive || isBattleOver) && (
                            <div className="flex items-center justify-around px-8 h-full">
                                {/* Jugador */}
                                <div className="text-center w-36">
                                    <div
                                        className="w-16 h-16 mx-auto flex items-center justify-center text-4xl mb-2"
                                        style={{ filter: "drop-shadow(0 0 8px rgba(76,201,240,0.5))" }}
                                    >
                                        🔵
                                    </div>
                                    <div className="font-display font-bold text-xs mb-0.5 text-blue">
                                        {battle?.player.name} Nv.{battle?.player.level}
                                    </div>
                                    <div className="flex justify-center gap-1 mb-1">
                                        {(battle?.player.affinities ?? []).map((a) => (
                                            <TypeBadge key={a} affinity={a} />
                                        ))}
                                    </div>
                                    <HpBar current={playerHp} max={battle?.player.maxHp ?? 1} color="#4cc9f0" />
                                    <div className="text-xs text-muted mt-0.5">
                                        {playerHp}/{battle?.player.maxHp ?? 0} HP
                                    </div>
                                </div>

                                <div className="font-display font-bold text-xl text-muted">VS</div>

                                {/* Enemigo */}
                                <div className="text-center w-36">
                                    <div
                                        className="w-16 h-16 mx-auto flex items-center justify-center text-4xl mb-2"
                                        style={{ filter: "drop-shadow(0 0 8px rgba(230,57,70,0.5))" }}
                                    >
                                        ❓
                                    </div>
                                    <div className="font-display font-bold text-xs mb-0.5 text-red uppercase">
                                        {battle?.enemy.name} Nv.{battle?.enemy.level}
                                    </div>
                                    <div className="flex justify-center gap-1 mb-1">
                                        {(battle?.enemy.affinities ?? []).map((a) => (
                                            <TypeBadge key={a} affinity={a} />
                                        ))}
                                    </div>
                                    <HpBar current={enemyHp} max={battle?.enemy.maxHp ?? 1} color="#e63946" />
                                    <div className="text-xs text-muted mt-0.5">
                                        {enemyHp}/{battle?.enemy.maxHp ?? 0} HP
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Sin combate activo */}
                        {!isBattleActive && !isBattleOver && (
                            <div className="flex items-center justify-center h-full">
                                <div className="text-muted text-sm font-display tracking-widest">
                                    Sin combate activo
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Último turno */}
                    {lastTurn && isBattleActive && (
                        <div className="flex-shrink-0 mx-4 mt-2 flex gap-2 text-xs">
                            <div className="flex-1 bg-blue/10 border border-blue/20 rounded-lg px-3 py-2">
                                <span className="text-blue font-bold">{lastTurn.playerMoveName}</span>
                                <span className="text-muted"> → </span>
                                <span className="text-white font-bold">{lastTurn.playerDamage} dmg</span>
                                {lastTurn.playerCritical && <span className="text-yellow"> ⚡CRÍTICO</span>}
                                {typeMultiplierLabel(lastTurn.playerTypeMultiplier)}
                            </div>
                            <div className="flex-1 bg-red/10 border border-red/20 rounded-lg px-3 py-2">
                                <span className="text-red font-bold">{lastTurn.enemyMoveName}</span>
                                <span className="text-muted"> → </span>
                                <span className="text-white font-bold">{lastTurn.enemyDamage} dmg</span>
                                {lastTurn.enemyCritical && <span className="text-yellow"> ⚡CRÍTICO</span>}
                                {typeMultiplierLabel(lastTurn.enemyTypeMultiplier)}
                            </div>
                        </div>
                    )}

                    {/* Recompensas */}
                    {isBattleOver && (
                        <div className="flex-shrink-0 mx-4 mt-2 flex gap-3">
                            <div className="flex-1 bg-bg3 rounded-xl p-2 text-center">
                                <div className="text-yellow font-display font-bold text-lg">+{result!.xpGained}</div>
                                <div className="text-muted text-xs">XP</div>
                            </div>
                            <div className="flex-1 bg-bg3 rounded-xl p-2 text-center">
                                <div className="text-yellow font-display font-bold text-lg">+{result!.coinsGained}</div>
                                <div className="text-muted text-xs">Monedas</div>
                            </div>
                            <div className="flex-1 bg-bg3 rounded-xl p-2 text-center">
                                <div className="text-blue font-display font-bold text-lg">{log.length}</div>
                                <div className="text-muted text-xs">Turnos</div>
                            </div>
                            {result!.captured && (
                                <div className="flex-1 bg-green/10 border border-green/30 rounded-xl p-2 text-center">
                                    <div className="text-2xl">✨</div>
                                    <div className="text-green text-xs font-display">¡Capturado!</div>
                                </div>
                            )}
                            {result!.evolution?.evolved && (
                                <div className="flex-1 bg-yellow/10 border border-yellow/30 rounded-xl p-2 text-center">
                                    <div className="text-2xl">⬆️</div>
                                    <div className="text-yellow text-xs font-display">¡Evolución!</div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Zona de acción — posición fija */}
                    <div className="flex-shrink-0 mx-4 mt-3">
                        {mode === "npc" && (
                            <>
                                {/* Moves + tabla de tipos en fila */}
                                <div className="flex gap-3">
                                    {/* 4 moves en grid 2x2 */}
                                    <div className="flex-1">
                                        {isBattleActive && (
                                            <div className="grid grid-cols-2 gap-2">
                                                {battle!.player.moves!.map((move) => (
                                                    <MoveButton
                                                        key={move.id}
                                                        move={move}
                                                        onClick={() => handleMove(move.id)}
                                                        disabled={loading}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        {!isBattleActive && !isBattleOver && (
                                            <button
                                                onClick={handleStartNpc}
                                                disabled={loading}
                                                className="w-full py-3 rounded-xl font-display font-bold text-lg tracking-widest uppercase disabled:opacity-40 transition-all"
                                                style={{
                                                    background: "linear-gradient(135deg,#e63946,#c1121f)",
                                                    boxShadow: "0 0 20px rgba(230,57,70,0.4)",
                                                }}
                                            >
                                                {loading ? "Buscando rival..." : "⚔️ ¡COMBATIR!"}
                                            </button>
                                        )}
                                        {isBattleOver && (
                                            <button
                                                onClick={handleReset}
                                                className="w-full py-3 rounded-xl border border-border text-muted font-display font-bold text-sm tracking-widest uppercase hover:border-red hover:text-red transition-all"
                                            >
                                                Volver a combatir
                                            </button>
                                        )}
                                    </div>

                                    {/* Tabla de tipos — siempre visible cuando hay combate */}
                                    {isBattleActive && battle && (
                                        <div className="w-48 flex-shrink-0">
                                            <AffinityTable
                                                playerAffinities={battle.player.affinities}
                                                enemyAffinities={battle.enemy.affinities}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Huir — siempre bajo los moves */}
                                {isBattleActive && (
                                    <button
                                        onClick={handleFlee}
                                        disabled={loading}
                                        className="w-full mt-2 py-2 rounded-xl border border-border text-muted font-display font-bold text-xs tracking-widest uppercase hover:border-red hover:text-red transition-all disabled:opacity-40"
                                    >
                                        🏃 Huir
                                    </button>
                                )}
                            </>
                        )}

                        {/* PvP */}
                        {mode === "pvp" && (
                            <>
                                {!pvpResult && (
                                    <input
                                        className="w-full bg-white/5 border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-blue transition-colors mb-2"
                                        placeholder="User ID del rival"
                                        value={defId}
                                        onChange={(e) => setDefId(e.target.value)}
                                    />
                                )}
                                {!pvpResult ? (
                                    <button
                                        onClick={handlePvp}
                                        disabled={loading || !defId}
                                        className="w-full py-3 rounded-xl font-display font-bold text-lg tracking-widest uppercase disabled:opacity-40 transition-all"
                                        style={{
                                            background: "linear-gradient(135deg,#e63946,#c1121f)",
                                            boxShadow: "0 0 20px rgba(230,57,70,0.4)",
                                        }}
                                    >
                                        {loading ? "Combatiendo..." : "🔴 ¡RETAR!"}
                                    </button>
                                ) : (
                                    <>
                                        <div
                                            className={`text-center py-3 rounded-xl font-display font-bold text-xl tracking-widest
                                            ${pvpResult.result === "WIN" ? "text-green bg-green/10 border border-green/20" : "text-red bg-red/10 border border-red/20"}`}
                                        >
                                            {pvpResult.result === "WIN" ? "🏆 VICTORIA PvP" : "💀 DERROTA PvP"}
                                        </div>
                                        <button
                                            onClick={handleReset}
                                            className="w-full mt-2 py-3 rounded-xl border border-border text-muted font-display font-bold text-sm tracking-widest uppercase hover:border-red hover:text-red transition-all"
                                        >
                                            Volver a combatir
                                        </button>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Log de turnos */}
                <div className="w-56 flex-shrink-0 border-l border-border flex flex-col overflow-hidden">
                    <div className="flex-shrink-0 px-4 py-3 border-b border-border font-display font-semibold text-xs text-muted tracking-widest uppercase">
                        Log de batalla
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
                        {log.length === 0 && (
                            <div className="text-muted text-xs text-center py-8 font-display tracking-widest">
                                Sin combate
                            </div>
                        )}
                        {log.map((t, i) => (
                            <div key={i} className="text-xs bg-white/3 rounded-lg px-2 py-1.5 border border-border/30">
                                <div className="text-muted font-display mb-1">Turno {t.turn}</div>
                                <div className="flex items-center gap-1 flex-wrap">
                                    <span className="text-blue font-semibold">{t.playerMoveName}</span>
                                    <span className="text-muted">→</span>
                                    <span className="text-white font-bold">{t.playerDamage}</span>
                                    {t.playerCritical && <span className="text-yellow">⚡</span>}
                                    {t.playerTypeMultiplier >= 2 && <span className="text-green text-xs">✅</span>}
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                    <span className="text-red font-semibold">{t.enemyMoveName}</span>
                                    <span className="text-muted">→</span>
                                    <span className="text-white font-bold">{t.enemyDamage}</span>
                                    {t.enemyCritical && <span className="text-yellow">⚡</span>}
                                    {t.enemyTypeMultiplier >= 2 && <span className="text-red text-xs">⚠️</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
