import { useState } from "react";
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
    enemyMove: string;
    enemyMoveName: string;
    playerDamage: number;
    enemyDamage: number;
    playerCritical: boolean;
    enemyCritical: boolean;
    playerHpAfter: number;
    enemyHpAfter: number;
}

interface BattleState {
    battleId: string;
    player: Combatant;
    enemy: Combatant;
    playerFirst: boolean;
}

interface BattleResult {
    result: "WIN" | "LOSE";
    xpGained: number;
    coinsGained: number;
    trainerLevel: number;
    captured: any;
    evolution: any;
}

// ── Componentes ───────────────────────────────────────────────

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

function MoveButton({ move, onClick, disabled }: { move: Move; onClick: () => void; disabled: boolean }) {
    const color = AFFINITY_COLOR[move.affinity] ?? "#5a6a85";
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className="flex flex-col items-start p-3 rounded-xl border transition-all disabled:opacity-40 hover:scale-[1.02] active:scale-[0.98]"
            style={{
                borderColor: `${color}40`,
                background: `${color}10`,
            }}
            onMouseEnter={(e) => {
                if (!disabled) (e.currentTarget as HTMLElement).style.borderColor = color;
            }}
            onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${color}40`;
            }}
        >
            <div className="flex items-center justify-between w-full mb-1">
                <span className="font-display font-bold text-sm tracking-wide" style={{ color }}>
                    {move.name}
                </span>
                <span className="text-xs font-display font-bold text-muted">POW {move.power}</span>
            </div>
            <div className="text-xs text-muted">{move.description}</div>
        </button>
    );
}

// ── Página principal ──────────────────────────────────────────

export default function CombatPage() {
    const [mode, setMode] = useState<"npc" | "pvp">("npc");
    const [defId, setDefId] = useState("");
    const [error, setError] = useState("");

    // Estado NPC por turnos
    const [battle, setBattle] = useState<BattleState | null>(null);
    const [playerHp, setPlayerHp] = useState(0);
    const [enemyHp, setEnemyHp] = useState(0);
    const [log, setLog] = useState<TurnResult[]>([]);
    const [result, setResult] = useState<BattleResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [lastTurn, setLastTurn] = useState<TurnResult | null>(null);

    // Estado PvP (simulado)
    const [pvpResult, setPvpResult] = useState<any>(null);

    // ── Iniciar combate NPC ───────────────────────────────────
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

    // ── Ejecutar turno ────────────────────────────────────────
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
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    // ── Huir ──────────────────────────────────────────────────
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
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    // ── Reset ─────────────────────────────────────────────────
    function handleReset() {
        setBattle(null);
        setResult(null);
        setLog([]);
        setLastTurn(null);
        setError("");
        setPvpResult(null);
    }

    // ── PvP (simulado sin cambios) ────────────────────────────
    async function handlePvp() {
        setError("");
        setPvpResult(null);
        setLoading(true);
        try {
            const res = await api.battlePvp(defId);
            setPvpResult(res);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
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
                <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
                    {/* Error */}
                    {error && (
                        <div
                            className="flex-shrink-0 px-4 py-2 rounded-xl border text-sm font-semibold"
                            style={{
                                background: "rgba(230,57,70,0.1)",
                                borderColor: "rgba(230,57,70,0.3)",
                                color: "#e63946",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {/* Arena */}
                    <div
                        className="flex-shrink-0 bg-card border border-border rounded-2xl overflow-hidden"
                        style={{ background: "linear-gradient(135deg, #0d1525, #0f1923)" }}
                    >
                        {/* Banner resultado */}
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

                        {/* Sprites + HP */}
                        {(isBattleActive || isBattleOver) && (
                            <div className="flex items-center justify-around px-8 py-4">
                                {/* Jugador */}
                                <div className="text-center w-32">
                                    <div
                                        className="w-16 h-16 mx-auto flex items-center justify-center text-4xl mb-2"
                                        style={{ filter: "drop-shadow(0 0 8px rgba(76,201,240,0.5))" }}
                                    >
                                        {battle?.player.art.front ?? (result && "🔵")}
                                    </div>
                                    <div className="font-display font-bold text-xs mb-1 text-blue">
                                        {battle?.player.name ?? ""} Nv.{battle?.player.level ?? ""}
                                    </div>
                                    <HpBar
                                        current={playerHp}
                                        max={(battle?.player.maxHp ?? result) ? 1 : 1}
                                        color="#4cc9f0"
                                    />
                                    <div className="text-xs text-muted mt-0.5">
                                        {playerHp}/{battle?.player.maxHp ?? 0} HP
                                    </div>
                                </div>

                                <div className="font-display font-bold text-xl text-muted">VS</div>

                                {/* Enemigo */}
                                <div className="text-center w-32">
                                    <div
                                        className="w-16 h-16 mx-auto flex items-center justify-center text-4xl mb-2"
                                        style={{ filter: "drop-shadow(0 0 8px rgba(230,57,70,0.5))" }}
                                    >
                                        {battle?.enemy.art.front ?? "❓"}
                                    </div>
                                    <div className="font-display font-bold text-xs mb-1 text-red uppercase">
                                        {battle?.enemy.name ?? ""} Nv.{battle?.enemy.level ?? ""}
                                    </div>
                                    <HpBar current={enemyHp} max={battle?.enemy.maxHp ?? 1} color="#e63946" />
                                    <div className="text-xs text-muted mt-0.5">
                                        {enemyHp}/{battle?.enemy.maxHp ?? 0} HP
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Último turno */}
                        {lastTurn && isBattleActive && (
                            <div className="px-4 pb-3 flex gap-2 text-xs">
                                <div className="flex-1 bg-blue/10 border border-blue/20 rounded-lg px-3 py-2">
                                    <span className="text-blue font-bold">{lastTurn.playerMoveName}</span>
                                    <span className="text-muted"> → </span>
                                    <span className="text-white font-bold">{lastTurn.playerDamage} dmg</span>
                                    {lastTurn.playerCritical && <span className="text-yellow"> ⚡CRÍTICO</span>}
                                </div>
                                <div className="flex-1 bg-red/10 border border-red/20 rounded-lg px-3 py-2">
                                    <span className="text-red font-bold">{lastTurn.enemyMoveName}</span>
                                    <span className="text-muted"> → </span>
                                    <span className="text-white font-bold">{lastTurn.enemyDamage} dmg</span>
                                    {lastTurn.enemyCritical && <span className="text-yellow"> ⚡CRÍTICO</span>}
                                </div>
                            </div>
                        )}

                        {/* Recompensas */}
                        {isBattleOver && (
                            <div className="flex gap-3 px-4 pb-3 pt-2 border-t border-border/50">
                                <div className="flex-1 bg-bg3 rounded-xl p-2 text-center">
                                    <div className="text-yellow font-display font-bold text-lg">
                                        +{result!.xpGained}
                                    </div>
                                    <div className="text-muted text-xs">XP</div>
                                </div>
                                <div className="flex-1 bg-bg3 rounded-xl p-2 text-center">
                                    <div className="text-yellow font-display font-bold text-lg">
                                        +{result!.coinsGained}
                                    </div>
                                    <div className="text-muted text-xs">Monedas</div>
                                </div>
                                <div className="flex-1 bg-bg3 rounded-xl p-2 text-center">
                                    <div className="text-blue font-display font-bold text-lg">{log.length}</div>
                                    <div className="text-muted text-xs">Turnos</div>
                                </div>
                                {result!.captured && (
                                    <div className="flex-1 bg-green/10 border border-green/30 rounded-xl p-2 text-center">
                                        <div className="text-3xl">{result!.captured.art?.portrait ?? "✨"}</div>
                                        <div className="text-green text-xs font-display">¡Capturado!</div>
                                        <div className="text-muted text-xs">{result!.captured.name}</div>
                                    </div>
                                )}
                                {result!.evolution?.evolved && (
                                    <div className="flex-1 bg-yellow/10 border border-yellow/30 rounded-xl p-2 text-center">
                                        <div className="text-3xl">⬆️</div>
                                        <div className="text-yellow text-xs font-display">¡Evolución!</div>
                                        <div className="text-muted text-xs">{result!.evolution.newName}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Moves / Botones de acción */}
                    {mode === "npc" && (
                        <>
                            {/* Grid de moves activos */}
                            {isBattleActive && (
                                <div className="flex-shrink-0 grid grid-cols-2 gap-2">
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

                            {/* Botón huir */}
                            {isBattleActive && (
                                <button
                                    onClick={handleFlee}
                                    disabled={loading}
                                    className="flex-shrink-0 py-2 rounded-xl border border-border text-muted font-display font-bold text-xs tracking-widest uppercase hover:border-red hover:text-red transition-all disabled:opacity-40"
                                >
                                    🏃 Huir
                                </button>
                            )}

                            {/* Botón iniciar */}
                            {!isBattleActive && !isBattleOver && (
                                <button
                                    onClick={handleStartNpc}
                                    disabled={loading}
                                    className="flex-shrink-0 py-3 rounded-xl font-display font-bold text-lg tracking-widest uppercase disabled:opacity-40 transition-all"
                                    style={{
                                        background: "linear-gradient(135deg,#e63946,#c1121f)",
                                        boxShadow: "0 0 20px rgba(230,57,70,0.4)",
                                    }}
                                >
                                    {loading ? "Buscando rival..." : "⚔️ ¡COMBATIR!"}
                                </button>
                            )}

                            {/* Botón volver a combatir */}
                            {isBattleOver && (
                                <button
                                    onClick={handleReset}
                                    className="flex-shrink-0 py-3 rounded-xl border border-border text-muted font-display font-bold text-sm tracking-widest uppercase hover:border-red hover:text-red transition-all"
                                >
                                    Volver a combatir
                                </button>
                            )}
                        </>
                    )}

                    {/* PvP */}
                    {mode === "pvp" && (
                        <>
                            {!pvpResult && (
                                <input
                                    className="flex-shrink-0 bg-white/5 border border-border rounded-lg px-4 py-2 text-sm outline-none focus:border-blue transition-colors"
                                    placeholder="User ID del rival"
                                    value={defId}
                                    onChange={(e) => setDefId(e.target.value)}
                                />
                            )}
                            {!pvpResult ? (
                                <button
                                    onClick={handlePvp}
                                    disabled={loading || !defId}
                                    className="flex-shrink-0 py-3 rounded-xl font-display font-bold text-lg tracking-widest uppercase disabled:opacity-40 transition-all"
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
                                        className="flex-shrink-0 py-3 rounded-xl border border-border text-muted font-display font-bold text-sm tracking-widest uppercase hover:border-red hover:text-red transition-all"
                                    >
                                        Volver a combatir
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>

                {/* Log de turnos */}
                <div className="w-52 flex-shrink-0 border-l border-border flex flex-col overflow-hidden">
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
                                <div className="text-muted font-display mb-0.5">Turno {t.turn}</div>
                                <div>
                                    <span className="text-blue font-semibold">{t.playerMoveName}</span>
                                    <span className="text-muted"> → </span>
                                    <span className="text-white font-bold">{t.playerDamage}</span>
                                    {t.playerCritical && <span className="text-yellow">⚡</span>}
                                </div>
                                <div>
                                    <span className="text-red font-semibold">{t.enemyMoveName}</span>
                                    <span className="text-muted"> → </span>
                                    <span className="text-white font-bold">{t.enemyDamage}</span>
                                    {t.enemyCritical && <span className="text-yellow">⚡</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
