import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useTrainer } from "../context/TrainerContext";
import { api } from "../lib/api";

// ─────────────────────────────────────────
// Datos de los 8 Sanctums
// px/py = posición 0-1 sobre la imagen del mapa
// AJUSTAR según la imagen real una vez desplegada
// ─────────────────────────────────────────

const SANCTUM_DATA = [
    {
        id: 0, name: "EMBER", icon: "🔥", color: "#ff6b35",
        requiredLevel: 5, biome: "Volcánico", guardian: "Ignar el Forjado",
        lore: "Llanuras de ceniza y ríos de lava ardiente. Ignar domina la llama y la destrucción pura.",
        px: 0.38, py: 0.52,
    },
    {
        id: 1, name: "TIDE", icon: "🌊", color: "#38bdf8",
        requiredLevel: 10, biome: "Costero", guardian: "Marina de las Profundidades",
        lore: "Costa neblinosa donde el mar y la tormenta se funden en olas eternas.",
        px: 0.18, py: 0.62,
    },
    {
        id: 2, name: "GROVE", icon: "🌿", color: "#4ade80",
        requiredLevel: 15, biome: "Forestal", guardian: "Sylvara la Ancestral",
        lore: "Bosque eterno donde los Myths más antiguos duermen entre raíces milenarias.",
        px: 0.72, py: 0.22,
    },
    {
        id: 3, name: "VOLT", icon: "⚡", color: "#facc15",
        requiredLevel: 20, biome: "Tormentoso", guardian: "Zarak el Tempestuoso",
        lore: "Meseta de las tormentas eternas. El rayo cae sin cesar desde hace siglos.",
        px: 0.62, py: 0.28,
    },
    {
        id: 4, name: "STONE", icon: "🪨", color: "#94a3b8",
        requiredLevel: 25, biome: "Rocoso", guardian: "Petra Ironwall",
        lore: "Cañones milenarios donde la roca misma tiene memoria de batallas antiguas.",
        px: 0.55, py: 0.45,
    },
    {
        id: 5, name: "SHADE", icon: "🌑", color: "#a78bfa",
        requiredLevel: 30, biome: "Corrupto", guardian: "Noxar el Desterrado",
        lore: "Tierras donde la luz no llega. Los Myths corrompidos esperan en la oscuridad.",
        px: 0.78, py: 0.68,
    },
    {
        id: 6, name: "FROST", icon: "❄️", color: "#bae6fd",
        requiredLevel: 35, biome: "Glacial", guardian: "Cryo el Eterno",
        lore: "Cumbres heladas donde el tiempo parece haberse detenido para siempre.",
        px: 0.22, py: 0.18,
    },
    {
        id: 7, name: "ASTRAL", icon: "✨", color: "#e879f9",
        requiredLevel: 40, biome: "Astral", guardian: "Voryn el Sin Forma",
        lore: "El Sanctum final. Un plano entre dimensiones donde solo los más fuertes sobreviven.",
        px: 0.48, py: 0.70,
    },
];

// URL del mapa real generado con ChatGPT + Tripo3D
const MAP_URL =
    "https://cdn.jsdelivr.net/gh/adcanoardev/mythara-assets@e36395adab28ecd23770629b143c8f9426eac800/maps/biomes_map.webp";

type SanctumDef = typeof SANCTUM_DATA[0];

