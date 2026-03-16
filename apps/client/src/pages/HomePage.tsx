import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTrainer } from "../context/TrainerContext";

// ─────────────────────────────────────────
// Distritos de la ciudad
// px/py = position 0-1 over the map image — adjust after seeing on screen
// ─────────────────────────────────────────

const DISTRICTS = [
    {
        id: "nexus",
        name: "Nexus",
        icon: "🔮",
        color: "#a78bfa",
        description: "Arcane summoning portal",
        route: "/nexus",
        px: 0.50, py: 0.42,
    },
    {
        id: "arena",
        name: "Arena",
        icon: "⚔️",
        color: "#ef4444",
        description: "Combat · Sanctums · PvP",
        route: "/arena",
        px: 0.72, py: 0.24,
    },
    {
        id: "taberna",
        name: "Tavern",
        icon: "🍺",
        color: "#f59e0b",
        description: "Binders · Ranking · Social",
        route: "/tavern",
        px: 0.28, py: 0.26,
    },
    {
        id: "posada",
        name: "Inn",
        icon: "🏚️",
        color: "#84cc16",
        description: "Mine · Forge · Lab · Nursery",
        route: "/inn",
        px: 0.22, py: 0.52,
    },
    {
        id: "mercado",
        name: "Market",
        icon: "🏪",
        color: "#38bdf8",
        description: "Shop · Gold · Diamonds",
        route: "/market",
        px: 0.76, py: 0.50,
    },
    {
        id: "arcanum",
        name: "Arcanum",
        icon: "📖",
        color: "#60a5fa",
        description: "Mythsdex · Encyclopedia",
        route: "/arcanum",
        px: 0.50, py: 0.18,
    },
    {
        id: "gremio",
        name: "Guild",
        icon: "📜",
        color: "#fbbf24",
        description: "Missions · Achievements · Pass",
        route: "/guild",
        px: 0.50, py: 0.68,
    },
];

const CITY_URL =
    "https://cdn.jsdelivr.net/gh/adcanoardev/mythara-assets@cce70217dc2b974371d545c4aaa743dff9875386/maps/main_city_base.webp";

type District = typeof DISTRICTS[0];

// ─────────────────────────────────────────
// Hook drag clampeado — imagen nunca deja huecos
// ─────────────────────────────────────────

function useMapDrag(
    containerRef: React.RefObject<HTMLDivElement>,
    mapRef: React.RefObject<HTMLDivElement>
) {
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const dragging = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });
    const startOff = useRef({ x: 0, y: 0 });
    const didDrag  = useRef(false);
    const centered = useRef(false);

    const clamp = useCallback((ox: number, oy: number) => {
        const c = containerRef.current;
        const m = mapRef.current;
        if (!c || !m) return { x: ox, y: oy };
        return {
            x: Math.max(Math.min(0, c.offsetWidth  - m.offsetWidth),  Math.min(0, ox)),
            y: Math.max(Math.min(0, c.offsetHeight - m.offsetHeight), Math.min(0, oy)),
        };
    }, [containerRef, mapRef]);

    // Centrar al montar
    useEffect(() => {
        const t = setTimeout(() => {
            if (centered.current) return;
            const c = containerRef.current;
            const m = mapRef.current;
            if (!c || !m) return;
            centered.current = true;
            setOffset(clamp(
                (c.offsetWidth  - m.offsetWidth)  / 2,
                (c.offsetHeight - m.offsetHeight) / 2
            ));
        }, 80);
        return () => clearTimeout(t);
    }, [clamp, containerRef, mapRef]);

    // Mouse
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        dragging.current = true; didDrag.current = false;
        startPos.current = { x: e.clientX, y: e.clientY };
        startOff.current = { ...offset };
    }, [offset]);

    useEffect(() => {
        const move = (e: MouseEvent) => {
            if (!dragging.current) return;
            const dx = e.clientX - startPos.current.x;
            const dy = e.clientY - startPos.current.y;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
            setOffset(clamp(startOff.current.x + dx, startOff.current.y + dy));
        };
        const up = () => { dragging.current = false; };
        window.addEventListener("mousemove", move);
        window.addEventListener("mouseup", up);
        return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
    }, [clamp]);

    // Touch
    const onTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length !== 1) return;
        dragging.current = true; didDrag.current = false;
        startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        startOff.current = { ...offset };
    }, [offset]);

    useEffect(() => {
        const move = (e: TouchEvent) => {
            if (!dragging.current || e.touches.length !== 1) return;
            const dx = e.touches[0].clientX - startPos.current.x;
            const dy = e.touches[0].clientY - startPos.current.y;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
            setOffset(clamp(startOff.current.x + dx, startOff.current.y + dy));
        };
        const end = () => { dragging.current = false; };
        window.addEventListener("touchmove", move, { passive: true });
        window.addEventListener("touchend", end);
        return () => { window.removeEventListener("touchmove", move); window.removeEventListener("touchend", end); };
    }, [clamp]);

    // Re-clamp en resize
    useEffect(() => {
        const ro = new ResizeObserver(() => setOffset(p => clamp(p.x, p.y)));
        if (containerRef.current) ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [clamp, containerRef]);

    return { offset, onMouseDown, onTouchStart, didDrag };
}

