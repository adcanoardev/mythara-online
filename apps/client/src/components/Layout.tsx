import { useState, useCallback, useEffect, useRef, createContext, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const NAV = [
    { icon: "🏡", label: "Posada", path: "/" },
    { icon: "👤", label: "Perfil", path: "/profile" },
    { icon: "🐾", label: "Equipo", path: "/team" },
    { icon: "⚔️", label: "Combatir", path: "/battle" },
    { icon: "◈", label: "Fragmentos", path: "/fragment" },
    { icon: "📖", label: "Arcanum", path: "/myths" },
    { icon: "🎒", label: "Inventario", path: "/inventory" },
    { icon: "🏅", label: "Santuarios", path: "/sanctums" },
    { icon: "🏆", label: "Ranking", path: "/ranking" },
];

// ─────────────────────────────────────────
// Toast system
// ─────────────────────────────────────────

export type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
    return useContext(ToastContext);
}

const TOAST_COLORS: Record<ToastType, string> = {
    success: "border-emerald-500/60 bg-emerald-500/10 text-emerald-300",
    error: "border-red-500/60    bg-red-500/10    text-red-300",
    info: "border-blue-500/60   bg-blue-500/10   text-blue-300",
    warning: "border-yellow-500/60 bg-yellow-500/10 text-yellow-300",
};

const TOAST_ICONS: Record<ToastType, string> = {
    success: "✅",
    error: "❌",
    info: "ℹ️",
    warning: "⚠️",
};

