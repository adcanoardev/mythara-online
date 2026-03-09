import { useState, useEffect, useRef } from "react";
import Layout from "../components/Layout";
import TrainerSidebar from "../components/TrainerSidebar";
import { api } from "../lib/api";

// ─── Tipos ────────────────────────────────────────────────────
interface MythInstance {
    id: string;
    speciesId: string;
    name?: string;
    level: number;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
    isInParty: boolean;
    slot: number | null;
    inNursery: boolean;
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

// ─── Tarjeta de Myth ──────────────────────────────────────────
function MythCard({
    myth,
    dragging,
    onDragStart,
    onDragEnd,
    compact = false,
}: {
    myth: MythInstance;
    dragging?: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    compact?: boolean;
}) {
    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            className={`bg-bg3 border rounded-xl cursor-grab active:cursor-grabbing select-none transition-all
                ${dragging ? "opacity-40 scale-95" : "hover:border-blue/40"}
                ${compact ? "p-2" : "p-3"}`}
            style={{ borderColor: dragging ? "#4cc9f0" : "#1e2d45" }}
        >
            <div className={`flex items-center gap-2 ${compact ? "" : "mb-2"}`}>
                <div className={`flex items-center justify-center flex-shrink-0 ${compact ? "text-xl" : "text-3xl"}`}>
                    {myth.speciesId ? "🔵" : "❓"}
                </div>
                <div className="flex-1 min-w-0">
                    <div className={`font-display font-bold truncate ${compact ? "text-xs" : "text-sm"}`}>
                        {(myth as any).name ?? myth.speciesId}
                    </div>
                    <div className="text-muted text-xs">Nv. {myth.level}</div>
                </div>
            </div>
            {!compact && (
                <div className="grid grid-cols-3 gap-1 text-xs text-muted text-center">
                    <div>
                        <span className="text-blue font-bold">{myth.hp}</span>
                        <br />
                        HP
                    </div>
                    <div>
                        <span className="text-red font-bold">{myth.attack}</span>
                        <br />
                        ATK
                    </div>
                    <div>
                        <span className="text-green font-bold">{myth.defense}</span>
                        <br />
                        DEF
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Slot del equipo ──────────────────────────────────────────
function PartySlot({
    slot,
    myth,
    onDrop,
    onRemove,
    isOver,
    partyCount,
}: {
    slot: number;
    myth: MythInstance | null;
    onDrop: (slot: number) => void;
    onRemove: (slot: number) => void;
    isOver: boolean;
    partyCount: number;
}) {
    return (
        <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(slot)}
            className={`rounded-2xl border-2 border-dashed transition-all min-h-32 flex flex-col items-center justify-center
                ${isOver ? "border-blue/60 bg-blue/5" : myth ? "border-border" : "border-border/40"}`}
        >
            {myth ? (
                <div className="w-full p-3">
                    <MythCard myth={myth} />
                    <button
                        onClick={() => onRemove(slot)}
                        disabled={partyCount <= 1}
                        className="w-full mt-2 text-xs text-muted hover:text-red transition-colors font-display tracking-widest disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                        ✕ Quitar
                    </button>
                </div>
            ) : (
                <div className="text-muted text-xs font-display tracking-widest text-center px-4">
                    <div className="text-2xl mb-1 opacity-20">＋</div>
                    Slot {slot + 1}
                </div>
            )}
        </div>
    );
}

// ─── Página ───────────────────────────────────────────────────
export default function EquipoPage() {
    const [all, setAll] = useState<MythInstance[]>([]);
    const [party, setParty] = useState<(MythInstance | null)[]>([null, null, null]);
    const [dragId, setDragId] = useState<string | null>(null);
    const [overSlot, setOverSlot] = useState<number | null>(null);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");
    const [dirty, setDirty] = useState(false);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        const creatures = await api.creatures();
        setAll(creatures);
        const newParty: (MythInstance | null)[] = [null, null, null];
        creatures
            .filter((c: MythInstance) => c.isInParty && !c.inNursery && c.slot !== null && c.slot >= 0)
            .forEach((c: MythInstance) => {
                if (c.slot !== null && c.slot <= 2) newParty[c.slot] = c;
            });
        setParty(newParty);
        setDirty(false);
    }

    // Myths en almacenamiento = no en equipo y no en guardería
    const storage = all.filter((c) => !c.isInParty && !c.inNursery);
    const inPartyIds = new Set(party.filter(Boolean).map((c) => c!.id));

    function handleDrop(slot: number) {
        if (!dragId) return;
        const myth = all.find((c) => c.id === dragId);
        if (!myth) return;

        // Si ya está en otro slot, lo quita de ahí
        const newParty = party.map((p) => (p?.id === dragId ? null : p));
        newParty[slot] = myth;
        setParty(newParty);
        setDirty(true);
        setDragId(null);
        setOverSlot(null);
    }

    function handleRemove(slot: number) {
        const newParty = [...party];
        newParty[slot] = null;
        setParty(newParty);
        setDirty(true);
    }

    async function handleSave() {
        setSaving(true);
        setMsg("");
        try {
            const partyPayload = party.map((m, slot) => (m ? { id: m.id, slot } : null)).filter(Boolean) as {
                id: string;
                slot: number;
            }[];
            await api.partyUpdate(partyPayload);
            setMsg("✅ Equipo guardado");
            setDirty(false);
            load();
        } catch (e: any) {
            setMsg(`❌ ${e.message}`);
        } finally {
            setSaving(false);
        }
    }

    return (
        <Layout sidebar={<TrainerSidebar />}>
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
                <h1 className="font-display font-bold text-2xl tracking-widest">
                    🐾 <span className="text-blue">Equipo</span>
                </h1>
                <div className="flex items-center gap-3">
                    {msg && (
                        <span
                            className="text-xs font-semibold"
                            style={{ color: msg.startsWith("✅") ? "#06d6a0" : "#e63946" }}
                        >
                            {msg}
                        </span>
                    )}
                    {dirty && (
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-1.5 rounded-lg font-display font-bold text-xs tracking-widest uppercase text-bg disabled:opacity-50 transition-all"
                            style={{
                                background: "linear-gradient(135deg, #4cc9f0, #7b2fff)",
                                boxShadow: "0 0 12px rgba(76,201,240,0.3)",
                            }}
                        >
                            {saving ? "..." : "💾 Guardar equipo"}
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden p-6 gap-6">
                {/* Equipo activo — 3 slots */}
                <div className="w-64 flex-shrink-0 flex flex-col gap-3">
                    <div className="font-display font-bold text-sm tracking-widest text-white uppercase mb-1">
                        Equipo activo
                    </div>
                    {[0, 1, 2].map((slot) => (
                        <PartySlot
                            key={slot}
                            slot={slot}
                            myth={party[slot]}
                            onDrop={handleDrop}
                            onRemove={handleRemove}
                            isOver={overSlot === slot}
                            partyCount={party.filter(Boolean).length}
                        />
                    ))}
                    <div className="text-xs text-muted font-display text-center mt-1">
                        {party.filter(Boolean).length}/3 Myths
                    </div>
                </div>

                {/* Almacenamiento */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="font-display font-bold text-sm tracking-widest text-white uppercase mb-3 flex-shrink-0">
                        Almacenamiento — {storage.length} Myths
                    </div>
                    <div
                        className="flex-1 overflow-y-auto rounded-2xl border border-border bg-card/50 p-4"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                            if (!dragId) return;
                            const activeMythsInParty = party.filter((p) => p?.id === dragId && Boolean(p)).length;
                            const totalInParty = party.filter(Boolean).length;
                            // Si está en el equipo y es el único, no permitir
                            const isInParty = party.some((p) => p?.id === dragId);
                            if (isInParty && totalInParty <= 1) return;
                            const newParty = party.map((p) => (p?.id === dragId ? null : p));
                            setParty(newParty);
                            setDirty(true);
                            setDragId(null);
                        }}
                    >
                        {storage.length === 0 && all.filter((c) => !c.inNursery).length > 0 && (
                            <div className="text-white/60 text-xs text-center py-8 font-display tracking-widest">
                                Todos los Myths están en el equipo
                            </div>
                        )}
                        {storage.length === 0 && all.length === 0 && (
                            <div className="text-white/60 text-xs text-center py-8 font-display tracking-widest">
                                Sin Myths capturados aún
                            </div>
                        )}
                        <div className="grid grid-cols-3 gap-2">
                            {storage.map((myth) => (
                                <MythCard
                                    key={myth.id}
                                    myth={myth}
                                    dragging={dragId === myth.id}
                                    onDragStart={() => setDragId(myth.id)}
                                    onDragEnd={() => {
                                        setDragId(null);
                                        setOverSlot(null);
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Guardería — solo info */}
                    {all.filter((c) => c.inNursery).length > 0 && (
                        <div className="flex-shrink-0 mt-3 flex gap-2 flex-wrap">
                            <div className="text-xs text-muted font-display tracking-widest">🥚 En guardería:</div>
                            {all
                                .filter((c) => c.inNursery)
                                .map((c) => (
                                    <div
                                        key={c.id}
                                        className="text-xs bg-yellow/10 border border-yellow/20 rounded-lg px-2 py-1 text-yellow font-display"
                                    >
                                        {c.name ?? c.speciesId} Nv.{c.level}
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