// ─────────────────────────────────────────
// Hook: drag clampeado — imagen nunca deja huecos
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

    const clamp = useCallback((ox: number, oy: number) => {
        const c = containerRef.current;
        const m = mapRef.current;
        if (!c || !m) return { x: ox, y: oy };
        const minX = Math.min(0, c.offsetWidth  - m.offsetWidth);
        const minY = Math.min(0, c.offsetHeight - m.offsetHeight);
        return {
            x: Math.max(minX, Math.min(0, ox)),
            y: Math.max(minY, Math.min(0, oy)),
        };
    }, [containerRef, mapRef]);

    // Centrar el mapa al montar — offset inicial apunta al centro del continente
    const centered = useRef(false);
    useEffect(() => {
        const timer = setTimeout(() => {
            if (centered.current) return;
            const c = containerRef.current;
            const m = mapRef.current;
            if (!c || !m) return;
            centered.current = true;
            const cx = (c.offsetWidth  - m.offsetWidth)  / 2;
            const cy = (c.offsetHeight - m.offsetHeight) / 2;
            setOffset(prev => {
                const clamped = {
                    x: Math.max(Math.min(0, c.offsetWidth  - m.offsetWidth),  Math.min(0, cx)),
                    y: Math.max(Math.min(0, c.offsetHeight - m.offsetHeight), Math.min(0, cy)),
                };
                return clamped;
            });
        }, 80);
        return () => clearTimeout(timer);
    }, [containerRef, mapRef]);

    // Mouse
    const onMouseDown = useCallback((e: React.MouseEvent) => {
        dragging.current = true;
        didDrag.current  = false;
        startPos.current = { x: e.clientX, y: e.clientY };
        startOff.current = { ...offset };
    }, [offset]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragging.current) return;
            const dx = e.clientX - startPos.current.x;
            const dy = e.clientY - startPos.current.y;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
            setOffset(clamp(startOff.current.x + dx, startOff.current.y + dy));
        };
        const onUp = () => { dragging.current = false; };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup",   onUp);
        return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    }, [clamp]);

    // Touch
    const onTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length !== 1) return;
        dragging.current = true;
        didDrag.current  = false;
        startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        startOff.current = { ...offset };
    }, [offset]);

    useEffect(() => {
        const onMove = (e: TouchEvent) => {
            if (!dragging.current || e.touches.length !== 1) return;
            const dx = e.touches[0].clientX - startPos.current.x;
            const dy = e.touches[0].clientY - startPos.current.y;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
            setOffset(clamp(startOff.current.x + dx, startOff.current.y + dy));
        };
        const onEnd = () => { dragging.current = false; };
        window.addEventListener("touchmove", onMove, { passive: true });
        window.addEventListener("touchend",  onEnd);
        return () => { window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd); };
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

export default function SantuariosPage() {
    const { trainer } = useTrainer();
    const navigate    = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef       = useRef<HTMLDivElement>(null);

    const [sanctumClears, setSanctumClears] = useState<number[]>(new Array(8).fill(0));
    const [selected,  setSelected]  = useState<SanctumDef | null>(null);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [loading,   setLoading]   = useState(false);
    const [error,     setError]     = useState("");
    const [result,    setResult]    = useState<any>(null);
    const [hint,      setHint]      = useState(true);

    const binderLevel: number = (trainer as any)?.binderLevel ?? 1;
    const { offset, onMouseDown, onTouchStart, didDrag } = useMapDrag(containerRef, mapRef);

    useEffect(() => {
        const c = (trainer as any)?.sanctumClears;
        if (Array.isArray(c)) setSanctumClears(c);
    }, [trainer]);

    useEffect(() => {
        const fn = (e: KeyboardEvent) => { if (e.key === "Escape") closeSheet(); };
        window.addEventListener("keydown", fn);
        return () => window.removeEventListener("keydown", fn);
    }, []);

    function openSheet(z: SanctumDef) {
        if (didDrag.current) return;
        setSelected(z); setError(""); setResult(null); setHint(false);
        requestAnimationFrame(() => setSheetOpen(true));
    }
    function closeSheet() {
        setSheetOpen(false);
        setTimeout(() => setSelected(null), 280);
    }

    async function handleChallenge(sanctumId: number) {
        setError(""); setResult(null); setLoading(true);
        try {
            const party   = await api.getParty();
            const mythIds = party.map((m: any) => m.id).slice(0, 5);
            if (!mythIds.length) throw new Error("Necesitas al menos 1 Myth en tu equipo");
            const res = await api.challengeSanctum(sanctumId, mythIds);
            setResult(res);
            if (res.result === "WIN") {
                setSanctumClears(prev => {
                    const n = [...prev]; n[sanctumId] = (n[sanctumId] ?? 0) + 1; return n;
                });
            }
            if (res.battleId) { closeSheet(); navigate("/battle"); }
        } catch (e: any) {
            setError(e.message ?? "Error al iniciar el combate");
        } finally { setLoading(false); }
    }

    const isUnlocked = (z: SanctumDef) => binderLevel >= z.requiredLevel;
    const isCleared  = (z: SanctumDef) => (sanctumClears[z.id] ?? 0) > 0;
    const clearCount = (z: SanctumDef) => sanctumClears[z.id] ?? 0;

    return (
        <Layout>
            <style>{`
                @keyframes smPulse  { 0%{transform:translate(-50%,-50%) scale(.6);opacity:.8} 100%{transform:translate(-50%,-50%) scale(2.6);opacity:0} }
                @keyframes sheetUp  { from{transform:translateY(100%)} to{transform:translateY(0)} }
                @keyframes sheetDn  { from{transform:translateY(0)} to{transform:translateY(100%)} }
                @keyframes hintFade { 0%,100%{opacity:.32} 50%{opacity:.75} }
                @keyframes arrowBob { 0%,100%{transform:translateX(0)} 50%{transform:translateX(4px)} }
                .sm-grab  { cursor:grab; }
                .sm-grab:active { cursor:grabbing; }
                @media(min-width:768px){
                    .sm-sheet{
                        position:absolute!important;
                        bottom:auto!important; left:50%!important; right:auto!important;
                        top:50%!important; transform:translate(-50%,-50%)!important;
                        animation:none!important; border-radius:14px!important;
                        max-width:340px!important; width:100%!important;
                    }
                }
            `}</style>

            {/* Header */}
            <div className="flex-shrink-0 px-4 py-2.5 border-b border-border flex items-center justify-between">
                <h1 className="font-display font-bold text-lg tracking-widest">
                    🏛️ <span className="text-yellow">Santuarios</span>
                </h1>
                <div className="flex items-center gap-2">
                    {result && (
                        <span className={`px-2.5 py-1 rounded-xl border font-display font-bold text-xs
                            ${result.result === "WIN" ? "border-green/30 text-green bg-green/10" : "border-red/30 text-red bg-red/10"}`}>
                            {result.result === "WIN" ? "🏆 Victoria" : "💀 Derrota"}
                            {result.xpGained != null && <span className="text-muted font-normal ml-1.5">+{result.xpGained}XP</span>}
                        </span>
                    )}
                    <span className="px-2.5 py-1 rounded-xl border border-border bg-card font-display text-xs text-muted">
                        Lv <span className="text-yellow font-bold">{binderLevel}</span>
                    </span>
                </div>
            </div>

            {/* Mapa */}
            <div
                ref={containerRef}
                className="flex-1 relative overflow-hidden sm-grab select-none"
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
            >
                {/*
                    MAPA DRAGGABLE — garantía de no huecos:
                    - Desktop (>=768px): el mapa ocupa exactamente el 100% del contenedor
                      gracias a min-width:100% + min-height:100%.
                      Si el ratio no cuadra, object-fit:cover rellena.
                    - Móvil portrait: el mapa es más ancho (160vw) — el jugador arrastra
                      horizontalmente. El clamp impide ver el fondo negro.
                    El div #mapwrap solo se puede desplazar hasta donde el borde del mapa
                    coincida con el borde del contenedor → NUNCA hay hueco vacío.
                */}
                <div
                    ref={mapRef}
                    className="absolute top-0 left-0"
                    style={{
                        // Tamaño fijo del mapa — suficiente para ver todo el continente
                        // En pantallas grandes ocupa todo el contenedor (min 100%)
                        // En móvil es más ancho que la pantalla → draggable
                        width: "max(100%, 900px)",
                        minHeight: "100%",
                        aspectRatio: "4/3",
                        transform: `translate(${offset.x}px, ${offset.y}px)`,
                        willChange: "transform",
                        touchAction: "none",
                    }}
                >
                    {/* Imagen */}
                    <img
                        src={MAP_URL}
                        alt="Mapa de Mythara"
                        draggable={false}
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ objectFit: "cover", objectPosition: "center", userSelect: "none" }}
                    />

                    {/* Overlay oscuro sutil para legibilidad de markers */}
                    <div className="absolute inset-0 pointer-events-none"
                        style={{ background: "rgba(4,7,16,0.22)" }} />

                    {/* Vignette */}
                    <div className="absolute inset-0 pointer-events-none"
                        style={{ background: "radial-gradient(ellipse 88% 85% at 50% 50%, transparent 40%, rgba(4,7,16,0.78) 100%)" }} />

                    {/* Markers */}
                    {SANCTUM_DATA.map(z => {
                        const unlocked = isUnlocked(z);
                        const cleared  = isCleared(z);
                        const sz = "clamp(30px,4vw,46px)";
                        return (
                            <div key={z.id} className="absolute" style={{
                                left: `${z.px * 100}%`, top: `${z.py * 100}%`,
                                zIndex: 5, pointerEvents: "all",
                            }} onClick={() => openSheet(z)}>

                                {/* Pulse rings */}
                                {unlocked && [0, 0.85].map((d, ri) => (
                                    <div key={ri} className="absolute rounded-full pointer-events-none" style={{
                                        width: sz, height: sz, top: 0, left: 0,
                                        border: `${ri === 0 ? 1.5 : 1}px solid ${z.color}`,
                                        animation: "smPulse 2.8s ease-out infinite",
                                        animationDelay: `${z.id * 0.3 + d}s`,
                                        transformOrigin: "center",
                                        transform: "translate(-50%,-50%)",
                                    }} />
                                ))}

                                {/* Icono */}
                                <div className="flex items-center justify-center rounded-full" style={{
                                    width: sz, height: sz,
                                    background: "rgba(4,7,16,0.82)",
                                    border: `2px solid ${unlocked ? z.color : "rgba(255,255,255,0.12)"}`,
                                    fontSize: "clamp(12px,2vw,20px)",
                                    boxShadow: unlocked ? `0 0 16px ${z.color}99, inset 0 0 8px rgba(0,0,0,0.6)` : "none",
                                    opacity: unlocked ? 1 : 0.25,
                                    filter: unlocked ? "none" : "grayscale(1)",
                                    position: "relative",
                                    transform: "translate(-50%,-50%)",
                                    cursor: "pointer",
                                    transition: "box-shadow .2s",
                                }}>
                                    {z.icon}
                                    {cleared && unlocked && (
                                        <div className="absolute flex items-center justify-center rounded-full font-bold" style={{
                                            bottom: "-3px", right: "-3px",
                                            width: "clamp(10px,1.2vw,14px)", height: "clamp(10px,1.2vw,14px)",
                                            background: "#4ade80", border: "2px solid #020810",
                                            fontSize: "clamp(6px,.6vw,8px)", color: "#020810", zIndex: 2,
                                        }}>✓</div>
                                    )}
                                </div>

                                {/* Badge nivel */}
                                <div className="absolute font-bold pointer-events-none whitespace-nowrap" style={{
                                    top: "calc(-50% - 13px)", left: "50%",
                                    transform: "translateX(-50%)",
                                    background: "rgba(4,7,16,0.88)",
                                    border: "1px solid rgba(255,255,255,0.18)",
                                    borderRadius: "8px", padding: "1px 5px",
                                    fontSize: "clamp(7px,.7vw,9px)",
                                    color: unlocked ? "rgba(232,240,254,.55)" : "rgba(232,240,254,.2)",
                                }}>Lv{z.requiredLevel}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Hint arrastrar */}
                {hint && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none font-display uppercase tracking-widest text-center"
                        style={{ zIndex: 8, color: "rgba(232,240,254,.3)", fontSize: "clamp(7px,.72vw,10px)", animation: "hintFade 3s ease-in-out infinite" }}>
                        Arrastra para explorar · Toca un sanctum
                    </div>
                )}

                {/* Flecha lateral — indica que hay más mapa a la derecha en móvil */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none md:hidden"
                    style={{ zIndex: 8, color: "rgba(232,240,254,.3)", fontSize: "22px", animation: "arrowBob 1.5s ease-in-out infinite" }}>
                    ›
                </div>

                {/* Bottom sheet / modal */}
                {selected && (
                    <>
                        <div className="absolute inset-0 transition-opacity duration-300"
                            style={{ zIndex: 10, background: "rgba(4,7,16,.65)", backdropFilter: "blur(6px)", opacity: sheetOpen ? 1 : 0 }}
                            onClick={closeSheet} />

                        <div className="absolute left-0 right-0 bottom-0 sm-sheet" style={{
                            zIndex: 11,
                            animation: sheetOpen ? "sheetUp .28s cubic-bezier(.34,1.2,.64,1) forwards" : "sheetDn .22s ease-in forwards",
                            background: "#0b1324",
                            borderTop: `2px solid ${selected.color}`,
                            borderRadius: "16px 16px 0 0",
                            boxShadow: `0 -8px 40px ${selected.color}33, 0 -2px 60px rgba(0,0,0,.6)`,
                            overflow: "hidden", position: "relative",
                        }}>
                            {/* Handle */}
                            <div className="flex justify-center pt-3 pb-1 md:hidden">
                                <div className="rounded-full" style={{ width: "36px", height: "4px", background: "rgba(255,255,255,.2)" }} />
                            </div>

                            <button onClick={closeSheet} className="absolute top-3 right-3 bg-transparent border-none"
                                style={{ color: "rgba(232,240,254,.25)", fontSize: "16px", cursor: "pointer", lineHeight: 1 }}>✕</button>

                            {/* Header sheet */}
                            <div className="flex items-center gap-3 border-b border-white/[0.07]" style={{ padding: "12px 16px" }}>
                                <div className="flex-shrink-0 flex items-center justify-center rounded-full" style={{
                                    width: "48px", height: "48px",
                                    background: "rgba(4,7,16,.85)",
                                    border: `2px solid ${selected.color}`,
                                    fontSize: "22px",
                                    boxShadow: `0 0 18px ${selected.color}55`,
                                }}>{selected.icon}</div>
                                <div>
                                    <div className="font-display font-bold text-white text-base">Sanctum {selected.name}</div>
                                    <div className="text-white/40 text-xs mt-0.5">Bioma {selected.biome} · Nivel {selected.requiredLevel} requerido</div>
                                </div>
                            </div>

                            {/* Body sheet */}
                            <div className="px-4 py-3">
                                <p className="italic text-xs leading-relaxed mb-3" style={{
                                    color: "rgba(232,240,254,.55)", paddingLeft: "9px", borderLeft: `2px solid ${selected.color}`,
                                }}>{selected.lore}</p>

                                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
                                    {[
                                        ["Entrenador", selected.guardian],
                                        ["Formato",    "3 rondas · 1v1"],
                                        ["Tu equipo",  "5 Myths · máx. 2 cambios"],
                                        ["Curación",   "⚠ No entre rondas"],
                                        ["Victorias",  `${clearCount(selected)} victoria${clearCount(selected) !== 1 ? "s" : ""}`],
                                    ].map(([k, v]) => (
                                        <div key={k} className="flex flex-col">
                                            <span className="text-white/30 text-xs">{k}</span>
                                            <span className="font-bold text-xs" style={{
                                                color: k === "Victorias" && clearCount(selected) > 0 ? "#4ade80"
                                                     : k === "Curación" ? "#f87171" : "#e8f0fe",
                                            }}>{v}</span>
                                        </div>
                                    ))}
                                </div>

                                {error && <div className="mb-2 text-xs text-center font-display" style={{ color: "#f87171" }}>❌ {error}</div>}

                                {result && (
                                    <div className={`mb-2 text-center text-sm font-bold font-display py-1.5 rounded-lg
                                        ${result.result === "WIN" ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"}`}>
                                        {result.result === "WIN"
                                            ? `🏆 Victoria · +${result.xpGained}XP · +${result.goldGained}🪙`
                                            : `💀 Derrota · +${result.xpGained}XP`}
                                    </div>
                                )}

                                <div className="pb-safe">
                                    {isUnlocked(selected) ? (
                                        <button onClick={() => handleChallenge(selected.id)} disabled={loading}
                                            className="w-full font-display font-bold uppercase tracking-widest text-sm py-3 rounded-xl transition-all disabled:opacity-50 active:scale-95"
                                            style={{ background: selected.color, color: "#020810", border: "none", cursor: loading ? "not-allowed" : "pointer" }}>
                                            {loading ? "Cargando..." : "⚔️  RETAR AL SANCTUM"}
                                        </button>
                                    ) : (
                                        <button disabled className="w-full font-display font-bold uppercase tracking-widest text-sm py-3 rounded-xl"
                                            style={{ background: "rgba(255,255,255,.05)", color: "rgba(232,240,254,.22)", border: "1px solid rgba(255,255,255,.08)", cursor: "not-allowed" }}>
                                            🔒 Nivel {selected.requiredLevel} requerido
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}