let _toastCounter = 0;

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: number) => void }) {
    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border shadow-lg shadow-black/40
                        font-mono text-xs max-w-xs pointer-events-auto
                        animate-toast-in
                        ${TOAST_COLORS[t.type]}`}
                >
                    <span className="flex-shrink-0 text-sm">{TOAST_ICONS[t.type]}</span>
                    <p className="leading-relaxed flex-1">{t.message}</p>
                    <button
                        onClick={() => onRemove(t.id)}
                        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity ml-1 text-xs"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────
// Affinity table data
// ─────────────────────────────────────────

type Affinity = "EMBER" | "TIDE" | "GROVE" | "VOLT" | "STONE" | "FROST" | "VENOM" | "ASTRAL" | "IRON" | "SHADE";

const AFFINITIES: Affinity[] = ["EMBER", "TIDE", "GROVE", "VOLT", "STONE", "FROST", "VENOM", "ASTRAL", "IRON", "SHADE"];

const AFFINITY_EMOJI: Record<Affinity, string> = {
    EMBER: "🔥",
    TIDE: "🌊",
    GROVE: "🌿",
    VOLT: "⚡",
    STONE: "🪨",
    FROST: "❄️",
    VENOM: "🧪",
    ASTRAL: "✨",
    IRON: "⚙️",
    SHADE: "🌑",
};

const AFFINITY_LABEL: Record<Affinity, string> = {
    EMBER: "Brasa",
    TIDE: "Marea",
    GROVE: "Bosque",
    VOLT: "Voltio",
    STONE: "Piedra",
    FROST: "Escarcha",
    VENOM: "Veneno",
    ASTRAL: "Astral",
    IRON: "Hierro",
    SHADE: "Sombra",
};

const AFFINITY_CHART: Record<Affinity, Partial<Record<Affinity, number>>> = {
    EMBER: { GROVE: 2, FROST: 2, TIDE: 0.5, STONE: 0.5, EMBER: 0.5 },
    TIDE: { EMBER: 2, STONE: 2, VOLT: 0.5, GROVE: 0.5, TIDE: 0.5 },
    GROVE: { TIDE: 2, STONE: 2, EMBER: 0.5, VENOM: 0.5, GROVE: 0.5 },
    VOLT: { TIDE: 2, IRON: 2, GROVE: 0.5, STONE: 0.5, VOLT: 0.5 },
    STONE: { EMBER: 2, VOLT: 2, GROVE: 0.5, TIDE: 0.5, STONE: 0.5 },
    FROST: { GROVE: 2, ASTRAL: 2, EMBER: 0.5, IRON: 0.5, FROST: 0.5 },
    VENOM: { GROVE: 2, ASTRAL: 2, STONE: 0.5, IRON: 0.5, VENOM: 0.5 },
    ASTRAL: { SHADE: 2, VENOM: 0.5, ASTRAL: 0.5 },
    IRON: { FROST: 2, STONE: 2, EMBER: 0.5, IRON: 0.5 },
    SHADE: { ASTRAL: 2, VENOM: 2, SHADE: 0.5 },
};

function getCell(atk: Affinity, def: Affinity): number {
    return AFFINITY_CHART[atk]?.[def] ?? 1;
}

// ─────────────────────────────────────────
// AffinityTableModal
// ─────────────────────────────────────────

function AffinityTableModal({ onClose }: { onClose: () => void }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Panel */}
            <div
                className="relative z-10 bg-bg border border-border rounded-2xl overflow-hidden
                    w-full max-w-2xl max-h-screen flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
                    <div>
                        <h2 className="font-display font-black text-base text-yellow tracking-widest uppercase">
                            📊 Tabla de Afinidades
                        </h2>
                        <p className="text-muted text-xs mt-0.5">Fila = Ataque · Columna = Defensor</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted hover:text-white transition-colors text-lg leading-none"
                    >
                        ✕
                    </button>
                </div>

                {/* Legend */}
                <div className="flex gap-4 px-5 py-2 border-b border-border/50 flex-shrink-0">
                    <span className="flex items-center gap-1.5 text-xs font-display">
                        <span className="w-5 h-5 rounded bg-green-500/30 border border-green-500/50 flex items-center justify-center text-green-400 font-black text-xs">
                            2
                        </span>
                        <span className="text-muted">Muy eficaz</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-display">
                        <span className="w-5 h-5 rounded bg-white/5 border border-border flex items-center justify-center text-muted text-xs">
                            1
                        </span>
                        <span className="text-muted">Normal</span>
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-display">
                        <span className="w-5 h-5 rounded bg-red/20 border border-red/40 flex items-center justify-center text-red font-black text-xs">
                            ½
                        </span>
                        <span className="text-muted">Poco eficaz</span>
                    </span>
                </div>

                {/* Table — scrollable */}
                <div className="overflow-auto flex-1 p-3">
                    <table className="border-collapse text-xs w-full">
                        <thead>
                            <tr>
                                <th className="w-10 h-8" />
                                {AFFINITIES.map((def) => (
                                    <th key={def} className="w-9 h-8 text-center">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className="text-base">{AFFINITY_EMOJI[def]}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {AFFINITIES.map((atk) => (
                                <tr key={atk}>
                                    <td className="pr-1 py-0.5">
                                        <div className="flex items-center gap-1 justify-end">
                                            <span className="text-sm">{AFFINITY_EMOJI[atk]}</span>
                                            <span className="text-muted font-display text-xs hidden sm:block w-14 text-right truncate">
                                                {AFFINITY_LABEL[atk]}
                                            </span>
                                        </div>
                                    </td>
                                    {AFFINITIES.map((def) => {
                                        const val = getCell(atk, def);
                                        return (
                                            <td key={def} className="py-0.5 px-0.5 text-center">
                                                <div
                                                    className={`w-8 h-7 mx-auto rounded flex items-center justify-center font-display font-black text-xs
                                                    ${
                                                        val === 2
                                                            ? "bg-green-500/25 text-green-400 border border-green-500/40"
                                                            : val === 0.5
                                                              ? "bg-red/20 text-red border border-red/30"
                                                              : "bg-white/4 text-muted/50"
                                                    }`}
                                                >
                                                    {val === 2 ? "×2" : val === 0.5 ? "½" : "·"}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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
}

export default function Layout({ children, sidebar }: Props) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [showAffinity, setShowAffinity] = useState(false);

    // Toast state
    const [toasts, setToasts] = useState<Toast[]>([]);
    const timersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

    const addToast = useCallback((message: string, type: ToastType = "info") => {
        const id = ++_toastCounter;
        setToasts((prev) => [...prev, { id, message, type }]);
        timersRef.current[id] = setTimeout(() => removeToast(id), 3500);
    }, []);

    const removeToast = useCallback((id: number) => {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    // Limpiar timers al desmontar
    useEffect(() => {
        return () => {
            Object.values(timersRef.current).forEach(clearTimeout);
        };
    }, []);

    return (
        <ToastContext.Provider value={{ toast: addToast }}>
            <div className="w-screen overflow-hidden flex flex-col bg-bg" style={{ height: "100dvh" }}>
                <style>{`
            @keyframes toastIn {
                from { opacity: 0; transform: translateX(100%) scale(0.95); }
                to   { opacity: 1; transform: translateX(0)   scale(1); }
            }
            .animate-toast-in { animation: toastIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both; }
        `}</style>
                {/* Top bar */}
                <header className="flex-shrink-0 bg-bg/90 backdrop-blur border-b border-border px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
                        <svg className="w-6 h-6" viewBox="0 0 60 60" fill="none">
                            <defs>
                                <linearGradient id="navLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#7b2fff" />
                                    <stop offset="100%" stopColor="#4cc9f0" />
                                </linearGradient>
                            </defs>
                            <polygon
                                points="30,3 54,16 54,44 30,57 6,44 6,16"
                                stroke="url(#navLogoGrad)"
                                strokeWidth="2"
                                fill="none"
                            />
                            <line
                                x1="30"
                                y1="12"
                                x2="30"
                                y2="48"
                                stroke="url(#navLogoGrad)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                            <line
                                x1="14"
                                y1="22"
                                x2="46"
                                y2="38"
                                stroke="url(#navLogoGrad)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                            <line
                                x1="46"
                                y1="22"
                                x2="14"
                                y2="38"
                                stroke="url(#navLogoGrad)"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                            <circle cx="30" cy="30" r="5" fill="url(#navLogoGrad)" opacity="0.9" />
                            <circle cx="30" cy="30" r="2.5" fill="#070b14" />
                        </svg>
                        <span className="font-display font-bold text-lg tracking-widest text-yellow">MYTHARA</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="font-display text-sm text-muted tracking-wider hidden sm:block">
                            {user?.username}
                        </span>
                        <button
                            onClick={logout}
                            className="px-3 py-1 border border-border rounded-lg text-muted text-xs font-display tracking-widest uppercase hover:border-red hover:text-red transition-all"
                        >
                            Salir
                        </button>
                    </div>
                </header>

                {/* Body */}
                <div className="flex-1 flex overflow-hidden">
                    <aside className="w-56 flex-shrink-0 border-r border-border flex flex-col overflow-hidden">
                        {sidebar && <div className="flex-shrink-0 overflow-y-auto">{sidebar}</div>}
                        <nav className="flex-1 p-2 flex flex-col gap-0.5">
                            {NAV.map((item) => {
                                const active = location.pathname === item.path;
                                return (
                                    <div
                                        key={item.path}
                                        onClick={() => navigate(item.path)}
                                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all
                                        ${
                                            active
                                                ? "bg-red/10 text-red border-l-2 border-red"
                                                : "text-muted hover:bg-white/5 hover:text-white"
                                        }`}
                                    >
                                        <span>{item.icon}</span>
                                        <span className="font-display tracking-wide">{item.label}</span>
                                    </div>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* Main content */}
                    <main className="flex-1 overflow-hidden flex flex-col relative">
                        {children}

                        {/* Botón flotante tabla de afinidades */}
                        <button
                            onClick={() => setShowAffinity(true)}
                            title="Tabla de afinidades"
                            className="absolute bottom-4 right-4 z-30
                            w-10 h-10 rounded-full border border-border bg-card
                            flex items-center justify-center text-lg
                            hover:border-yellow/50 hover:bg-yellow/10 hover:scale-110
                            transition-all duration-200 shadow-lg shadow-black/40"
                        >
                            📊
                        </button>
                    </main>
                </div>

                {/* Affinity modal */}
                {showAffinity && <AffinityTableModal onClose={() => setShowAffinity(false)} />}
            </div>

            {/* Toasts — fuera del div principal para no ser afectados por overflow:hidden */}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}
