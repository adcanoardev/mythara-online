// apps/client/src/pages/TavernPage.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api";
import PageTopbar from "../components/PageTopbar";

// ─── Hook: número animado que cuenta suavemente entre valores ─────────────────
function useAnimatedNumber(target: number, duration = 350): number {
    const [display, setDisplay] = useState(target);
    const startRef = useRef(target);
    const startTimeRef = useRef<number | null>(null);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const from = display;
        const to = target;
        if (from === to) return;
        startRef.current = from;
        startTimeRef.current = null;

        const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

        const tick = (now: number) => {
            if (!startTimeRef.current) startTimeRef.current = now;
            const elapsed = now - startTimeRef.current;
            const progress = Math.min(elapsed / duration, 1);
            setDisplay(Math.round(from + (to - from) * ease(progress)));
            if (progress < 1) rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [target, duration]);

    return display;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface DistortionEntry {
    name: string;
    slug?: string;
    rarity?: string;
    art?: { portrait?: string; front?: string; back?: string };
    baseStats?: { hp?:number; atk?:number; def?:number; spd?:number; critChance?:number };
    moves?: Move[];
    description?: string;
    triggerTurn?: number;
}
interface Myth {
    id: string;
    speciesId: string;
    name?: string;
    level: number;
    rarity: string;
    affinities: string[];
    maxHp: number;
    attack: number;
    defense: number;
    speed: number;
    accuracy?: number;
    critChance?: number;
    moves?: Move[];
    art?: { portrait?: string; front?: string; back?: string } | string;
    distortion?: DistortionEntry[];   // from creatures.json via API
    inParty?: boolean;
    partySlot?: number;
    enhancer?: Enhancer | null;
}
interface Move {
    id: string;
    name: string;
    affinity: string;
    power?: number;
    cooldown: number;
    effect?: string;
    description?: string;
}
interface Enhancer {
    id: string;
    name: string;
    slot: string;
    level: number;
    statBoosts?: Record<string, number>;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const RARITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    COMMON:    { label: "COM",   color: "var(--rarity-common-color)",    bg: "var(--rarity-common-bg)",    border: "var(--rarity-common-border)"    },
    RARE:      { label: "RARE",  color: "var(--rarity-rare-color)",      bg: "var(--rarity-rare-bg)",      border: "var(--rarity-rare-border)"      },
    EPIC:      { label: "EPIC",  color: "var(--rarity-epic-color)",      bg: "var(--rarity-epic-bg)",      border: "var(--rarity-epic-border)"      },
    ELITE:     { label: "ELITE", color: "var(--rarity-elite-color)",     bg: "var(--rarity-elite-bg)",     border: "var(--rarity-elite-border)"     },
    LEGENDARY: { label: "LEG",   color: "var(--rarity-legendary-color)", bg: "var(--rarity-legendary-bg)", border: "var(--rarity-legendary-border)" },
    MYTHIC:    { label: "MYT",   color: "var(--rarity-mythic-color)",    bg: "var(--rarity-mythic-bg)",    border: "var(--rarity-mythic-border)"    },
};

const RARITY_GLOW: Record<string, string> = {
    COMMON:    "var(--rarity-common-glow)",
    RARE:      "var(--rarity-rare-glow)",
    EPIC:      "var(--rarity-epic-glow)",
    ELITE:     "var(--rarity-elite-glow)",
    LEGENDARY: "var(--rarity-legendary-glow)",
    MYTHIC:    "var(--rarity-mythic-glow)",
};

const AFFINITY_ICON: Record<string, string> = {
    EMBER: "🔥", TIDE: "💧", GROVE: "🌿", VOLT: "⚡",
    STONE: "🪨", FROST: "❄️", VENOM: "☠️", IRON: "⚙️",
    SHADE: "🌑", ASTRAL: "🌀",
};

const AFFINITY_FILTERS = ["ALL", "EMBER", "TIDE", "GROVE", "VOLT", "FROST", "VENOM", "SHADE", "ASTRAL"];

const STAT_CONFIG = [
    { key: "maxHp",    label: "HP",   max: 200, color: "linear-gradient(90deg,#06d6a0,#0891b2)" },
    { key: "attack",   label: "ATK",  max: 160, color: "linear-gradient(90deg,#ef4444,#f97316)" },
    { key: "defense",  label: "DEF",  max: 160, color: "linear-gradient(90deg,#3b82f6,#6366f1)" },
    { key: "speed",    label: "SPD",  max: 160, color: "linear-gradient(90deg,#a78bfa,#7b2fff)" },
    { key: "accuracy", label: "ACC",  max: 100, color: "linear-gradient(90deg,#fbbf24,#f59e0b)" },
    { key: "critChance", label: "CRIT", max: 100, color: "linear-gradient(90deg,#f472b6,#ec4899)" },
];

// ─── Utils ────────────────────────────────────────────────────────────────────
// portrait → para cards pequeñas (grid izquierda)
function mythArtUrl(myth: Myth): string {
    if (!myth.art) return "";
    if (typeof myth.art === "string") return myth.art;
    return myth.art.portrait ?? myth.art.front ?? myth.art.back ?? "";
}

// front → para el display grande central
function mythFrontUrl(art: any): string {
    if (!art) return "";
    if (typeof art === "string") return art;
    return art.front ?? art.portrait ?? art.back ?? "";
}

function calcPower(m: Myth): number {
    const MULT: Record<string, number> = { COMMON:1, RARE:1.2, EPIC:1.4, ELITE:1.6, LEGENDARY:2, MYTHIC:2.5 };
    return Math.floor(((m.maxHp||0)*.4+(m.attack||0)*.3+(m.defense||0)*.2+(m.speed||0)*.1)*(MULT[m.rarity]??1));
}

// ─── MythCard (left grid) ─────────────────────────────────────────────────────
const AFFINITY_CDN = "https://cdn.jsdelivr.net/gh/adcanoardev/mythara-assets@7613486785dc2b2089f6d345e1281e9316c1d982/affinity";

function MythCard({ myth, selected, onClick }: { myth: Myth; selected: boolean; onClick: () => void }) {
    const rar = RARITY_CONFIG[myth.rarity] ?? RARITY_CONFIG.COMMON;
    const aff = myth.affinities?.[0] ?? "";
    const artUrl = mythArtUrl(myth);
    const affIconUrl = aff ? `${AFFINITY_CDN}/${aff.toLowerCase()}_affinity_icon.webp` : null;

    return (
        <div onClick={onClick}
            className="relative overflow-hidden cursor-pointer transition-all duration-200"
            style={{
                borderRadius: 10,
                aspectRatio: "0.72",
                border: selected ? `2px solid ${rar.color}cc` : `1px solid ${rar.border}`,
                boxShadow: selected ? `0 0 14px ${RARITY_GLOW[myth.rarity]}, inset 0 0 8px ${RARITY_GLOW[myth.rarity].replace(/[\d.]+\)$/, "0.15)")}` : "none",
                background: "linear-gradient(135deg,#0d1525,#070f1a)",
            }}>
            {/* Art */}
            {artUrl ? (
                <img src={artUrl} alt={myth.name ?? myth.speciesId}
                    className="absolute inset-0 w-full h-full object-cover object-top"
                    style={{ opacity: 0.85 }}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center"
                    style={{ fontSize: 36, opacity: 0.4 }}>❓</div>
            )}

            {/* Gradient overlay */}
            <div className="absolute inset-0"
                style={{ background: "linear-gradient(180deg, transparent 35%, rgba(4,8,15,.97) 82%)" }} />

            {/* Party dot */}
            {myth.inParty && (
                <div className="absolute top-1.5 right-1.5">
                    <span className="w-2 h-2 rounded-full block"
                        style={{ background: "#06d6a0", boxShadow: "0 0 6px #06d6a0" }} />
                </div>
            )}

            {/* Bottom info */}
            <div className="absolute bottom-0 left-0 right-0 px-1.5 pb-1.5">
                {/* Nombre */}
                <div style={{
                    fontFamily: "'Rajdhani', sans-serif",
                    fontWeight: 800,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                    color: "#e2e8f0",
                    lineHeight: 1.1,
                    marginBottom: 3,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                }}>
                    {myth.name ?? myth.speciesId}
                </div>
                {/* Icono afinidad (izq) + Nivel (der) */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {affIconUrl ? (
                        <img src={affIconUrl} alt={aff}
                            style={{ width: 14, height: 14, objectFit: "contain" }}
                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                        <span style={{ fontSize: 10 }}>{AFFINITY_ICON[aff] ?? ""}</span>
                    )}
                    <span style={{
                        fontFamily: "'Rajdhani', sans-serif",
                        fontWeight: 700,
                        fontSize: 10,
                        color: rar.color,
                        background: rar.bg,
                        border: `1px solid ${rar.border}`,
                        borderRadius: 4,
                        padding: "1px 4px",
                        letterSpacing: ".04em",
                    }}>
                        Lv.{myth.level}
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── Right panel tabs ─────────────────────────────────────────────────────────
type Tab = "stats" | "skills" | "gear";

const VTABS: { id: Tab; icon: string; label: string }[] = [
    { id: "stats",  icon: "📊", label: "Stats"  },
    { id: "skills", icon: "⚔️", label: "Skills" },
    { id: "gear",   icon: "💎", label: "Gear"   },
];

function StatsPanel({ myth }: { myth: Myth }) {
    const rar = RARITY_CONFIG[myth.rarity] ?? RARITY_CONFIG.COMMON;
    const power = calcPower(myth);

    const animHp   = useAnimatedNumber(myth.maxHp,         350);
    const animAtk  = useAnimatedNumber(myth.attack,        350);
    const animDef  = useAnimatedNumber(myth.defense,       350);
    const animSpd  = useAnimatedNumber(myth.speed,         350);
    const animAcc  = useAnimatedNumber(myth.accuracy ?? 100, 350);
    const animCrit = useAnimatedNumber(myth.critChance ?? 0, 350);

    const ANIMATED: Record<string, number> = {
        maxHp: animHp, attack: animAtk, defense: animDef,
        speed: animSpd, accuracy: animAcc, critChance: animCrit,
    };

    return (
        <div className="flex flex-col p-2 overflow-hidden h-full" style={{ gap: 3 }}>
            {STAT_CONFIG.map(({ key, label, max, color }, idx) => {
                const animated = ANIMATED[key] ?? 0;
                const raw = (myth as any)[key] ?? 0;
                const pct = Math.min(100, (raw / max) * 100);
                return (
                    <div key={key} className="tvn-stat-row flex items-center flex-shrink-0"
                        style={{
                            gap: 6, background: "rgba(255,255,255,.03)",
                            border: "1px solid rgba(255,255,255,.06)", borderRadius: 7, padding: "3px 8px",
                            animation: `tvnStatIn 0.35s cubic-bezier(0.16,1,0.3,1) ${idx * 0.045}s both`,
                        }}>
                        <span className="tvn-stat-label font-mono flex-shrink-0"
                            style={{ color: "rgba(255,255,255,.38)", letterSpacing: ".07em", fontSize: "var(--font-xs)", width: 26 }}>{label}</span>
                        <span className="tvn-stat-value font-black flex-shrink-0"
                            style={{ fontFamily: "'Rajdhani',sans-serif", color: "var(--text-primary)", fontSize: "var(--font-md)", width: 26, transition: "color .3s" }}>{animated}</span>
                        <div className="tvn-stat-bar flex-1 rounded-full overflow-hidden" style={{ height: 5, background: "rgba(255,255,255,.07)" }}>
                            <div className="h-full rounded-full" style={{
                                width: `${pct}%`, background: color,
                                transition: "width 0.45s cubic-bezier(0.16,1,0.3,1)",
                            }} />
                        </div>
                    </div>
                );
            })}
            {/* Affinity + Rarity + Power */}
            <div className="flex items-center justify-between flex-shrink-0 mt-1" style={{ gap: 4 }}>
                <div className="flex gap-1 flex-wrap flex-1">
                    {(myth.affinities ?? []).map(a => (
                        <span key={a} className="tvn-aff-tag font-mono px-1.5 py-0.5 rounded-md"
                            style={{ fontSize: "var(--font-2xs)", background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.25)", color: "#818cf8", display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <img src={`${AFFINITY_CDN}/${a.toLowerCase()}_affinity_icon.webp`} alt={a}
                                style={{ width: 11, height: 11, objectFit: "contain" }}
                                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            {a}
                        </span>
                    ))}
                    <span className="font-mono px-1.5 py-0.5 rounded-md"
                        style={{ fontSize: "var(--font-2xs)", background: rar.bg, color: rar.color, border: `1px solid ${rar.border}` }}>
                        {myth.rarity}
                    </span>
                </div>
                <div className="tvn-power font-black flex-shrink-0 px-2 py-1 rounded-lg"
                    style={{ fontFamily: "'Rajdhani',sans-serif", color: "var(--accent-gold)", fontSize: "var(--font-md)",
                        background: "rgba(251,191,36,.07)", border: "1px solid rgba(251,191,36,.18)" }}>
                    ⚡{power.toLocaleString()}
                </div>
            </div>
        </div>
    );
}

function SkillsPanel({ myth }: { myth: Myth }) {
    const moves = myth.moves ?? [];
    const MOVE_META = [
        { label: "BASIC",    badge: "CD 0",  badgeColor: "#64748b", borderColor: "rgba(100,116,139,.3)" },
        { label: "SKILL",    badge: "CD 2",  badgeColor: "#818cf8", borderColor: "rgba(129,140,248,.35)" },
        { label: "ULTIMATE", badge: "CD 4+", badgeColor: "#f472b6", borderColor: "rgba(244,114,182,.4)" },
    ];
    return (
        <div className="flex flex-col gap-2 p-2 overflow-y-auto h-full" style={{ scrollbarWidth: "none" }}>
            {moves.length === 0 && (
                <p className="font-mono text-[10px] text-center mt-8" style={{ color: "rgba(255,255,255,.25)" }}>No move data</p>
            )}
            {moves.map((move, i) => {
                const aff = move.affinity ?? "";
                const meta = MOVE_META[i] ?? { label: `FORM ${i+1}`, badge: `CD${move.cooldown}`, badgeColor: "#a78bfa", borderColor: "rgba(167,139,250,.35)" };
                const affIconUrl = aff ? `${AFFINITY_CDN}/${aff.toLowerCase()}_affinity_icon.webp` : null;
                return (
                    <div key={move.id ?? i}
                        className="tvn-move-row rounded-2xl overflow-hidden flex-shrink-0"
                        style={{
                            background: "rgba(255,255,255,.03)",
                            border: `1px solid ${meta.borderColor}`,
                            padding: "10px 12px",
                        }}>
                        {/* Header: tipo indicator + nombre + badge */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                            {/* Tipo */}
                            <div style={{
                                display: "flex", alignItems: "center", gap: 4,
                                background: "rgba(255,255,255,.05)",
                                borderRadius: 6, padding: "3px 7px",
                                border: "1px solid rgba(255,255,255,.08)",
                                flexShrink: 0,
                            }}>
                                {affIconUrl && (
                                    <img src={affIconUrl} alt={aff}
                                        style={{ width: 14, height: 14, objectFit: "contain" }}
                                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                )}
                                <span style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,.5)", letterSpacing: ".08em" }}>{aff}</span>
                            </div>
                            {/* Nombre */}
                            <span className="tvn-move-name font-black flex-1"
                                style={{ fontFamily: "'Rajdhani',sans-serif", color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                                {move.name}
                            </span>
                            {/* CD badge */}
                            <span style={{
                                fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
                                fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase",
                                color: meta.badgeColor,
                                background: `${meta.badgeColor}18`,
                                border: `1px solid ${meta.badgeColor}40`,
                                borderRadius: 6, padding: "2px 8px",
                                flexShrink: 0,
                            }}>
                                {meta.badge}
                            </span>
                        </div>
                        {/* Tipo label */}
                        <div style={{ marginBottom: 5 }}>
                            <span style={{
                                fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
                                fontSize: 9, letterSpacing: ".18em", textTransform: "uppercase",
                                color: meta.badgeColor, opacity: 0.7,
                            }}>{meta.label}</span>
                        </div>
                        {/* Descripción */}
                        {(move.description ?? move.effect) && (
                            <p className="tvn-move-desc font-mono leading-relaxed"
                                style={{ color: "rgba(255,255,255,.5)", fontSize: "var(--font-xs)", lineHeight: 1.5, marginBottom: move.power ? 6 : 0 }}>
                                {move.description ?? move.effect}
                            </p>
                        )}
                        {/* Power — grande y destacado */}
                        {move.power && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                                <span style={{ fontFamily: "monospace", fontSize: 9, color: "rgba(255,255,255,.3)", letterSpacing: ".1em" }}>POWER</span>
                                <span style={{
                                    fontFamily: "'Rajdhani',sans-serif", fontWeight: 900,
                                    fontSize: "clamp(18px,2.5vw,26px)",
                                    color: "var(--accent-gold)",
                                    letterSpacing: ".04em",
                                    textShadow: "0 0 16px rgba(251,191,36,.4)",
                                }}>
                                    {move.power}
                                </span>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function GearPanel({ myth }: { myth: Myth }) {
    const enhancer = myth.enhancer ?? null;
    const slots = [
        { id: "weapon",    label: "Weapon",    unlockLv: 1  },
        { id: "armor",     label: "Armor",     unlockLv: 20 },
        { id: "accessory", label: "Accessory", unlockLv: 40 },
    ];
    return (
        <div className="flex flex-col gap-2 p-3 overflow-y-auto h-full" style={{ scrollbarWidth: "none" }}>
            <p className="font-mono text-[8px] tracking-widest mb-1" style={{ color: "rgba(255,255,255,.2)" }}>EQUIPPED GEMS</p>
            {slots.map(slot => {
                const locked = myth.level < slot.unlockLv;
                const equipped = !locked && enhancer?.slot === slot.id;
                return (
                    <div key={slot.id} className="flex items-center gap-2.5 p-2.5 rounded-xl"
                        style={{
                            background: equipped ? "rgba(251,191,36,.05)" : "rgba(255,255,255,.02)",
                            border: equipped ? "1px solid rgba(251,191,36,.22)" : locked ? "1px dashed rgba(255,255,255,.07)" : "1px dashed rgba(255,255,255,.12)",
                            opacity: locked ? 0.45 : 1,
                        }}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: equipped ? "rgba(251,191,36,.12)" : "rgba(255,255,255,.04)", border: equipped ? "1px solid rgba(251,191,36,.28)" : "1px dashed rgba(255,255,255,.12)", fontSize: 18 }}>
                            {locked ? "🔒" : equipped ? "💎" : "＋"}
                        </div>
                        <div className="flex-1 min-w-0">
                            {equipped && enhancer ? (
                                <>
                                    <p className="font-black text-xs" style={{ fontFamily: "'Rajdhani',sans-serif", color: "var(--text-primary)", textTransform: "uppercase" }}>
                                        {enhancer.name} Lv.{enhancer.level}
                                    </p>
                                    <p className="font-mono text-[9px]" style={{ color: "rgba(251,191,36,.7)" }}>
                                        {Object.entries(enhancer.statBoosts ?? {}).map(([k,v]) => `+${v} ${k}`).join(" · ")}
                                    </p>
                                </>
                            ) : locked ? (
                                <p className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,.22)" }}>
                                    {slot.label} · Unlock Lv.{slot.unlockLv}
                                </p>
                            ) : (
                                <p className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,.3)" }}>
                                    {slot.label} slot — empty
                                </p>
                            )}
                        </div>
                        {equipped && (
                            <button className="font-mono text-[9px] transition-colors hover:text-white/60"
                                style={{ color: "rgba(255,255,255,.25)" }}>⬆ Upgrade</button>
                        )}
                    </div>
                );
            })}
            <div className="mt-2 p-2.5 rounded-xl text-center"
                style={{ background: "rgba(255,255,255,.02)", border: "1px dashed rgba(255,255,255,.07)" }}>
                <p className="font-mono text-[9px]" style={{ color: "rgba(255,255,255,.22)" }}>
                    Gems drop from Sanctuaries & Events
                </p>
            </div>
        </div>
    );
}

function FormPanel({ myth }: { myth: Myth }) {
    const rar = RARITY_CONFIG[myth.rarity] ?? RARITY_CONFIG.COMMON;
    const [activeForm, setActiveForm] = useState(0);

    const forms = [
        {
            label: "BASE",
            sublabel: "Current form",
            color: rar.color,
            glow: RARITY_GLOW[myth.rarity],
            desc: "Original form. Balanced stats and standard move set.",
            statMods: {} as Record<string,string>,
            moveMod: null as string|null,
        },
        {
            label: "FORM 2",
            sublabel: "50% Distortion",
            color: "#a78bfa",
            glow: "rgba(167,139,250,.5)",
            desc: "Power surge at half Distortion. ATK and SPD increase, DEF drops.",
            statMods: { ATK: "+15", SPD: "+10", DEF: "-8" } as Record<string,string>,
            moveMod: "Skill move evolves — enhanced version unlocked.",
        },
        {
            label: "FORM 3",
            sublabel: "MAX Distortion",
            color: "#f472b6",
            glow: "rgba(244,114,182,.55)",
            desc: "True form unleashed. All stats amplified. New ultimate move activated.",
            statMods: { HP: "+25", ATK: "+30", SPD: "+20", DEF: "+10" } as Record<string,string>,
            moveMod: "Ultimate move changes to its most powerful version.",
        },
    ];

    const active = forms[activeForm];

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Form selector pills */}
            <div className="flex gap-1.5 p-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                {forms.map((f, i) => (
                    <button key={i} onClick={() => setActiveForm(i)}
                        className="flex-1 rounded-lg transition-all active:scale-95"
                        style={{
                            padding: "5px 4px",
                            background: activeForm === i ? `${f.color}20` : "rgba(255,255,255,.03)",
                            border: activeForm === i ? `1px solid ${f.color}55` : "1px solid rgba(255,255,255,.08)",
                            boxShadow: activeForm === i ? `0 0 10px ${f.color}22` : "none",
                            cursor: "pointer", outline: "none",
                        }}>
                        <div className="font-black" style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "var(--font-xs)", letterSpacing: ".06em",
                            color: activeForm === i ? f.color : "rgba(255,255,255,.3)", textTransform: "uppercase" }}>
                            {f.label}
                        </div>
                        <div className="font-mono" style={{ fontSize: 7, color: activeForm === i ? `${f.color}88` : "rgba(255,255,255,.2)", marginTop: 1 }}>
                            {f.sublabel}
                        </div>
                    </button>
                ))}
            </div>

            {/* Active form content */}
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2" style={{ scrollbarWidth: "none" }}>
                <p className="font-mono text-[9px] leading-relaxed" style={{ color: "rgba(255,255,255,.45)", lineHeight: 1.5 }}>
                    {active.desc}
                </p>

                {Object.keys(active.statMods).length > 0 && (
                    <>
                        <p className="font-mono text-[8px] tracking-widest" style={{ color: "rgba(255,255,255,.2)" }}>STAT CHANGES</p>
                        <div className="grid grid-cols-2 gap-1">
                            {Object.entries(active.statMods).map(([k, v]) => (
                                <div key={k} className="flex items-center justify-between px-2 py-1 rounded-lg"
                                    style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}>
                                    <span className="font-mono" style={{ fontSize: "var(--font-2xs)", color: "rgba(255,255,255,.4)" }}>{k}</span>
                                    <span className="font-black" style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "var(--font-base)",
                                        color: v.startsWith("+") ? "#06d6a0" : "#ef4444" }}>{v}</span>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {active.moveMod && (
                    <div className="px-2 py-2 rounded-xl"
                        style={{ background: `${active.color}0d`, border: `1px solid ${active.color}30` }}>
                        <p className="font-mono text-[9px] leading-relaxed" style={{ color: `${active.color}cc` }}>
                            ⚔️ {active.moveMod}
                        </p>
                    </div>
                )}

                {activeForm === 0 && (
                    <div className="px-2 py-2 rounded-xl"
                        style={{ background: "rgba(167,139,250,.06)", border: "1px solid rgba(167,139,250,.15)" }}>
                        <p className="font-mono text-[9px] leading-relaxed" style={{ color: "rgba(167,139,250,.8)" }}>
                            🌀 Fill the Distortion bar in battle to unlock Form 2 and Form 3.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── TavernPage ───────────────────────────────────────────────────────────────
// ─── Inventory items ──────────────────────────────────────────────────────────
const INV_ITEMS = [
    { id:"elixir",       icon:"⚗️", name:"Elixir",       rarity:"Consumable", color:"var(--accent-blue)", desc:"Instantly restores a Myth's HP to full. Use before a tough battle.",           source:"Laboratory · Outpost" },
    { id:"turbo_elixir", icon:"💠", name:"Turbo Elixir", rarity:"Consumable", color:"var(--accent-purple)", desc:"Doubles nursery training speed for 1 hour. Great for fast leveling.",           source:"Laboratory · Special Events" },
    { id:"antidote",     icon:"🧪", name:"Antidote",     rarity:"Consumable", color:"var(--accent-green)", desc:"Cures all status effects: poison, burn and paralysis in one use.",              source:"Laboratory · Outpost" },
    { id:"boost_atk",    icon:"🔥", name:"ATK Boost",    rarity:"Consumable", color:"#f97316", desc:"Increases a Myth's ATK by 20% for the duration of the next battle.",            source:"Laboratory · PvP Rewards" },
    { id:"boost_def",    icon:"🛡️", name:"DEF Boost",    rarity:"Consumable", color:"#3b82f6", desc:"Increases a Myth's DEF by 20% for the duration of the next battle.",            source:"Laboratory · Sanctuaries" },
    { id:"mega_elixir",  icon:"✨", name:"Mega Elixir",  rarity:"Consumable", color:"#fcd34d", desc:"Restores the entire team to 100% HP. Rare and powerful — save it for bosses.",  source:"Special Events · Guild Rewards" },
    { id:"fragment",     icon:"◈",  name:"Fragment",     rarity:"Material",   color:"#ffffff", desc:"Mythara essence compressed into crystalline form. Open at the Forge to summon a Myth.", source:"Forge · Sanctuaries · Events" },
    { id:"rock_fragment",icon:"🪨", name:"Rock Fragment", rarity:"Material",  color:"#94a3b8", desc:"Raw mineral extracted from the Mine. Used in future crafting recipes.",         source:"Mine · Outpost" },
    { id:"arcane_gear",  icon:"⚙️", name:"Arcane Gear",  rarity:"Material",   color:"#64748b", desc:"Mechanical part imbued with arcane energy. Used in future crafting.",           source:"Laboratory · Bosses" },
];

export default function TavernPage() {
    const [myths, setMyths] = useState<Myth[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<Myth | null>(null);
    const [tab, setTab] = useState<Tab>("stats");
    const [affFilter, setAffFilter] = useState("ALL");
    const [leftTab, setLeftTab] = useState<"myths" | "inventory">("myths");
    const [selItem, setSelItem] = useState<typeof INV_ITEMS[0] | null>(null);
    const [showInventory, setShowInventory] = useState(false);
    const [selectedForm, setSelectedForm] = useState(0);
    const [distortionFlash, setDistortionFlash] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const [flashPos, setFlashPos] = useState<{ x: number; y: number } | null>(null);
    const artContainerRef = useRef<HTMLDivElement>(null); // incrementa al cambiar forma → re-anima nombre/tipo
    // Overlays
    const [expandedView, setExpandedView] = useState(false);
    const [expandAffFilter, setExpandAffFilter] = useState("ALL");
    const [expandRarFilter, setExpandRarFilter] = useState("ALL");
    const [sortBy, setSortBy] = useState<"level_rarity" | "level" | "rarity" | "power" | "name">("level_rarity");

    // ─── Orden compartido — se aplica en panel izquierdo Y en expand ──
    const RARITY_RANK: Record<string, number> = { COMMON:0, RARE:1, EPIC:2, ELITE:3, LEGENDARY:4, MYTHIC:5 };
    function applySort(list: Myth[]): Myth[] {
        return [...list].sort((a, b) => {
            switch (sortBy) {
                case "level_rarity":
                    if (b.level !== a.level) return b.level - a.level;
                    return (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0);
                case "level":   return b.level - a.level;
                case "rarity":  return (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0);
                case "power":   return calcPower(b) - calcPower(a);
                case "name":    return (a.name ?? a.speciesId).localeCompare(b.name ?? b.speciesId);
                default:        return 0;
            }
        });
    }

    // Normaliza un creature del backend: moves/distortion/stats pueden venir
    // directos o anidados en speciesData segun la version del backend
    const normalizeMyth = (c: any): Myth => {
        const sd = c.speciesData ?? c.species ?? c.speciesInfo ?? {};
        return {
            ...c,
            moves:      c.moves?.length      ? c.moves      : sd.moves?.length      ? sd.moves      : [],
            distortion: c.distortion?.length ? c.distortion : sd.distortion?.length ? sd.distortion : [],
            art:        c.art    ?? sd.art   ?? null,
            affinities: c.affinities?.length ? c.affinities : sd.affinities?.length ? sd.affinities : [],
            maxHp:      c.maxHp      ?? c.hp   ?? sd.baseStats?.hp        ?? 0,
            attack:     c.attack     ?? c.atk  ?? sd.baseStats?.atk       ?? 0,
            defense:    c.defense    ?? c.def  ?? sd.baseStats?.def       ?? 0,
            speed:      c.speed      ?? c.spd  ?? sd.baseStats?.spd       ?? 0,
            accuracy:   c.accuracy            ?? sd.baseStats?.acc        ?? 100,
            critChance: c.critChance           ?? sd.baseStats?.critChance ?? 0,
            rarity:     c.rarity    ?? sd.rarity   ?? "COMMON",
            name:       c.name      ?? sd.name     ?? c.speciesId,
        };
    };

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const raw = await api.creatures() as any[];
            const all: Myth[] = (raw ?? []).map(normalizeMyth);
            setMyths(all);
            if (all.length > 0) setSelected(all[0]);
        } catch {}
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = applySort(
        myths.filter(m => affFilter === "ALL" || (m.affinities ?? []).includes(affFilter))
    );

    const rar = selected ? (RARITY_CONFIG[selected.rarity] ?? RARITY_CONFIG.COMMON) : null;
    const artUrl = selected ? mythArtUrl(selected) : "";
    const power = selected ? calcPower(selected) : 0;

    // Calcular activeMyth al nivel del componente para que sea accesible desde el panel derecho
    const activeMyth: Myth | null = (() => {
        if (!selected) return null;
        const distForms = selected.distortion ?? [];
        const clampedForm = Math.min(selectedForm, distForms.length);
        if (clampedForm === 0) return selected;
        const distFormData = distForms[clampedForm - 1];
        if (!distFormData) return selected;
        const formAffinities: string[] = distFormData.affinities?.length
            ? distFormData.affinities
            : selected.affinities ?? [];
        return {
            ...selected,
            affinities: formAffinities,
            rarity: distFormData.rarity ?? selected.rarity,
            maxHp:      distFormData.baseStats?.hp  ?? selected.maxHp,
            attack:     distFormData.baseStats?.atk ?? selected.attack,
            defense:    distFormData.baseStats?.def ?? selected.defense,
            speed:      distFormData.baseStats?.spd ?? selected.speed,
            moves:      distFormData.moves?.length ? distFormData.moves : selected.moves,
        };
    })();

    return (
        <div className="fixed inset-0 flex flex-col overflow-hidden"
            style={{ background: "#070b14", fontFamily: "'Exo 2',sans-serif" }}>
            <style>{`
                @keyframes tvnFadeSlideUp {
                    from { opacity: 0; transform: translateY(10px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes tvnStatIn {
                    from { opacity: 0; transform: translateX(-6px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @media (min-width: 768px) {
                    .tvn-card-name  { font-size: 13px !important; }
                    .tvn-stat-label { font-size: 13px !important; }
                    .tvn-stat-value { font-size: 22px !important; }
                    .tvn-stat-row   { padding: 6px 12px !important; border-radius: 10px !important; }
                    .tvn-stat-bar   { height: 8px !important; }
                    .tvn-move-name  { font-size: 16px !important; }
                    .tvn-move-desc  { font-size: 11px !important; }
                    .tvn-move-row   { padding: 10px 12px !important; border-radius: 12px !important; }
                    .tvn-vtab-icon  { font-size: 20px !important; }
                    .tvn-vtab-label { font-size: 9px  !important; }
                    .tvn-vtab-btn   { padding-top: 12px !important; padding-bottom: 12px !important; gap: 5px !important; }
                    .tvn-filter-btn { font-size: 11px !important; padding: 3px 9px !important; }
                    .tvn-left-tab   { font-size: 10px !important; }
                    .tvn-inv-name   { font-size: 13px !important; }
                    .tvn-inv-rarity { font-size: 9px  !important; }
                    .tvn-inv-dname  { font-size: 16px !important; }
                    .tvn-inv-desc   { font-size: 11px !important; }
                    .tvn-inv-src    { font-size: 10px !important; }
                    .tvn-power      { font-size: 20px !important; }
                    .tvn-panel-lbl  { font-size: 10px !important; letter-spacing: .18em !important; margin-bottom: 6px !important; }
                    .tvn-right      { width: clamp(260px, 36%, 420px) !important; }
                    .tvn-vtabs-col  { width: 56px !important; }
                    .tvn-aff-tag    { font-size: 10px !important; padding: 2px 8px !important; }
                    .tvn-cd-badge   { font-size: 9px  !important; padding: 2px 8px !important; }
                }
                @media (min-width: 1280px) {
                    .tvn-card-name  { font-size: 14px !important; }
                    .tvn-stat-label { font-size: 14px !important; }
                    .tvn-stat-value { font-size: 26px !important; }
                    .tvn-stat-row   { padding: 8px 14px !important; }
                    .tvn-stat-bar   { height: 9px !important; }
                    .tvn-move-name  { font-size: 18px !important; }
                    .tvn-move-desc  { font-size: 12px !important; }
                    .tvn-move-row   { padding: 12px 14px !important; }
                    .tvn-vtab-icon  { font-size: 22px !important; }
                    .tvn-vtab-label { font-size: 10px !important; }
                    .tvn-vtab-btn   { padding-top: 14px !important; padding-bottom: 14px !important; }
                    .tvn-filter-btn { font-size: 12px !important; padding: 4px 11px !important; }
                    .tvn-left-tab   { font-size: 12px !important; }
                    .tvn-inv-name   { font-size: 15px !important; }
                    .tvn-inv-rarity { font-size: 10px !important; }
                    .tvn-inv-dname  { font-size: 18px !important; }
                    .tvn-inv-desc   { font-size: 13px !important; }
                    .tvn-inv-src    { font-size: 12px !important; }
                    .tvn-power      { font-size: 24px !important; }
                    .tvn-panel-lbl  { font-size: 11px !important; }
                    .tvn-right      { width: clamp(300px, 38%, 480px) !important; }
                    .tvn-vtabs-col  { width: 62px !important; }
                    .tvn-aff-tag    { font-size: 11px !important; padding: 3px 10px !important; }
                    .tvn-cd-badge   { font-size: 10px !important; padding: 2px 10px !important; }
                }
            `}</style>

            {/* Ambient BG */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div style={{ position:"absolute",inset:0,background:"radial-gradient(ellipse 70% 50% at 50% -10%,rgba(123,47,255,0.06) 0%,transparent 60%)" }} />
                <div style={{ position:"absolute",inset:0,backgroundImage:"linear-gradient(rgba(255,255,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.015) 1px,transparent 1px)",backgroundSize:"40px 40px" }} />
            </div>

            <PageTopbar
                title={
                    <div className="flex flex-col items-center">
                        <span className="tracking-[.22em] uppercase font-black" style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:"var(--font-lg)", color:"var(--text-primary)" }}>Tavern</span>
                        <span className="tracking-widest uppercase" style={{ fontSize:"var(--font-2xs)", color:"var(--text-muted)", fontFamily:"monospace" }}>My Myths · Inventory</span>
                    </div>
                }
            />

            {/* Main: 3 columns */}
            <div className="relative flex-1 flex overflow-hidden min-h-0">

                {/* ── LEFT: myth card grid / inventory ── */}
                <div className="flex flex-col overflow-hidden flex-shrink-0 min-h-0"
                    style={{ width: "clamp(160px,30%,260px)", borderRight: "1px solid rgba(255,255,255,.05)", overflowX: "hidden" }}>

                    {/* ── Left tabs: Myths / Inventory ── */}
                    <div className="flex flex-shrink-0 items-center" style={{ borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                        <button onClick={() => setLeftTab("myths")}
                            className="tvn-left-tab flex-1 py-2 font-mono uppercase tracking-widest transition-all"
                            style={{
                                fontSize: "var(--font-2xs)",
                                borderBottomWidth: 2, borderBottomStyle: "solid",
                                borderBottomColor: leftTab === "myths" ? "#a78bfa" : "transparent",
                                color: leftTab === "myths" ? "#a78bfa" : "rgba(255,255,255,.3)",
                                background: leftTab === "myths" ? "rgba(167,139,250,.06)" : "transparent",
                                cursor: "pointer", border: "none", outline: "none",
                            }}>
                            🐉 Myths
                        </button>
                        <button onClick={() => setShowInventory(true)}
                            className="tvn-left-tab flex-1 py-2 font-mono uppercase tracking-widest transition-all"
                            style={{
                                fontSize: "var(--font-2xs)",
                                borderBottomWidth: 2, borderBottomStyle: "solid",
                                borderBottomColor: "transparent",
                                color: "rgba(255,255,255,.3)",
                                background: "transparent",
                                cursor: "pointer", border: "none", outline: "none",
                            }}>
                            🎒 Inventory
                        </button>
                        {/* Botón expand — visible */}
                        {leftTab === "myths" && (
                            <button
                                onClick={() => setExpandedView(true)}
                                style={{
                                    padding: "4px 8px",
                                    background: "rgba(167,139,250,.12)",
                                    border: "1px solid rgba(167,139,250,.3)",
                                    borderRadius: 6,
                                    cursor: "pointer",
                                    color: "#a78bfa",
                                    fontFamily: "'Rajdhani', sans-serif",
                                    fontWeight: 700,
                                    fontSize: 9,
                                    letterSpacing: ".1em",
                                    textTransform: "uppercase",
                                    flexShrink: 0,
                                    marginRight: 6,
                                    whiteSpace: "nowrap",
                                    transition: "all 0.15s",
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = "rgba(167,139,250,.22)";
                                    e.currentTarget.style.borderColor = "rgba(167,139,250,.6)";
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = "rgba(167,139,250,.12)";
                                    e.currentTarget.style.borderColor = "rgba(167,139,250,.3)";
                                }}
                            >
                                ⛶ Expand
                            </button>
                        )}
                    </div>

                    {/* Grid myths — siempre visible */}
                    <>
                    {/* Affinity filter */}
                    <div className="flex gap-1.5 flex-wrap p-2 flex-shrink-0"
                        style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                        {AFFINITY_FILTERS.map(f => (
                            <button key={f} onClick={() => setAffFilter(f)}
                                className="tvn-filter-btn transition-all active:scale-95"
                                style={{
                                    padding: "2px 7px", borderRadius: 5, fontSize: "var(--font-xs)", fontFamily: "monospace", cursor: "pointer",
                                    background: affFilter === f ? "rgba(167,139,250,.18)" : "rgba(255,255,255,.03)",
                                    border: affFilter === f ? "1px solid rgba(167,139,250,.35)" : "1px solid rgba(255,255,255,.07)",
                                    color: affFilter === f ? "#a78bfa" : "rgba(255,255,255,.35)",
                                }}>
                                {f === "ALL" ? "All" : AFFINITY_ICON[f] ?? f}
                            </button>
                        ))}
                    </div>
                    {/* Sort selector — compacto, shared con expand */}
                    <div className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1.5"
                        style={{ borderBottom: "1px solid rgba(255,255,255,.05)", background: "rgba(0,0,0,0.15)" }}>
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,.25)", fontFamily: "monospace", letterSpacing: ".1em", flexShrink: 0 }}>SORT</span>
                        {([
                            { id: "level_rarity", label: "Lv+Rar" },
                            { id: "level",        label: "Level"  },
                            { id: "rarity",       label: "Rarity" },
                            { id: "power",        label: "PWR"    },
                            { id: "name",         label: "Name"   },
                        ] as const).map(opt => (
                            <button key={opt.id} onClick={() => setSortBy(opt.id)}
                                style={{
                                    padding: "1px 5px", borderRadius: 4,
                                    fontSize: 9, fontFamily: "monospace", cursor: "pointer",
                                    background: sortBy === opt.id ? "rgba(167,139,250,.2)" : "transparent",
                                    border: sortBy === opt.id ? "1px solid rgba(167,139,250,.4)" : "1px solid transparent",
                                    color: sortBy === opt.id ? "#a78bfa" : "rgba(255,255,255,.28)",
                                    whiteSpace: "nowrap",
                                    transition: "all 0.12s",
                                }}>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    {/* Scroll wrapper — flex-1 aquí, no en el grid */}
                    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none" }}>
                        {/* Grid */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4, padding: 8, alignContent: "start" }}>
                            {loading ? (
                                [...Array(6)].map((_,i) => (
                                    <div key={i} className="rounded-xl animate-pulse"
                                        style={{ aspectRatio: ".72", background: "rgba(255,255,255,.05)" }} />
                                ))
                            ) : filtered.map(m => (
                                <MythCard key={m.id} myth={m} selected={selected?.id === m.id}
                                    onClick={() => { setSelected(m); setTab("stats"); setSelectedForm(0); setDistortionFlash(false); }} />
                            ))}
                            {!loading && filtered.length === 0 && (
                                <div className="col-span-3 text-center pt-8 font-mono text-[10px]"
                                    style={{ color: "rgba(255,255,255,.25)" }}>No myths found</div>
                            )}
                        </div>
                    </div>
                    {/* Footer count */}
                    <div className="flex-shrink-0 px-3 py-2 font-mono text-[9px] text-center"
                        style={{ color: "rgba(255,255,255,.22)", borderTop: "1px solid rgba(255,255,255,.05)" }}>
                        {myths.length} myths · {myths.filter(m => m.inParty).length} in party 🟢
                    </div>
                    </>
                </div>

                {/* ── CENTER: selected myth art ── */}
                <div className="flex-1 flex flex-col relative overflow-hidden min-w-0">
                    {/* Ambient glow — rareza del form activo */}
                    {selected && (
                        <div className="absolute inset-0 pointer-events-none"
                            style={{
                                background: `radial-gradient(ellipse 70% 75% at 50% 55%, ${RARITY_GLOW[activeMyth?.rarity ?? selected.rarity] ?? RARITY_GLOW[selected.rarity]} 0%, transparent 70%)`,
                                transition: "background 0.4s",
                            }} />
                    )}
                    {/* Grid texture */}
                    <div className="absolute inset-0 pointer-events-none"
                        style={{ background: "repeating-linear-gradient(0deg,rgba(255,255,255,.01) 0px,transparent 1px,transparent 32px),repeating-linear-gradient(90deg,rgba(255,255,255,.01) 0px,transparent 1px,transparent 32px)" }} />

                    {selected ? (() => {
                        // Build form tabs from real distortion data
                        const FORM_COLORS = ["#e2e8f0", "#a78bfa", "#f472b6", "#fbbf24"];
                        const distForms = selected.distortion ?? [];
                        const allForms = [
                            {
                                label: "BASE",
                                sublabel: "Original",
                                color: rar?.color ?? "#e2e8f0",
                                artUrl: mythFrontUrl(selected.art),
                                displayName: selected.name ?? selected.speciesId,
                                affinities: selected.affinities ?? [],
                                rarity: selected.rarity,
                            },
                            ...distForms.map((d, i) => {
                                const dArt = d.art;
                                const dArtUrl = mythFrontUrl(dArt);
                                // La última distorsión tiene 2 afinidades y rareza distinta
                                const isLast = i === distForms.length - 1;
                                const formAffinities: string[] = isLast && d.affinities?.length
                                    ? d.affinities
                                    : d.affinities?.length
                                        ? d.affinities
                                        : selected.affinities ?? [];
                                const formRarity = d.rarity ?? selected.rarity;
                                const formColor = FORM_COLORS[i + 1] ?? "#a78bfa";
                                return {
                                    label: `FORM ${i + 2}`,
                                    sublabel: d.name,
                                    color: (RARITY_CONFIG[formRarity]?.color ?? formColor),
                                    artUrl: dArtUrl,
                                    displayName: d.name,
                                    affinities: formAffinities,
                                    rarity: formRarity,
                                };
                            }),
                        ];
                        const clampedForm = Math.min(selectedForm, allForms.length - 1);
                        const activeForm = allForms[clampedForm];
                        const activeGlow = RARITY_GLOW[activeMyth?.rarity ?? selected.rarity] ?? "rgba(226,232,240,.4)";

                        // Actualizar glow del centro dinámicamente
                        const glowEl = document.getElementById("tvn-center-glow");
                        if (glowEl) glowEl.style.background = `radial-gradient(ellipse 70% 75% at 50% 55%, ${activeGlow} 0%, transparent 70%)`;

                        return (
                            <div className="flex flex-col h-full">
                                {/* ── Distortion sub-tabs — only show if myth has distortions ── */}
                                {allForms.length > 1 && (
                                    <div className="flex gap-1.5 px-3 pt-2.5 pb-0 flex-shrink-0">
                                        {allForms.map((f, i) => (
                                            <button key={i} onClick={() => {
                                                    if (i === clampedForm) return;
                                                    // Capturar centro exacto del contenedor del art
                                                    if (artContainerRef.current) {
                                                        const rect = artContainerRef.current.getBoundingClientRect();
                                                        setFlashPos({
                                                            x: rect.left + rect.width / 2,
                                                            y: rect.top + rect.height / 2,
                                                        });
                                                    }
                                                    setDistortionFlash(true);
                                                    setTimeout(() => {
                                                        setSelectedForm(i);
                                                        setFormKey(k => k + 1);
                                                        setDistortionFlash(false);
                                                        setFlashPos(null);
                                                    }, 700);
                                                }}
                                                className="flex-1 rounded-lg transition-all active:scale-95"
                                                style={{
                                                    padding: "4px 2px",
                                                    background: clampedForm === i ? `${f.color}20` : "rgba(255,255,255,.03)",
                                                    border: clampedForm === i ? `1px solid ${f.color}55` : "1px solid rgba(255,255,255,.07)",
                                                    boxShadow: clampedForm === i ? `0 0 10px ${f.color}22` : "none",
                                                    cursor: "pointer", outline: "none",
                                                }}>
                                                <div className="font-black" style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "var(--font-xs)",
                                                    letterSpacing: ".08em", textTransform: "uppercase",
                                                    color: clampedForm === i ? f.color : "rgba(255,255,255,.28)" }}>
                                                    {f.label}
                                                </div>
                                                <div className="font-mono" style={{ fontSize: 6,
                                                    color: clampedForm === i ? `${f.color}88` : "rgba(255,255,255,.18)", marginTop: 1 }}>
                                                    {f.sublabel}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Glow rings — color cambia con la forma activa */}
                                <div className="absolute pointer-events-none"
                                    style={{ width: 180, height: 180, borderRadius: "50%",
                                        border: `1px solid ${activeForm.color}22`,
                                        top: "48%", left: "50%", transform: "translate(-50%,-55%)",
                                        transition: "border-color .4s" }} />
                                <div className="absolute pointer-events-none"
                                    style={{ width: 120, height: 120, borderRadius: "50%",
                                        border: `1px solid ${activeForm.color}35`,
                                        top: "48%", left: "50%", transform: "translate(-50%,-55%)",
                                        transition: "border-color .4s" }} />

                                {/* Art — cambia según la forma */}
                                <div ref={artContainerRef} className="flex-1 flex items-center justify-center relative min-h-0">
                                    {activeForm.artUrl ? (
                                        <img
                                            key={activeForm.artUrl}
                                            src={activeForm.artUrl}
                                            alt={activeForm.displayName}
                                            className="object-contain object-center select-none"
                                            style={{
                                                maxHeight: "55%", maxWidth: "65%",
                                                filter: `drop-shadow(0 0 30px ${activeGlow}) drop-shadow(0 0 60px ${activeGlow})`,
                                                animation: "nurseryFloat 4s ease-in-out infinite",
                                                opacity: distortionFlash ? 0 : 1,
                                                transition: "opacity 0.2s ease",
                                            }}
                                            draggable={false} />
                                    ) : (
                                        <div className="select-none" style={{ fontSize: 72,
                                            filter: `drop-shadow(0 0 30px ${activeGlow})`,
                                            animation: "nurseryFloat 4s ease-in-out infinite",
                                            opacity: distortionFlash ? 0 : 1,
                                            transition: "opacity 0.2s ease" }}>
                                            {AFFINITY_ICON[selected.affinities?.[0]] ?? "❓"}
                                        </div>
                                    )}
                                    {/* ── DISTORTION FLASH — onda de choque, posicionada exactamente en el art ── */}
                                    {distortionFlash && flashPos && (
                                        <div className="fixed pointer-events-none" style={{
                                            zIndex: 40,
                                            top: 0, left: 0, width: "100vw", height: "100vh",
                                        }}>
                                            {/* Punto de origen exacto: centro del contenedor del art */}
                                            <div style={{
                                                position: "absolute",
                                                top: flashPos.y,
                                                left: flashPos.x,
                                                width: 0,
                                                height: 0,
                                            }}>
                                                {/* Flash central — destello blanco instantáneo */}
                                                <div style={{
                                                    position: "absolute",
                                                    width: 120, height: 120,
                                                    borderRadius: "50%",
                                                    transform: "translate(-50%, -50%)",
                                                    background: "radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(200,150,255,0.7) 35%, transparent 70%)",
                                                    animation: "dFlash 0.25s ease-out forwards",
                                                    filter: "blur(2px)",
                                                }} />

                                                {/* Onda 1 — grande, lila */}
                                                <div style={{
                                                    position: "absolute",
                                                    width: 20, height: 20,
                                                    borderRadius: "50%",
                                                    transform: "translate(-50%, -50%)",
                                                    border: "3px solid rgba(167,139,250,0.9)",
                                                    boxShadow: "0 0 20px rgba(167,139,250,0.6), inset 0 0 10px rgba(123,47,255,0.3)",
                                                    animation: "dWave 0.65s cubic-bezier(0.1,0.8,0.3,1) forwards",
                                                }} />

                                                {/* Onda 2 — mediana, rosa, delay */}
                                                <div style={{
                                                    position: "absolute",
                                                    width: 20, height: 20,
                                                    borderRadius: "50%",
                                                    transform: "translate(-50%, -50%)",
                                                    border: "2px solid rgba(232,121,249,0.8)",
                                                    boxShadow: "0 0 14px rgba(232,121,249,0.5)",
                                                    animation: "dWave 0.6s cubic-bezier(0.1,0.8,0.3,1) 0.08s forwards",
                                                }} />

                                                {/* Onda 3 — pequeña, blanca, más delay */}
                                                <div style={{
                                                    position: "absolute",
                                                    width: 20, height: 20,
                                                    borderRadius: "50%",
                                                    transform: "translate(-50%, -50%)",
                                                    border: "1.5px solid rgba(255,255,255,0.6)",
                                                    animation: "dWave 0.55s cubic-bezier(0.1,0.8,0.3,1) 0.15s forwards",
                                                }} />

                                                {/* Glow radial que se expande y desvanece */}
                                                <div style={{
                                                    position: "absolute",
                                                    width: 60, height: 60,
                                                    borderRadius: "50%",
                                                    transform: "translate(-50%, -50%)",
                                                    background: "radial-gradient(circle, rgba(167,139,250,0.5) 0%, rgba(123,47,255,0.2) 50%, transparent 75%)",
                                                    animation: "dGlow 0.65s ease-out forwards",
                                                }} />

                                                {/* 6 partículas que salen disparadas */}
                                                {[...Array(6)].map((_, i) => {
                                                    const angle = (i / 6) * 360;
                                                    const rad = angle * Math.PI / 180;
                                                    const dist = 70 + (i % 2) * 30;
                                                    return (
                                                        <div key={i} style={{
                                                            position: "absolute",
                                                            width: i % 2 === 0 ? 5 : 3,
                                                            height: i % 2 === 0 ? 5 : 3,
                                                            borderRadius: "50%",
                                                            transform: "translate(-50%, -50%)",
                                                            background: i % 3 === 0
                                                                ? "rgba(255,255,255,0.95)"
                                                                : i % 3 === 1
                                                                    ? "rgba(167,139,250,0.9)"
                                                                    : "rgba(232,121,249,0.9)",
                                                            boxShadow: `0 0 8px rgba(167,139,250,0.8)`,
                                                            animation: "dParticle 0.6s cubic-bezier(0.2,0.8,0.4,1) forwards",
                                                            animationDelay: `${i * 0.02}s`,
                                                            "--px": `${Math.cos(rad) * dist}px`,
                                                            "--py": `${Math.sin(rad) * dist}px`,
                                                        } as React.CSSProperties} />
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Info bottom */}
                                <div className="flex-shrink-0 text-center px-3 pb-3">
                                    {/* Nombre + tipo + rareza — animated con formKey */}
                                    <div key={formKey} style={{
                                        animation: "tvnFadeSlideUp 0.4s cubic-bezier(0.16,1,0.3,1) both",
                                    }}>
                                        <h2 className="font-black leading-none mb-2"
                                            style={{ fontFamily: "'Rajdhani',sans-serif", fontSize: "clamp(20px,3.5vw,32px)",
                                                color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: ".06em",
                                                textShadow: `0 0 30px ${activeForm.color}55`,
                                                transition: "text-shadow .4s" }}>
                                            {activeForm.displayName}
                                        </h2>
                                        {/* Nivel · Afinidades · Rareza */}
                                        <div className="flex items-center justify-center gap-3 flex-wrap">
                                            <span style={{
                                                fontFamily: "'Rajdhani',sans-serif", fontWeight: 800,
                                                fontSize: "clamp(14px,2vw,20px)", color: "#a78bfa", letterSpacing: ".08em",
                                            }}>
                                                Lv. {selected.level}
                                            </span>
                                            <span style={{ color: "rgba(255,255,255,.2)", fontSize: 16 }}>·</span>
                                            {/* Afinidades */}
                                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                {(activeForm.affinities ?? []).map((aff: string) => (
                                                    <span key={aff} style={{
                                                        display: "inline-flex", alignItems: "center", gap: 5,
                                                        fontFamily: "'Rajdhani',sans-serif", fontWeight: 800,
                                                        fontSize: "clamp(14px,2vw,20px)",
                                                        color: "rgba(255,255,255,.75)", letterSpacing: ".08em",
                                                    }}>
                                                        <img
                                                            src={`${AFFINITY_CDN}/${aff.toLowerCase()}_affinity_icon.webp`}
                                                            alt={aff}
                                                            style={{ width: "clamp(16px,2vw,22px)", height: "clamp(16px,2vw,22px)", objectFit: "contain" }}
                                                            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                                                        />
                                                        {aff}
                                                    </span>
                                                ))}
                                            </div>
                                            <span style={{ color: "rgba(255,255,255,.2)", fontSize: 16 }}>·</span>
                                            <span style={{
                                                fontFamily: "'Rajdhani',sans-serif", fontWeight: 800,
                                                fontSize: "clamp(14px,2vw,20px)",
                                                color: RARITY_CONFIG[activeForm.rarity]?.color ?? activeForm.color,
                                                letterSpacing: ".08em",
                                                transition: "color .4s",
                                            }}>
                                                {activeForm.rarity}
                                            </span>
                                        </div>
                                    </div>
                                    {/* PWR + Party badge */}
                                    <div className="flex items-center justify-center gap-2 mt-2">
                                        <div className="tvn-power font-black"
                                            style={{ color: "var(--accent-gold)", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, fontSize: "var(--font-md)" }}>
                                            ⚡ {power.toLocaleString()} PWR
                                        </div>
                                        {selected.inParty && (
                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono"
                                                style={{ fontSize: "var(--font-2xs)", background: "rgba(6,214,160,.1)", border: "1px solid rgba(6,214,160,.25)", color: "var(--accent-green)" }}>
                                                ✓ Party
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })() : (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="font-mono text-sm" style={{ color: "rgba(255,255,255,.2)" }}>Select a myth</p>
                        </div>
                    )}
                </div>

                {/* ── RIGHT: vtabs + panel ── */}
                <div className="tvn-right flex overflow-hidden flex-shrink-0"
                    style={{ width: "clamp(200px,32%,320px)", borderLeft: "1px solid rgba(255,255,255,.05)" }}>
                    {/* Vertical tabs */}
                    <div className="tvn-vtabs-col flex flex-col flex-shrink-0 pt-2 gap-1"
                        style={{ width: 44, borderRight: "1px solid rgba(255,255,255,.05)" }}>
                        {VTABS.map(t => {
                            const TAB_COLORS: Record<string, string> = {
                                stats:  "#67e8f9",
                                skills: "#f87171",
                                gear:   "#fbbf24",
                            };
                            const tc = TAB_COLORS[t.id] ?? "#e2e8f0";
                            return (
                                <button key={t.id} onClick={() => setTab(t.id)}
                                    className="tvn-vtab-btn flex flex-col items-center gap-1 py-3 transition-all"
                                    style={{
                                        borderTop: "none", borderBottom: "none", borderLeft: "none",
                                        borderRightWidth: 2, borderRightStyle: "solid",
                                        borderRightColor: tab === t.id ? tc : "transparent",
                                        background: tab === t.id ? `${tc}12` : "transparent",
                                        cursor: "pointer", outline: "none",
                                    }}>
                                    <span className="tvn-vtab-icon" style={{ fontSize: "var(--font-md)" }}>{t.icon}</span>
                                    <span className="tvn-vtab-label font-mono uppercase tracking-wide text-center leading-tight"
                                        style={{ fontSize: 6, color: tab === t.id ? tc : "rgba(255,255,255,.25)", fontWeight: tab === t.id ? 700 : 400 }}>
                                        {t.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    {/* Panel content — usa activeMyth para que cambie con la distorsión */}
                    <div className="flex-1 overflow-hidden">
                        {selected && activeMyth ? (
                            tab === "stats"  ? <StatsPanel myth={activeMyth} /> :
                            tab === "skills" ? <SkillsPanel myth={activeMyth} /> :
                                              <GearPanel myth={selected} />
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="font-mono text-[10px]" style={{ color: "rgba(255,255,255,.2)" }}>Select a myth</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── OVERLAY: Vista expandida de todos los myths ── */}
            {expandedView && (() => {
                const RARITIES = ["ALL", "COMMON", "RARE", "EPIC", "ELITE", "LEGENDARY", "MYTHIC"];
                const expandFiltered = applySort(myths.filter(m => {
                    const affOk = expandAffFilter === "ALL" || (m.affinities ?? []).includes(expandAffFilter);
                    const rarOk = expandRarFilter === "ALL" || m.rarity === expandRarFilter;
                    return affOk && rarOk;
                }));
                return (
                    <div
                        className="fixed inset-0 z-50 flex flex-col"
                        style={{ background: "#070b14", fontFamily: "'Exo 2', sans-serif" }}
                    >
                        {/* Header del overlay */}
                        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3"
                            style={{ borderBottom: "1px solid rgba(255,255,255,.07)", background: "rgba(4,8,15,0.8)" }}>
                            <div>
                                <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 18, color: "#e2e8f0", letterSpacing: ".1em", textTransform: "uppercase" }}>
                                    All Myths
                                </span>
                                <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)", fontFamily: "monospace", marginLeft: 10 }}>
                                    {expandFiltered.length} / {myths.length}
                                </span>
                            </div>
                            <button
                                onClick={() => setExpandedView(false)}
                                style={{
                                    padding: "6px 16px",
                                    borderRadius: 8,
                                    background: "rgba(255,255,255,.06)",
                                    border: "1px solid rgba(255,255,255,.12)",
                                    color: "#e2e8f0",
                                    fontFamily: "'Rajdhani',sans-serif",
                                    fontWeight: 700,
                                    fontSize: 13,
                                    letterSpacing: ".1em",
                                    textTransform: "uppercase",
                                    cursor: "pointer",
                                }}
                            >
                                ✕ Close
                            </button>
                        </div>

                        {/* Filtros */}
                        <div className="flex-shrink-0 flex flex-wrap gap-3 px-4 py-2"
                            style={{ borderBottom: "1px solid rgba(255,255,255,.05)", background: "rgba(4,8,15,0.5)" }}>
                            {/* Afinidad */}
                            <div className="flex gap-1.5 flex-wrap items-center">
                                <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)", fontFamily: "monospace", marginRight: 2 }}>TYPE</span>
                                {AFFINITY_FILTERS.map(f => (
                                    <button key={f} onClick={() => setExpandAffFilter(f)}
                                        style={{
                                            padding: "2px 8px", borderRadius: 5, fontSize: 11, fontFamily: "monospace", cursor: "pointer",
                                            background: expandAffFilter === f ? "rgba(167,139,250,.18)" : "rgba(255,255,255,.03)",
                                            border: expandAffFilter === f ? "1px solid rgba(167,139,250,.35)" : "1px solid rgba(255,255,255,.07)",
                                            color: expandAffFilter === f ? "#a78bfa" : "rgba(255,255,255,.35)",
                                        }}>
                                        {f === "ALL" ? "All" : `${AFFINITY_ICON[f] ?? ""} ${f}`}
                                    </button>
                                ))}
                            </div>
                            {/* Rareza */}
                            <div className="flex gap-1.5 flex-wrap items-center">
                                <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)", fontFamily: "monospace", marginRight: 2 }}>RARITY</span>
                                {RARITIES.map(r => {
                                    const rc = r !== "ALL" ? RARITY_CONFIG[r] : null;
                                    return (
                                        <button key={r} onClick={() => setExpandRarFilter(r)}
                                            style={{
                                                padding: "2px 8px", borderRadius: 5, fontSize: 11, fontFamily: "monospace", cursor: "pointer",
                                                background: expandRarFilter === r ? (rc?.bg ?? "rgba(167,139,250,.18)") : "rgba(255,255,255,.03)",
                                                border: expandRarFilter === r ? `1px solid ${rc?.border ?? "rgba(167,139,250,.35)"}` : "1px solid rgba(255,255,255,.07)",
                                                color: expandRarFilter === r ? (rc?.color ?? "#a78bfa") : "rgba(255,255,255,.35)",
                                            }}>
                                            {r === "ALL" ? "All" : rc?.label ?? r}
                                        </button>
                                    );
                                })}
                            </div>
                            {/* Sort — mismo estado que el panel izquierdo */}
                            <div className="flex gap-1.5 flex-wrap items-center">
                                <span style={{ fontSize: 10, color: "rgba(255,255,255,.3)", fontFamily: "monospace", marginRight: 2 }}>SORT</span>
                                {([
                                    { id: "level_rarity", label: "Lv + Rarity" },
                                    { id: "level",        label: "Level"       },
                                    { id: "rarity",       label: "Rarity"      },
                                    { id: "power",        label: "Power"       },
                                    { id: "name",         label: "Name"        },
                                ] as const).map(opt => (
                                    <button key={opt.id} onClick={() => setSortBy(opt.id)}
                                        style={{
                                            padding: "2px 8px", borderRadius: 5, fontSize: 11, fontFamily: "monospace", cursor: "pointer",
                                            background: sortBy === opt.id ? "rgba(167,139,250,.18)" : "rgba(255,255,255,.03)",
                                            border: sortBy === opt.id ? "1px solid rgba(167,139,250,.35)" : "1px solid rgba(255,255,255,.07)",
                                            color: sortBy === opt.id ? "#a78bfa" : "rgba(255,255,255,.35)",
                                            transition: "all 0.12s",
                                        }}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Grid de myths */}
                        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", scrollbarWidth: "none" }}>
                            <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))",
                                gap: 8,
                                padding: 16,
                                alignContent: "start",
                            }}>
                                {expandFiltered.map(m => (
                                    <MythCard key={m.id} myth={m} selected={selected?.id === m.id}
                                        onClick={() => {
                                            setSelected(m);
                                            setTab("stats");
                                            setSelectedForm(0);
                                            setDistortionFlash(false);
                                            setExpandedView(false);
                                        }} />
                                ))}
                                {expandFiltered.length === 0 && (
                                    <div style={{ gridColumn: "1/-1", textAlign: "center", paddingTop: 48, color: "rgba(255,255,255,.2)", fontFamily: "monospace", fontSize: 12 }}>
                                        No myths match the current filters
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* ── MODAL: Inventario ── */}
            {showInventory && (
                <div className="fixed inset-0 z-50 flex flex-col"
                    style={{ background: "rgba(7,11,20,0.97)", fontFamily: "'Exo 2', sans-serif" }}
                    onClick={() => { setShowInventory(false); setSelItem(null); }}>
                    {/* Header */}
                    <div className="flex-shrink-0 flex items-center justify-between px-5 py-3"
                        style={{ borderBottom: "1px solid rgba(255,255,255,.07)", background: "rgba(4,8,15,0.9)" }}
                        onClick={e => e.stopPropagation()}>
                        <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 18, color: "#e2e8f0", letterSpacing: ".12em", textTransform: "uppercase" }}>
                            🎒 Inventory
                        </span>
                        <button onClick={() => { setShowInventory(false); setSelItem(null); }}
                            style={{
                                padding: "6px 16px", borderRadius: 8,
                                background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)",
                                color: "#e2e8f0", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
                                fontSize: 13, letterSpacing: ".1em", textTransform: "uppercase", cursor: "pointer",
                            }}>
                            ✕ Close
                        </button>
                    </div>

                    {/* Content — lista items + detalle */}
                    <div className="flex-1 flex overflow-hidden min-h-0" onClick={e => e.stopPropagation()}>
                        {/* Lista de items */}
                        <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: "none" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
                                {INV_ITEMS.map(item => (
                                    <button key={item.id}
                                        onClick={() => setSelItem(selItem?.id === item.id ? null : item)}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 14,
                                            padding: "12px 16px", borderRadius: 14, textAlign: "left",
                                            background: selItem?.id === item.id ? `${item.color}10` : "rgba(255,255,255,.025)",
                                            border: selItem?.id === item.id ? `1px solid ${item.color}55` : "1px solid rgba(255,255,255,.07)",
                                            cursor: "pointer", transition: "all 0.15s",
                                            boxShadow: selItem?.id === item.id ? `0 0 20px ${item.color}20` : "none",
                                        }}>
                                        {/* Icono */}
                                        <div style={{
                                            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            fontSize: 26, background: `${item.color}14`,
                                            border: `1px solid ${item.color}30`,
                                            filter: `drop-shadow(0 0 8px ${item.color}55)`,
                                        }}>
                                            {item.icon}
                                        </div>
                                        {/* Info principal */}
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                                <span style={{
                                                    fontFamily: "'Rajdhani',sans-serif", fontWeight: 800,
                                                    fontSize: 15, color: "#e2e8f0",
                                                    textTransform: "uppercase", letterSpacing: ".06em",
                                                }}>
                                                    {item.name}
                                                </span>
                                                <span style={{
                                                    fontFamily: "monospace", fontSize: 9,
                                                    color: `${item.color}cc`, letterSpacing: ".1em",
                                                    textTransform: "uppercase",
                                                }}>
                                                    {item.rarity}
                                                </span>
                                            </div>
                                            {/* Descripción */}
                                            <p style={{ fontSize: 12, color: "rgba(255,255,255,.45)", fontFamily: "monospace", lineHeight: 1.45 }}>
                                                {item.desc}
                                            </p>
                                            {/* Dónde conseguir */}
                                            <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                                                <span style={{ fontSize: 9, color: "rgba(255,255,255,.25)", fontFamily: "monospace", letterSpacing: ".1em", textTransform: "uppercase" }}>
                                                    DROP
                                                </span>
                                                <span style={{ fontSize: 11, color: item.color, fontFamily: "monospace" }}>
                                                    {item.source}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Cantidad placeholder */}
                                        <div style={{
                                            flexShrink: 0, width: 36, height: 36, borderRadius: 8,
                                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                            background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)",
                                        }}>
                                            <span style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: 16, color: "#e2e8f0" }}>0</span>
                                            <span style={{ fontSize: 7, color: "rgba(255,255,255,.3)", fontFamily: "monospace" }}>QTY</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