// ─────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────

export default function HomePage() {
    const { trainer } = useTrainer();
    const navigate    = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef       = useRef<HTMLDivElement>(null);

    const [hoveredId, setHoveredId] = useState<string | null>(null);
    const { offset, onMouseDown, onTouchStart, didDrag } = useMapDrag(containerRef, mapRef);

    const binderLevel: number = (trainer as any)?.binderLevel ?? 1;
    const gold:        number = (trainer as any)?.gold        ?? 0;
    const diamonds:    number = (trainer as any)?.diamonds    ?? 0;
    const npcTokens:   number = (trainer as any)?.npcTokens   ?? 0;
    const pvpTokens:   number = (trainer as any)?.pvpTokens   ?? 0;
    const avatar:      string = trainer?.avatar ?? "male_1";
    const username:    string = (trainer as any)?.username    ?? "Binder";
    const xp:          number = (trainer as any)?.xp          ?? 0;

    // Formato de oro
    function fmtGold(n: number): string {
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
        if (n >= 10_000)    return `${Math.floor(n / 1000)}K`;
        return n.toLocaleString();
    }

    function handleDistrictClick(d: District) {
        if (didDrag.current) return;
        navigate(d.route);
    }

    const AVATAR_URL = (av: string) =>
        `https://cdn.jsdelivr.net/gh/adcanoardev/mythara-assets@7613486785dc2b2089f6d345e1281e9316c1d982/avatars/${av}.webp`;

    return (
        <div className="w-screen h-screen overflow-hidden relative bg-black flex flex-col select-none">
            <style>{`
                @keyframes districtPulse {
                    0%   { transform:translate(-50%,-50%) scale(0.6); opacity:0.8; }
                    100% { transform:translate(-50%,-50%) scale(2.4); opacity:0; }
                }
                @keyframes homeBlink {
                    0%,100% { opacity:0.3; } 50% { opacity:0.7; }
                }
                @keyframes arrowBob {
                    0%,100% { transform:translateX(0); } 50% { transform:translateX(4px); }
                }
                .city-grab { cursor:grab; }
                .city-grab:active { cursor:grabbing; }
            `}</style>

            {/* ── HUD SUPERIOR ── */}
            <div
                className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 pt-3 pb-2"
                style={{ zIndex: 20, background: "linear-gradient(to bottom, rgba(4,7,16,0.85) 0%, transparent 100%)", pointerEvents: "none" }}
            >
                {/* Avatar + nivel + nombre */}
                <div className="flex items-center gap-2.5 pointer-events-all">
                    <div className="relative">
                        <img
                            src={AVATAR_URL(avatar)}
                            onError={e => { (e.target as HTMLImageElement).src = ""; }}
                            className="rounded-full object-cover border-2 border-yellow-500/60"
                            style={{ width: "clamp(36px,5vw,48px)", height: "clamp(36px,5vw,48px)" }}
                        />
                        <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black font-bold rounded-full flex items-center justify-center"
                            style={{ fontSize: "9px", width: "18px", height: "18px", border: "1.5px solid #020810" }}>
                            {binderLevel}
                        </div>
                    </div>
                    <div>
                        <div className="text-white font-display font-bold" style={{ fontSize: "clamp(11px,1.2vw,14px)" }}>{username}</div>
                        {/* XP bar */}
                        <div className="rounded-full overflow-hidden" style={{ width: "clamp(60px,8vw,90px)", height: "4px", background: "rgba(255,255,255,0.15)", marginTop: "3px" }}>
                            <div className="h-full rounded-full bg-yellow-400" style={{ width: `${Math.min(100, (xp % 1000) / 10)}%`, transition: "width 0.5s" }} />
                        </div>
                    </div>
                </div>

                {/* Recursos */}
                <div className="flex items-center gap-2 pointer-events-all">
                    {/* Fichas PvE */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                        style={{ background: "rgba(4,7,16,0.72)", border: "1px solid rgba(255,255,255,0.12)" }}>
                        <span style={{ fontSize: "12px" }}>⚡</span>
                        <span className="font-display font-bold text-white" style={{ fontSize: "clamp(10px,1.1vw,13px)" }}>{npcTokens}</span>
                    </div>
                    {/* Fichas PvP */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                        style={{ background: "rgba(4,7,16,0.72)", border: "1px solid rgba(255,255,255,0.12)" }}>
                        <span style={{ fontSize: "12px" }}>⚔️</span>
                        <span className="font-display font-bold text-white" style={{ fontSize: "clamp(10px,1.1vw,13px)" }}>{pvpTokens}</span>
                    </div>
                    {/* Diamantes */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                        style={{ background: "rgba(4,7,16,0.72)", border: "1px solid rgba(99,102,241,0.4)" }}>
                        <span style={{ fontSize: "12px" }}>💎</span>
                        <span className="font-display font-bold" style={{ color: "#a78bfa", fontSize: "clamp(10px,1.1vw,13px)" }}>{diamonds}</span>
                    </div>
                    {/* Oro */}
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg"
                        style={{ background: "rgba(4,7,16,0.72)", border: "1px solid rgba(251,191,36,0.4)" }}>
                        <span style={{ fontSize: "12px" }}>🪙</span>
                        <span className="font-display font-bold" style={{ color: "#fbbf24", fontSize: "clamp(10px,1.1vw,13px)" }}>{fmtGold(gold)}</span>
                    </div>
                </div>
            </div>

            {/* ── MAPA CIUDAD ── */}
            <div
                ref={containerRef}
                className="flex-1 relative overflow-hidden city-grab"
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
            >
                <div
                    ref={mapRef}
                    className="absolute top-0 left-0"
                    style={{
                        width: "max(100%, 900px)",
                        minHeight: "100%",
                        aspectRatio: "16/9",
                        transform: `translate(${offset.x}px, ${offset.y}px)`,
                        willChange: "transform",
                        touchAction: "none",
                    }}
                >
                    {/* Imagen ciudad */}
                    <img
                        src={CITY_URL}
                        alt="City of Mythara"
                        draggable={false}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ objectFit: "cover", userSelect: "none" }}
                    />

                    {/* Overlay oscuro muy sutil */}
                    <div className="absolute inset-0 pointer-events-none"
                        style={{ background: "rgba(4,7,16,0.15)" }} />

                    {/* Vignette borde */}
                    <div className="absolute inset-0 pointer-events-none"
                        style={{ background: "radial-gradient(ellipse 90% 88% at 50% 50%, transparent 42%, rgba(4,7,16,0.75) 100%)" }} />

                    {/* ── MARKERS ── */}
                    {DISTRICTS.map(d => {
                        const isHovered = hoveredId === d.id;
                        const sz = "clamp(32px,4.2vw,50px)";

                        return (
                            <div
                                key={d.id}
                                className="absolute"
                                style={{
                                    left: `${d.px * 100}%`,
                                    top:  `${d.py * 100}%`,
                                    zIndex: 5,
                                    pointerEvents: "all",
                                    cursor: "pointer",
                                }}
                                onMouseEnter={() => setHoveredId(d.id)}
                                onMouseLeave={() => setHoveredId(null)}
                                onClick={() => handleDistrictClick(d)}
                            >
                                {/* Glow de bioma al hacer hover */}
                                <div
                                    className="absolute rounded-full pointer-events-none transition-opacity duration-300"
                                    style={{
                                        width: "clamp(80px,12vw,140px)",
                                        height: "clamp(80px,12vw,140px)",
                                        top: "50%", left: "50%",
                                        transform: "translate(-50%,-50%)",
                                        background: `radial-gradient(ellipse, ${d.color}33 0%, transparent 70%)`,
                                        opacity: isHovered ? 1 : 0,
                                        zIndex: -1,
                                    }}
                                />

                                {/* Pulse rings */}
                                {[0, 0.85].map((delay, ri) => (
                                    <div key={ri} className="absolute rounded-full pointer-events-none" style={{
                                        width: sz, height: sz, top: 0, left: 0,
                                        border: `${ri === 0 ? 2 : 1}px solid ${d.color}`,
                                        animation: "districtPulse 3s ease-out infinite",
                                        animationDelay: `${DISTRICTS.findIndex(x => x.id === d.id) * 0.4 + delay}s`,
                                        transformOrigin: "center",
                                        transform: "translate(-50%,-50%)",
                                    }} />
                                ))}

                                {/* Icono */}
                                <div
                                    className="flex items-center justify-center rounded-full transition-all duration-200"
                                    style={{
                                        width: sz, height: sz,
                                        background: isHovered ? `rgba(4,7,16,0.95)` : "rgba(4,7,16,0.80)",
                                        border: `2px solid ${d.color}`,
                                        fontSize: "clamp(14px,2.2vw,22px)",
                                        boxShadow: isHovered
                                            ? `0 0 20px ${d.color}, 0 0 40px ${d.color}66, inset 0 0 10px rgba(0,0,0,0.6)`
                                            : `0 0 10px ${d.color}66, inset 0 0 8px rgba(0,0,0,0.5)`,
                                        transform: `translate(-50%,-50%) scale(${isHovered ? 1.12 : 1})`,
                                        transition: "all 0.2s ease",
                                    }}
                                >
                                    {d.icon}
                                </div>

                                {/* Nombre del distrito
                                    Mobile: always visible below the marker
                                    Desktop: visible siempre (los edificios son grandes y el nombre ayuda)
                                */}
                                <div
                                    className="absolute whitespace-nowrap font-display font-bold uppercase tracking-wider pointer-events-none"
                                    style={{
                                        top: "calc(50% + clamp(20px,2.5vw,30px))",
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        background: isHovered ? `rgba(4,7,16,0.95)` : "rgba(4,7,16,0.78)",
                                        border: `1px solid ${isHovered ? d.color : d.color + "66"}`,
                                        borderRadius: "6px",
                                        padding: "3px 10px",
                                        color: isHovered ? "#ffffff" : "rgba(232,240,254,0.85)",
                                        fontSize: "clamp(8px,0.95vw,12px)",
                                        boxShadow: isHovered ? `0 0 12px ${d.color}88` : "none",
                                        transition: "all 0.2s ease",
                                    }}
                                >
                                    {d.name}
                                </div>

                                {/* Description — desktop hover only */}
                                <div
                                    className="absolute whitespace-nowrap pointer-events-none hidden md:block"
                                    style={{
                                        top: "calc(50% + clamp(36px,4.2vw,50px))",
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        color: d.color,
                                        fontSize: "clamp(7px,0.75vw,10px)",
                                        fontFamily: "var(--font-sans)",
                                        opacity: isHovered ? 0.9 : 0,
                                        transition: "opacity 0.2s ease",
                                        textShadow: `0 0 8px ${d.color}`,
                                    }}
                                >
                                    {d.description}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Side arrow on mobile */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none md:hidden"
                    style={{ zIndex: 8, color: "rgba(232,240,254,0.25)", fontSize: "22px", animation: "arrowBob 1.5s ease-in-out infinite" }}>
                    ›
                </div>
            </div>

            {/* ── BARRA INFERIOR ── */}
            <div
                className="absolute bottom-0 left-0 right-0 flex items-center justify-around"
                style={{
                    zIndex: 20,
                    background: "linear-gradient(to top, rgba(4,7,16,0.95) 60%, transparent 100%)",
                    padding: "8px 8px 12px",
                    paddingBottom: "max(12px, env(safe-area-inset-bottom))",
                }}
            >
                {[
                    { icon: "📜", label: "Missions",  route: "/missions" },
                    { icon: "🎯", label: "Challenges",  route: "/challenges" },
                    { icon: "🏛️", label: "Sanctums",  route: "/sanctuaries" },
                    { icon: "👥", label: "Social",    route: "/tavern" },
                    { icon: "⚔️", label: "Battle",  route: "/battle", highlight: true },
                ].map(btn => (
                    <button
                        key={btn.route}
                        onClick={() => navigate(btn.route)}
                        className="flex flex-col items-center gap-1 transition-all active:scale-90"
                        style={{
                            background: btn.highlight
                                ? "linear-gradient(135deg, #e63946, #c1121f)"
                                : "transparent",
                            border: btn.highlight ? "none" : "none",
                            borderRadius: btn.highlight ? "12px" : "0",
                            padding: btn.highlight ? "8px 20px" : "4px 12px",
                            cursor: "pointer",
                            minWidth: "60px",
                        }}
                    >
                        <span style={{ fontSize: "clamp(18px,2.5vw,24px)" }}>{btn.icon}</span>
                        <span
                            className="font-display font-bold uppercase tracking-wider"
                            style={{
                                fontSize: "clamp(7px,0.75vw,10px)",
                                color: btn.highlight ? "#fff" : "rgba(232,240,254,0.55)",
                            }}
                        >
                            {btn.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
