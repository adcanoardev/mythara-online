import { useState, useCallback, useEffect, useRef, createContext, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import { useTrainer } from "../context/TrainerContext";

// Avatars — mirrors server/src/data/avatars.ts
const AVATARS = [
    { id: "male_1",   gender: "male",   emoji: "🧢", name: "Kael"  },
    { id: "male_2",   gender: "male",   emoji: "🎩", name: "Ryn"   },
    { id: "male_3",   gender: "male",   emoji: "⛑️", name: "Zeph"  },
    { id: "male_4",   gender: "male",   emoji: "🕶️", name: "Voss"  },
    { id: "female_1", gender: "female", emoji: "🌸", name: "Lyra"  },
    { id: "female_2", gender: "female", emoji: "👒", name: "Mira"  },
    { id: "female_3", gender: "female", emoji: "🎀", name: "Sable" },
    { id: "female_4", gender: "female", emoji: "🌙", name: "Nyx"   },
];

// ─────────────────────────────────────────
// NAV
// ─────────────────────────────────────────

const NAV = [
    { icon: "👤", label: "Profile",      path: "/profile" },
    { icon: "🐉", label: "Tavern",       path: "/tavern" },
    { icon: "🗡️", label: "Ruins",        path: "/ruins" },
    { icon: "⚔️", label: "Arena",        path: "/arena" },
    { icon: "🏡", label: "Outpost",      path: "/inn" },
    { icon: "🛒", label: "Market",       path: "/market" },
    { icon: "🏰", label: "Guild",        path: "/guild" },
    { icon: "📖", label: "Arcanum",      path: "/arcanum" },
    { icon: "🏛️", label: "Sanctuaries",  path: "/sanctuaries" },
    { icon: "🏆", label: "Ranking",      path: "/ranking" },
    { icon: "⚡",  label: "Ascend",       path: "/ascend" },
    { icon: "⚙️", label: "Settings",     path: "/settings" },
];

// ─────────────────────────────────────────
// Toast
// ─────────────────────────────────────────

export type ToastType = "success" | "error" | "info" | "warning";
interface Toast { id: number; message: string; type: ToastType; }
interface ToastContextValue { toast: (message: string, type?: ToastType) => void; }
const ToastContext = createContext<ToastContextValue>({ toast: () => {} });
export function useToast() { return useContext(ToastContext); }

const TOAST_COLORS: Record<ToastType, string> = {
    success: "border-emerald-500/60 bg-emerald-500/10 text-emerald-300",
    error:   "border-red-500/60    bg-red-500/10    text-red-300",
    info:    "border-blue-500/60   bg-blue-500/10   text-blue-300",
    warning: "border-yellow-500/60 bg-yellow-500/10 text-yellow-300",
};
const TOAST_ICONS: Record<ToastType, string> = { success:"✅", error:"❌", info:"ℹ️", warning:"⚠️" };
let _toastCounter = 0;

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map((t) => (
                <div key={t.id} className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg shadow-black/40
                    font-mono text-xs max-w-xs pointer-events-auto animate-toast-in ${TOAST_COLORS[t.type]}`}>
                    <span className="flex-shrink-0 text-sm">{TOAST_ICONS[t.type]}</span>
                    <p className="leading-relaxed flex-1">{t.message}</p>
                    <button onClick={() => onRemove(t.id)} className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity ml-1 text-xs">✕</button>
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────
// Affinity data (exportada para BattlePage)
// ─────────────────────────────────────────

type Affinity = "EMBER"|"TIDE"|"GROVE"|"VOLT"|"STONE"|"FROST"|"VENOM"|"ASTRAL"|"IRON"|"SHADE";
export const AFFINITIES: Affinity[] = ["EMBER","TIDE","GROVE","VOLT","STONE","FROST","VENOM","ASTRAL","IRON","SHADE"];
export const AFFINITY_EMOJI: Record<Affinity,string> = {
    EMBER:"🔥",TIDE:"🌊",GROVE:"🌿",VOLT:"⚡",STONE:"🪨",FROST:"❄️",VENOM:"🧪",ASTRAL:"✨",IRON:"⚙️",SHADE:"🌑",
};
export const AFFINITY_LABEL: Record<Affinity,string> = {
    EMBER:"Ember",TIDE:"Tide",GROVE:"Grove",VOLT:"Volt",STONE:"Stone",
    FROST:"Frost",VENOM:"Venom",ASTRAL:"Astral",IRON:"Iron",SHADE:"Shade",
};
const AFFINITY_CHART: Record<Affinity, Partial<Record<Affinity,number>>> = {
    EMBER:  {GROVE:2,FROST:2,TIDE:0.5,STONE:0.5,EMBER:0.5},
    TIDE:   {EMBER:2,STONE:2,VOLT:0.5,GROVE:0.5,TIDE:0.5},
    GROVE:  {TIDE:2,STONE:2,EMBER:0.5,VENOM:0.5,GROVE:0.5},
    VOLT:   {TIDE:2,IRON:2,GROVE:0.5,STONE:0.5,VOLT:0.5},
    STONE:  {EMBER:2,VOLT:2,GROVE:0.5,TIDE:0.5,STONE:0.5},
    FROST:  {GROVE:2,ASTRAL:2,EMBER:0.5,IRON:0.5,FROST:0.5},
    VENOM:  {GROVE:2,ASTRAL:2,STONE:0.5,IRON:0.5,VENOM:0.5},
    ASTRAL: {SHADE:2,VENOM:0.5,ASTRAL:0.5},
    IRON:   {FROST:2,STONE:2,EMBER:0.5,IRON:0.5},
    SHADE:  {ASTRAL:2,VENOM:2,SHADE:0.5},
};
export function getCell(atk: Affinity, def: Affinity): number {
    return AFFINITY_CHART[atk]?.[def] ?? 1;
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function formatGold(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 10_000)    return (n / 1_000).toFixed(0) + "K";
    return n.toLocaleString("en-US");
}

function formatTime(ms: number): string {
    if (ms <= 0) return "ready";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
}

export function avatarUrl(avatarId: string): string {
    return `https://cdn.jsdelivr.net/gh/adcanoardev/mythara-assets@main/avatars/${avatarId}.png`;
}

// ─────────────────────────────────────────
// Avatar frames (CSS)
// ─────────────────────────────────────────

export interface AvatarFrame {
    key: string;
    label: string;
    unlockHint: string;
    style: React.CSSProperties;
}

export const AVATAR_FRAMES: AvatarFrame[] = [
    {
        key: "none",
        label: "No frame",
        unlockHint: "Default",
        style: { border: "2px solid rgba(255,255,255,0.12)" },
    },
    {
        key: "silver",
        label: "Silver Frame",
        unlockHint: "Default",
        style: { border: "2px solid #94a3b8", boxShadow: "0 0 8px #94a3b844" },
    },
    {
        key: "gold",
        label: "Gold Frame",
        unlockHint: "PVP Rank: Gold",
        style: { border: "2px solid #fbbf24", boxShadow: "0 0 14px #fbbf2466, inset 0 0 8px #fbbf2420" },
    },
    {
        key: "mythic",
        label: "Mythic Frame",
        unlockHint: "PVP Rank: Mythic",
        style: { border: "2px solid #f87171", boxShadow: "0 0 18px #f8717155, 0 0 36px #b91c1c33" },
    },
    {
        key: "arcane",
        label: "Arcane Frame",
        unlockHint: "Shop — 500 💎",
        style: {
            border: "2px solid transparent",
            backgroundImage: "linear-gradient(#070b14,#070b14), linear-gradient(135deg,#7b2fff,#4cc9f0,#7b2fff)",
            backgroundOrigin: "border-box",
            backgroundClip: "padding-box, border-box",
            boxShadow: "0 0 20px #7b2fff55",
        },
    },
    {
        key: "ember",
        label: "Ember Frame",
        unlockHint: "Shop — 200,000 🪙",
        style: { border: "2px solid #f97316", boxShadow: "0 0 14px #f9731655, 0 0 28px #ea580c33" },
    },
    {
        key: "tide",
        label: "Tide Frame",
        unlockHint: "Shop — 200,000 🪙",
        style: { border: "2px solid #38bdf8", boxShadow: "0 0 14px #38bdf855" },
    },
    {
        key: "legendary",
        label: "Legendary Frame",
        unlockHint: "Shop — 1,000 💎",
        style: {
            border: "2px solid #fbbf24",
            boxShadow: "0 0 20px #fbbf24aa, 0 0 40px #b4530966",
            animation: "legendaryPulse 2s ease-in-out infinite",
        },
    },
];

// ─────────────────────────────────────────
// StatChip
// ─────────────────────────────────────────

function StatChip({
    icon, value, max, label, reloadAt, color = "text-slate-300",
}: {
    icon: string; value: number | string; max?: number;
    label?: string; reloadAt?: Date | null; color?: string;
}) {
    const [show, setShow]     = useState(false);
    const [timeLeft, setTimeLeft] = useState("");
    const timerRef            = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!show || !reloadAt) return;
        const tick = () => setTimeLeft(formatTime(reloadAt.getTime() - Date.now()));
        tick();
        timerRef.current = setInterval(tick, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [show, reloadAt]);

    const isReloading = reloadAt != null && max != null && typeof value === "number" && value < max;

    return (
        <div className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.07] cursor-default select-none"
            onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
            {max !== undefined && typeof value === "number" ? (
                <span className={`font-display text-xs font-bold tracking-wider ${color}`}>
                    {value}<span className="text-white/25">/{max}</span>
                </span>
            ) : (
                <span className={`font-display text-xs font-bold tracking-wider ${color}`}>{value}</span>
            )}
            <span className="text-sm leading-none">{icon}</span>
            {show && (label || isReloading || max !== undefined) && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-[100] pointer-events-none
                    bg-[#0d1220] border border-white/10 rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-[#0d1220] border-l border-t border-white/10"/>
                    {label && <p className="text-xs text-white/50 mb-0.5">{label}</p>}
                    {isReloading && reloadAt
                        ? <p className="text-xs text-yellow-400 font-mono">⏱ Next token in {timeLeft}</p>
                        : max !== undefined && <p className="text-xs text-emerald-400">✓ Tokens full</p>
                    }
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────
// Modal cambio de avatar + marco
// ─────────────────────────────────────────

function AvatarModal({
    currentAvatar, currentFrame, gender, unlockedFrames, onClose, onSave,
}: {
    currentAvatar: string; currentFrame: string; gender: string;
    unlockedFrames: string[];
    onClose: () => void; onSave: (avatarId: string, frameKey: string) => void;
}) {
    const [selAvatar, setSelAvatar] = useState(currentAvatar);
    const [selFrame,  setSelFrame]  = useState(currentFrame);
    const [tab, setTab]             = useState<"avatar"|"frame">("avatar");

    const available = AVATARS.filter(a => !gender || a.gender === gender);
    const previewFrame = AVATAR_FRAMES.find(f => f.key === selFrame) ?? AVATAR_FRAMES[0];

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#0d1220] border border-white/10 rounded-2xl w-[480px] max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/[0.08]">
                    <h2 className="font-display font-bold text-sm tracking-widest uppercase text-white/80">Customize profile</h2>
                    <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none">✕</button>
                </div>

                {/* Preview */}
                <div className="flex-shrink-0 flex flex-col items-center gap-2 py-5 border-b border-white/[0.08]">
                    <div className="w-20 h-20 rounded-full overflow-hidden" style={previewFrame.style}>
                        <img src={avatarUrl(selAvatar)} alt="preview"
                            className="w-full h-full object-cover"
                            onError={e => { (e.target as HTMLImageElement).style.display="none"; }}/>
                    </div>
                    <p className="text-xs text-white/30 font-display tracking-wider">
                        {AVATARS.find(a => a.id === selAvatar)?.name ?? selAvatar} · {previewFrame.label}
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex-shrink-0 flex border-b border-white/[0.08]">
                    {(["avatar","frame"] as const).map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`flex-1 py-2.5 text-xs font-display tracking-widest uppercase transition-all
                                ${tab===t ? "text-white border-b-2 border-indigo-400" : "text-white/30 hover:text-white/60"}`}>
                            {t==="avatar" ? "🧑 Avatar" : "🖼️ Frame"}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {tab === "avatar" && (
                        <div className="grid grid-cols-4 gap-2">
                            {available.map(av => {
                                const sel = selAvatar === av.id;
                                return (
                                    <div key={av.id} onClick={() => setSelAvatar(av.id)}
                                        className={`cursor-pointer rounded-xl p-3 border text-center transition-all flex flex-col items-center gap-1.5
                                            ${sel ? "border-indigo-400 bg-indigo-400/10" : "border-white/[0.08] hover:border-white/20 bg-white/[0.02]"}`}
                                        style={sel ? {boxShadow:"0 0 14px rgba(99,102,241,0.3)"} : {}}>
                                        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
                                            <img src={avatarUrl(av.id)} alt={av.name} className="w-full h-full object-cover"
                                                onError={e => {
                                                    const el = e.target as HTMLImageElement;
                                                    el.style.display="none";
                                                    el.parentElement!.innerHTML=`<div class="w-full h-full flex items-center justify-center text-lg bg-gradient-to-br from-purple-900 to-indigo-900">${av.emoji}</div>`;
                                                }}/>
                                        </div>
                                        <span className="font-display text-[10px] tracking-wider text-white/60">{av.name}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {tab === "frame" && (
                        <div className="grid grid-cols-2 gap-2">
                            {AVATAR_FRAMES.map(fr => {
                                const sel = selFrame === fr.key;
                                const isUnlocked = unlockedFrames.includes(fr.key);
                                return (
                                    <div key={fr.key}
                                        onClick={() => isUnlocked && setSelFrame(fr.key)}
                                        className={`rounded-xl p-3 border flex items-center gap-3 transition-all relative
                                            ${isUnlocked
                                                ? sel
                                                    ? "cursor-pointer border-indigo-400 bg-indigo-400/10"
                                                    : "cursor-pointer border-white/[0.08] hover:border-white/20 bg-white/[0.02]"
                                                : "cursor-not-allowed border-white/[0.04] bg-white/[0.01] opacity-50"
                                            }`}
                                        style={sel && isUnlocked ? {boxShadow:"0 0 14px rgba(99,102,241,0.3)"} : {}}>
                                        <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden relative" style={isUnlocked ? fr.style : {border:"2px solid rgba(255,255,255,0.06)"}}>
                                            <img src={avatarUrl(selAvatar)} alt="" className="w-full h-full object-cover"
                                                onError={e => { (e.target as HTMLImageElement).style.display="none"; }}/>
                                            {!isUnlocked && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm">🔒</div>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-display text-xs font-bold tracking-wider text-white/80 truncate">{fr.label}</p>
                                            <p className={`text-[10px] mt-0.5 ${isUnlocked ? "text-emerald-400/70" : "text-white/25"}`}>
                                                {isUnlocked ? "✓ Unlocked" : fr.unlockHint}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 flex gap-2 p-4 border-t border-white/[0.08]">
                    <button onClick={onClose}
                        className="flex-1 py-2 rounded-xl border border-white/10 text-white/40 text-xs font-display tracking-widest uppercase hover:bg-white/5 transition-all">
                        Cancel
                    </button>
                    <button onClick={() => onSave(selAvatar, selFrame)}
                        className="flex-1 py-2 rounded-xl text-xs font-display tracking-widest uppercase font-bold text-white transition-all"
                        style={{background:"linear-gradient(135deg,#7b2fff,#4cc9f0)",boxShadow:"0 0 14px rgba(123,47,255,0.4)"}}>
                        ✓ Save
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────
// NexusRow
// ─────────────────────────────────────────

function NexusRow({ label, value, icon, color }: { label:string; value:string; icon:string; color:string }) {
    return (
        <div className="flex items-center justify-between gap-3 px-2 py-1">
            <span className="text-xs text-white/40">{label}</span>
            <div className="flex items-center gap-1">
                <span className={`font-display text-xs font-bold ${color}`}>{value}</span>
                <span className="text-sm leading-none">{icon}</span>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────
// Layout
// ─────────────────────────────────────────

interface Props {
    children: React.ReactNode;
    sidebar?: React.ReactNode;
    battleLocked?: boolean;
    onBattleLockedClick?: () => void;
}

export default function Layout({ children, sidebar, battleLocked, onBattleLockedClick }: Props) {
    const { user, logout }           = useAuth();
    const { trainer, tokens, reload, reset: resetTrainer } = useTrainer();
    const navigate                   = useNavigate();
    const location                   = useLocation();
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [logoutLoading, setLogoutLoading]         = useState(false);
    const [nexusOpen, setNexusOpen]  = useState(false);
    const [showAvatarModal, setShowAvatarModal]     = useState(false);
    const nexusRef                   = useRef<HTMLDivElement>(null);

    const trainerAny    = trainer as any;
    const gold          = trainerAny?.gold       ?? 0;
    const diamonds      = trainerAny?.diamonds   ?? 0;
    const currentAvatar = trainerAny?.avatar     ?? "male_1";
    const gender        = trainerAny?.gender     ?? "";
    const frameKey        = trainerAny?.avatarFrame ?? "none"; // always from DB
    const unlockedFrames  = (trainerAny?.unlockedFrames as string[]) ?? ["none", "silver"];
    const frameStyle    = (AVATAR_FRAMES.find(f => f.key === frameKey) ?? AVATAR_FRAMES[0]).style;

    // Tokens — real structure from /tokens/me:
    // { npcTokens, npcMax, nextNpcRechargeMs, pvpTokens, pvpMax, nextPvpRechargeMs }
    const tok        = tokens as any;
    const pveCount   = tok?.npcTokens ?? 0;
    const pveMax     = tok?.npcMax    ?? 10;
    const pvpCount   = tok?.pvpTokens ?? 0;
    const pvpMax     = tok?.pvpMax    ?? 5;
    // nextXxxRechargeMs: ms until next token (null if at max)
    const pveReloadAt = tok?.nextNpcRechargeMs != null
        ? new Date(Date.now() + tok.nextNpcRechargeMs) : null;
    const pvpReloadAt = tok?.nextPvpRechargeMs != null
        ? new Date(Date.now() + tok.nextPvpRechargeMs) : null;

    const handleSaveAvatar = async (newAvatarId: string, newFrameKey: string) => {
        try {
            await api.updateAvatar({ avatar: newAvatarId, avatarFrame: newFrameKey });
            reload(); // reload trainer from server
        } catch (e: any) {
            addToast(e.message ?? "Error saving", "error");
        }
        setShowAvatarModal(false);
    };

    const handleLogoutClick = () => {
        if (localStorage.getItem("mythara_battle_active") === "1") setShowLogoutConfirm(true);
        else { resetTrainer(); logout(); }
    };

    const handleLogoutConfirm = async () => {
        setLogoutLoading(true);
        try {
            const session = await api.battleNpcActive();
            if (session?.battleId || session?.id) await api.battleNpcForfeit(session.battleId ?? session.id);
        } catch (_) {}
        finally {
            localStorage.removeItem("mythara_battle_active");
            setLogoutLoading(false); setShowLogoutConfirm(false);
            resetTrainer(); logout();
        }
    };

    const [toasts, setToasts] = useState<Toast[]>([]);
    const timersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

    const addToast = useCallback((message: string, type: ToastType = "info") => {
        const id = ++_toastCounter;
        setToasts(prev => [...prev, { id, message, type }]);
        timersRef.current[id] = setTimeout(() => removeToast(id), 3500);
    }, []);

    const removeToast = useCallback((id: number) => {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    useEffect(() => () => { Object.values(timersRef.current).forEach(clearTimeout); }, []);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            if (showAvatarModal)  { setShowAvatarModal(false); return; }
            if (nexusOpen)        { setNexusOpen(false);       return; }
            if (showLogoutConfirm && !logoutLoading) setShowLogoutConfirm(false);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [showAvatarModal, nexusOpen, showLogoutConfirm, logoutLoading]);

    useEffect(() => {
        if (!nexusOpen) return;
        const h = (e: MouseEvent) => {
            if (nexusRef.current && !nexusRef.current.contains(e.target as Node)) setNexusOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [nexusOpen]);

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            <div className="w-screen overflow-hidden flex flex-col bg-bg" style={{ height: "100dvh" }}>


                {/* ═══ TOPBAR ═══ */}
                <header className="flex-shrink-0 bg-bg/95 backdrop-blur border-b border-border h-14 flex items-center px-4 gap-3">

                    {/* Logo */}
                    <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => navigate("/")}>
                        <svg className="w-6 h-6" viewBox="0 0 60 60" fill="none">
                            <defs>
                                <linearGradient id="navLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#7b2fff"/>
                                    <stop offset="100%" stopColor="#4cc9f0"/>
                                </linearGradient>
                            </defs>
                            <polygon points="30,3 54,16 54,44 30,57 6,44 6,16" stroke="url(#navLogoGrad)" strokeWidth="2" fill="none"/>
                            <line x1="30" y1="12" x2="30" y2="48" stroke="url(#navLogoGrad)" strokeWidth="1.5" strokeLinecap="round"/>
                            <line x1="14" y1="22" x2="46" y2="38" stroke="url(#navLogoGrad)" strokeWidth="1.5" strokeLinecap="round"/>
                            <line x1="46" y1="22" x2="14" y2="38" stroke="url(#navLogoGrad)" strokeWidth="1.5" strokeLinecap="round"/>
                            <circle cx="30" cy="30" r="5" fill="url(#navLogoGrad)" opacity="0.9"/>
                            <circle cx="30" cy="30" r="2.5" fill="#070b14"/>
                        </svg>
                        <span className="font-display font-bold text-lg tracking-widest text-yellow hidden sm:block">MYTHARA</span>
                    </div>

                    {/* Centro stats */}
                    <div className="flex-1 flex items-center justify-center">
                        <div className="hidden md:flex items-center gap-2">
                            <StatChip icon="🗡️" value={pveCount} max={pveMax} label="PvE tokens" reloadAt={pveReloadAt} color="text-sky-300"/>
                            <StatChip icon="⚔️" value={pvpCount} max={pvpMax} label="PvP tokens" reloadAt={pvpReloadAt} color="text-orange-300"/>
                            <StatChip icon="💎" value={diamonds.toLocaleString("en-US")} label="Diamonds" color="text-cyan-300"/>
                            <StatChip icon="🪙" value={formatGold(gold)} label="Gold" color="text-yellow-300"/>
                        </div>
                        {/* NEXUS mobile */}
                        <div className="md:hidden relative" ref={nexusRef}>
                            <button onClick={() => setNexusOpen(v => !v)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10
                                    font-display text-xs tracking-widest text-white/70 hover:text-white hover:border-white/20 transition-all">
                                <span className="text-sm">✦</span> NEXUS
                                <span className="text-white/30 text-[10px]">{nexusOpen?"▲":"▼"}</span>
                            </button>
                            {nexusOpen && (
                                <div className="nexus-drop absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50
                                    bg-[#0d1220] border border-white/10 rounded-xl shadow-2xl p-3 min-w-[180px] flex flex-col gap-1.5">
                                    <NexusRow label="PvE tokens"  value={`${pveCount}/${pveMax}`}            icon="🗡️" color="text-sky-300"/>
                                    <NexusRow label="PvP tokens"  value={`${pvpCount}/${pvpMax}`}            icon="⚔️" color="text-orange-300"/>
                                    <NexusRow label="Diamonds"    value={diamonds.toLocaleString("en-US")}   icon="💎" color="text-cyan-300"/>
                                    <NexusRow label="Gold"        value={formatGold(gold)}                   icon="🪙" color="text-yellow-300"/>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: mini avatar + username → /profile · chat · logout */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Chat button */}
                        <button
                            className="flex items-center justify-center opacity-40 hover:opacity-70 transition-opacity"
                            style={{
                                width: 28, height: 28, borderRadius: "50%",
                                background: "rgba(123,47,255,0.12)",
                                border: "1px solid rgba(123,47,255,0.25)",
                                fontSize: 13,
                            }}
                            title="Chat (coming soon)"
                        >💬</button>

                        <div className="flex items-center gap-2 cursor-pointer group rounded-lg px-2 py-1 hover:bg-white/5 transition-all"
                            onClick={() => navigate("/profile")} title="View profile">
                            <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0" style={frameStyle}>
                                <img src={avatarUrl(currentAvatar)} alt="avatar" className="w-full h-full object-cover"
                                    onError={e => {
                                        const img = e.target as HTMLImageElement;
                                        img.style.display="none";
                                        img.parentElement!.innerHTML=`<div class="w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center text-xs font-bold">${user?.username?.[0]?.toUpperCase()??"?"}</div>`;
                                    }}/>
                            </div>
                            <span className="font-display text-sm text-muted group-hover:text-white transition-colors tracking-wider hidden sm:block">
                                {user?.username}
                            </span>
                        </div>
                        <button onClick={handleLogoutClick}
                            className="px-3 py-1 border border-border rounded-lg text-muted text-xs font-display tracking-widest uppercase hover:border-red hover:text-red transition-all">
                            Logout
                        </button>
                    </div>
                </header>

                {/* ═══ BODY ═══ */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Sidebar */}
                    <aside className="w-52 flex-shrink-0 border-r border-border flex flex-col overflow-hidden">

                        {/* Avatar grande */}
                        <div className="flex-shrink-0 flex flex-col items-center gap-2 pt-5 pb-3 px-3">
                            <button onClick={() => setShowAvatarModal(true)}
                                className="relative group focus:outline-none" title="Change avatar or frame">
                                <div className="w-16 h-16 rounded-full overflow-hidden" style={frameStyle}>
                                    <img src={avatarUrl(currentAvatar)} alt="avatar" className="w-full h-full object-cover"
                                        onError={e => {
                                            const img = e.target as HTMLImageElement;
                                            img.style.display="none";
                                            img.parentElement!.innerHTML=`<div class="w-full h-full bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center text-2xl">${user?.username?.[0]?.toUpperCase()??"?"}</div>`;
                                        }}/>
                                </div>
                                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-white text-xs">✏️</span>
                                </div>
                            </button>
                            <div className="text-center">
                                <p className="font-display font-bold text-sm text-white tracking-wide truncate max-w-[160px]">
                                    {trainerAny?.name ?? user?.username ?? "—"}
                                </p>
                                <p className="text-xs text-muted mt-0.5">
                                    Lv. {trainerAny?.level ?? 1}
                                    {trainerAny?.rank && <span className="ml-1 text-white/25">· {trainerAny.rank}</span>}
                                </p>
                            </div>
                        </div>

                        <div className="mx-3 border-t border-border/50 mb-1"/>

                        {/* Sidebar slot */}
                        {sidebar && (
                            <div className="flex-shrink-0 border-b border-border/50 overflow-y-auto max-h-36">{sidebar}</div>
                        )}

                        {/* Nav — bloqueado durante combate activo */}
                        <div className="flex-1 relative overflow-hidden">
                            <nav className={`h-full py-1 px-2 flex flex-col overflow-y-auto transition-opacity ${battleLocked ? "opacity-40 pointer-events-none" : ""}`}>
                                {NAV.map(item => {
                                    const active = location.pathname === item.path;
                                    return (
                                        <div key={item.path} onClick={() => navigate(item.path)}
                                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-all
                                                ${active ? "bg-red/10 text-red border-l-2 border-red" : "text-muted hover:bg-white/5 hover:text-white"}`}>
                                            <span className="text-base leading-none w-5 text-center">{item.icon}</span>
                                            <span className="font-display tracking-wide text-xs font-semibold">{item.label}</span>
                                        </div>
                                    );
                                })}
                            </nav>
                            {/* Overlay de bloqueo — solo sobre el nav, no toda la pantalla */}
                            {battleLocked && (
                                <div
                                    className="absolute inset-0 z-10 cursor-not-allowed"
                                    onClick={() => onBattleLockedClick?.()}
                                    title="You have an active battle"
                                />
                            )}
                        </div>
                    </aside>

                    {/* Main */}
                    <main className="flex-1 overflow-hidden flex flex-col relative">{children}</main>
                </div>

                {/* Logout modal */}
                {showLogoutConfirm && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                        onClick={() => { if (!logoutLoading) setShowLogoutConfirm(false); }}>
                        <div className="bg-card border border-border rounded-xl p-6 w-80 flex flex-col gap-4 shadow-2xl"
                            onClick={e => e.stopPropagation()}>
                            <h2 className="font-display text-base tracking-widest text-yellow uppercase text-center">⚠️ Active battle</h2>
                            <p className="text-sm text-muted text-center leading-relaxed">
                                If you log out now, the current battle will be recorded as a{" "}
                                <span className="text-red font-semibold">defeat</span>. Are you sure you want to leave?
                            </p>
                            <div className="flex gap-3 mt-1">
                                <button onClick={() => setShowLogoutConfirm(false)} disabled={logoutLoading}
                                    className="flex-1 py-2 rounded-lg border border-border text-muted text-xs font-display tracking-widest uppercase hover:bg-white/5 transition-all">
                                    Cancel
                                </button>
                                <button onClick={handleLogoutConfirm} disabled={logoutLoading}
                                    className="flex-1 py-2 rounded-lg border border-red bg-red/10 text-red text-xs font-display tracking-widest uppercase hover:bg-red/20 transition-all disabled:opacity-50">
                                    {logoutLoading ? "Logging out..." : "Leave and forfeit"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Avatar modal */}
            {showAvatarModal && (
                <AvatarModal
                    currentAvatar={currentAvatar}
                    currentFrame={frameKey}
                    gender={gender}
                    unlockedFrames={unlockedFrames}
                    onClose={() => setShowAvatarModal(false)}
                    onSave={handleSaveAvatar}
                />
            )}

            <ToastContainer toasts={toasts} onRemove={removeToast}/>
        </ToastContext.Provider>
    );
}
