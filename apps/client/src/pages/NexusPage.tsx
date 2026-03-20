// apps/client/src/pages/NexusPage.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import PageTopbar from "../components/PageTopbar";
import { api } from "../lib/api";

// ─── Types ────────────────────────────────────────────────────

type Rarity = "COMMON" | "RARE" | "EPIC" | "ELITE" | "LEGENDARY" | "MYTHIC";
interface PityData { essences: number; pityRare: number; pityEpic: number; pityElite: number; pityLegendary: number; }
interface PullResult { speciesId: string; name: string; rarity: Rarity; affinities: string[]; level: number; maxHp: number; attack: number; defense: number; speed: number; instanceId: string; isPityGuarantee: boolean; moves?: { name: string; power?: number; cooldown: number; affinity: string; }[]; }

// ─── Rarity config ────────────────────────────────────────────

const RS: Record<Rarity, { color: string; border: string; bg: string; glow: string; bgR: string; label: string; p: string; hex: number; panelBg: string }> = {
    COMMON:    { color: "var(--rarity-common-color)",    border: "var(--rarity-common-border)",    bg: "var(--rarity-common-bg)",    glow: "var(--rarity-common-glow)",    bgR: "var(--rarity-common-bgR)",    label: "Common",    p: "#94a3b8", hex: 0x94a3b8, panelBg: "var(--rarity-common-panel)"    },
    RARE:      { color: "var(--rarity-rare-color)",      border: "var(--rarity-rare-border)",      bg: "var(--rarity-rare-bg)",      glow: "var(--rarity-rare-glow)",      bgR: "var(--rarity-rare-bgR)",      label: "Rare",      p: "#818cf8", hex: 0x6366f1, panelBg: "var(--rarity-rare-panel)"      },
    EPIC:      { color: "var(--rarity-epic-color)",      border: "var(--rarity-epic-border)",      bg: "var(--rarity-epic-bg)",      glow: "var(--rarity-epic-glow)",      bgR: "var(--rarity-epic-bgR)",      label: "Epic",      p: "#c084fc", hex: 0xa855f7, panelBg: "var(--rarity-epic-panel)"      },
    ELITE:     { color: "var(--rarity-elite-color)",     border: "var(--rarity-elite-border)",     bg: "var(--rarity-elite-bg)",     glow: "var(--rarity-elite-glow)",     bgR: "var(--rarity-elite-bgR)",     label: "Elite",     p: "#fb923c", hex: 0xfb923c, panelBg: "var(--rarity-elite-panel)"     },
    LEGENDARY: { color: "var(--rarity-legendary-color)", border: "var(--rarity-legendary-border)", bg: "var(--rarity-legendary-bg)", glow: "var(--rarity-legendary-glow)", bgR: "var(--rarity-legendary-bgR)", label: "Legendary", p: "#fbbf24", hex: 0xfbbf24, panelBg: "var(--rarity-legendary-panel)" },
    MYTHIC:    { color: "var(--rarity-mythic-color)",    border: "var(--rarity-mythic-border)",    bg: "var(--rarity-mythic-bg)",    glow: "var(--rarity-mythic-glow)",    bgR: "var(--rarity-mythic-bgR)",    label: "Mythic",    p: "#f87171", hex: 0xf87171, panelBg: "var(--rarity-mythic-panel)"    },
};

const PITY_KEYS = [
    { key: "pityRare",      label: "Rare",      color: "#6366f1", max: 10  },
    { key: "pityEpic",      label: "Epic",      color: "#a855f7", max: 30  },
    { key: "pityElite",     label: "Elite",     color: "#94a3b8", max: 100 },
    { key: "pityLegendary", label: "Legendary", color: "#fbbf24", max: 150 },
];

const CDN = "https://cdn.jsdelivr.net/gh/adcanoardev/mythara-assets@7613486785dc2b2089f6d345e1281e9316c1d982";
const SPARKLES = [
    { top: "14%", left: "10%", fs: 10, delay: "0.2s" },
    { top: "22%", left: "76%", fs: 7,  delay: "0.8s" },
    { top: "10%", left: "62%", fs: 12, delay: "1.3s" },
    { top: "32%", left: "6%",  fs: 6,  delay: "0.5s" },
];

function mythFrontUrl(id: string, slug: string) { return `${CDN}/myths/${id}/${slug}_front.png`; }
function affinityUrl(a: string) { return `${CDN}/affinity/${a}_affinity_icon.webp`; }
function toSlug(s: string) { return s.toLowerCase().replace(/\s+/g, "_"); }

// ─── Three.js loader ──────────────────────────────────────────

let _threeP: Promise<any> | null = null;
function loadThree(): Promise<any> {
    if ((window as any).THREE) return Promise.resolve((window as any).THREE);
    if (_threeP) return _threeP;
    _threeP = new Promise(res => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
        s.onload = () => res((window as any).THREE);
        document.head.appendChild(s);
    });
    return _threeP;
}

// ─── Three.js Fullscreen Burst ────────────────────────────────

function FullScreenBurst({ color, onDone, x, y }: { color: number; onDone: () => void; x?: number; y?: number }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        let mounted = true;
        loadThree().then((THREE) => {
            if (!mounted || !canvasRef.current) return;
            const canvas = canvasRef.current;
            const W = window.innerWidth, H = window.innerHeight;
            canvas.width = W; canvas.height = H;
            canvas.style.width = W + "px"; canvas.style.height = H + "px";
            const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
            renderer.setSize(W, H, false);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setClearColor(0x000000, 0);
            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000);
            camera.position.z = 5;

            // Offset para centrar el burst en la posición del cristal
            const offsetX = x !== undefined ? ((x - W / 2) / W) * 10 : 0;
            const offsetY = y !== undefined ? -((y - H / 2) / H) * 8 : 0;

            const threeColor = new THREE.Color(color);
            const count = 320;
            const geo = new THREE.BufferGeometry();
            const pos = new Float32Array(count * 3);
            const vel: { x: number; y: number; z: number }[] = [];
            for (let i = 0; i < count; i++) {
                const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.5) * Math.PI;
                const spd = 0.05 + Math.random() * 0.15;
                vel.push({ x: Math.cos(a) * Math.cos(e) * spd, y: Math.sin(e) * spd, z: Math.sin(a) * Math.cos(e) * spd * 0.3 });
                pos[i * 3] = offsetX; pos[i * 3 + 1] = offsetY; pos[i * 3 + 2] = 0;
            }
            geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
            const mat = new THREE.PointsMaterial({ color: threeColor, size: 0.1, transparent: true, opacity: 1 });
            scene.add(new THREE.Points(geo, mat));
            const rings: any[] = [];
            for (let r = 0; r < 6; r++) {
                const rGeo = new THREE.RingGeometry(0.08 + r * 0.45, 0.1 + r * 0.45, 72);
                const rMat = new THREE.MeshBasicMaterial({ color: r % 2 === 0 ? threeColor : new THREE.Color(0xffffff), side: THREE.DoubleSide, transparent: true, opacity: 0.8 - r * 0.08 });
                const ring = new THREE.Mesh(rGeo, rMat);
                ring.position.x = offsetX; ring.position.y = offsetY;
                ring.rotation.x = Math.random() * Math.PI; ring.rotation.y = Math.random() * Math.PI;
                scene.add(ring);
                rings.push({ mesh: ring, speed: 0.005 + r * 0.003 });
            }
            const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
            const flash = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), flashMat);
            flash.position.x = offsetX; flash.position.y = offsetY;
            scene.add(flash);
            let frame = 0;
            let raf: number;
            function animate() {
                if (!mounted) return;
                raf = requestAnimationFrame(animate);
                frame++;
                flashMat.opacity = Math.max(0, 0.9 - frame * 0.06);
                const arr = geo.attributes.position.array as Float32Array;
                for (let i = 0; i < count; i++) { arr[i*3]+=vel[i].x; arr[i*3+1]+=vel[i].y; arr[i*3+2]+=vel[i].z; vel[i].y -= 0.001; }
                geo.attributes.position.needsUpdate = true;
                mat.opacity = Math.max(0, mat.opacity - 0.007);
                rings.forEach(({ mesh, speed }) => {
                    mesh.rotation.z += speed; mesh.rotation.x += speed * 0.7;
                    mesh.scale.setScalar(1 + frame * 0.055);
                    mesh.material.opacity = Math.max(0, mesh.material.opacity - 0.012);
                });
                renderer.render(scene, camera);
                if (frame > 120) { mounted = false; cancelAnimationFrame(raf); renderer.dispose(); onDone(); }
            }
            animate();
        });
        return () => { mounted = false; };
    }, [color, x, y]);
    return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", pointerEvents: "none", zIndex: 290, background: "transparent" }} />;
}

// ─── CSS particles ────────────────────────────────────────────

function cssParticles(c: HTMLElement, color: string, n = 22) {
    for (let i = 0; i < n; i++) {
        const p = document.createElement("div");
        const a = (i / n) * Math.PI * 2, d = 55 + Math.random() * 90, sz = 2 + Math.random() * 5;
        Object.assign(p.style, {
            position: "absolute", width: `${sz}px`, height: `${sz}px`,
            background: color, top: "50%", left: "50%", pointerEvents: "none", zIndex: "15",
            clipPath: i % 3 === 0 ? "polygon(50% 0%,100% 50%,50% 100%,0% 50%)" : undefined,
            borderRadius: i % 3 === 0 ? undefined : "50%",
            animation: `nxPart ${0.5 + Math.random() * 0.7}s ease-out ${Math.random() * 0.1}s both`,
            ["--tx" as any]: `${Math.cos(a) * d}px`, ["--ty" as any]: `${Math.sin(a) * d}px`,
        });
        c.appendChild(p); setTimeout(() => p.remove(), 1500);
    }
}

// ─── Essence: fragmento 3D blanco/lila con partículas orbitales ──

// ─── Essence Orb — fuego lila orgánico, pura energía ─────────

function EssenceFragment({ size }: { size: number }) {
    const s = size;
    const cx = s / 2;
    // Base del fuego — parte baja centrada
    const baseY = s * 0.82;
    const baseW = s * 0.28;

    // Embers que ascienden
    const embers = Array.from({ length: 16 }, (_, i) => ({
        x: cx + (Math.sin(i * 2.1) * s * 0.18),
        sz: 1.4 + (i % 4) * 0.9,
        dur: `${2.8 + (i % 5) * 0.7}s`,
        delay: `${-(i * 0.45)}s`,
        color: i % 3 === 0 ? "#ffffff" : i % 3 === 1 ? "#d8b4fe" : "#a78bfa",
        drift: Math.sin(i * 0.9) * s * 0.12,
    }));

    return (
        <div style={{ position: "relative", width: s, height: s * 1.4, flexShrink: 0 }}>

            {/* Corona de glow difusa debajo */}
            <div style={{
                position: "absolute",
                bottom: s * 0.05, left: "50%", transform: "translateX(-50%)",
                width: s * 1.1, height: s * 0.55,
                background: "radial-gradient(ellipse at 50% 80%, rgba(123,47,255,0.28) 0%, rgba(167,139,250,0.1) 45%, transparent 70%)",
                filter: "blur(14px)",
                pointerEvents: "none",
                animation: "nxGlow 2.2s ease-in-out infinite",
            }} />

            <svg viewBox={`0 0 ${s} ${s * 1.4}`}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
                <defs>
                    {/* Gradiente principal del fuego — blanco caliente en base, violeta/púrpura hacia arriba */}
                    <linearGradient id="efFire" x1="50%" y1="100%" x2="50%" y2="0%" gradientUnits="userSpaceOnUse"
                        x1="0" y1={baseY} x2="0" y2={s * 0.05}>
                        <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.98" />
                        <stop offset="12%"  stopColor="#f0e6ff" stopOpacity="0.95" />
                        <stop offset="30%"  stopColor="#c084fc" stopOpacity="0.9" />
                        <stop offset="55%"  stopColor="#9333ea" stopOpacity="0.8" />
                        <stop offset="78%"  stopColor="#6b21a8" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="#3b0764" stopOpacity="0" />
                    </linearGradient>

                    {/* Gradiente llama izquierda */}
                    <linearGradient id="efFireL" x1="0" y1={baseY} x2="0" y2={s * 0.18} gradientUnits="userSpaceOnUse">
                        <stop offset="0%"   stopColor="#e9d5ff" stopOpacity="0.85" />
                        <stop offset="45%"  stopColor="#a855f7" stopOpacity="0.65" />
                        <stop offset="100%" stopColor="#581c87" stopOpacity="0" />
                    </linearGradient>

                    {/* Gradiente llama derecha */}
                    <linearGradient id="efFireR" x1="0" y1={baseY} x2="0" y2={s * 0.22} gradientUnits="userSpaceOnUse">
                        <stop offset="0%"   stopColor="#ddd6fe" stopOpacity="0.8" />
                        <stop offset="50%"  stopColor="#7c3aed" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="#4c1d95" stopOpacity="0" />
                    </linearGradient>

                    <filter id="efSoft" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="2.5" />
                    </filter>
                    <filter id="efGlow" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur stdDeviation="5" result="b"/>
                        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id="efEmber">
                        <feGaussianBlur stdDeviation="0.7" />
                    </filter>
                </defs>

                {/* ── Cuerpo del fuego izquierdo (llama lateral) ── */}
                <path d={`
                    M ${cx - baseW * 0.6} ${baseY}
                    C ${cx - baseW * 1.8} ${baseY - s * 0.22},
                      ${cx - baseW * 1.4} ${baseY - s * 0.5},
                      ${cx - baseW * 0.5} ${baseY - s * 0.72}
                    C ${cx - baseW * 0.1} ${baseY - s * 0.55},
                      ${cx - baseW * 0.3} ${baseY - s * 0.18},
                      ${cx - baseW * 0.6} ${baseY} Z
                `} fill="url(#efFireL)" filter="url(#efSoft)">
                    <animateTransform attributeName="transform" type="skewX"
                        values="-4;6;-8;3;-4" dur="4.8s" repeatCount="indefinite" additive="sum"
                        style={{transformOrigin:`${cx}px ${baseY}px`}}/>
                    <animate attributeName="opacity" values="0.75;0.9;0.6;0.85;0.75" dur="4.8s" repeatCount="indefinite" />
                </path>

                {/* ── Cuerpo del fuego derecho (llama lateral) ── */}
                <path d={`
                    M ${cx + baseW * 0.6} ${baseY}
                    C ${cx + baseW * 1.8} ${baseY - s * 0.2},
                      ${cx + baseW * 1.5} ${baseY - s * 0.48},
                      ${cx + baseW * 0.6} ${baseY - s * 0.65}
                    C ${cx + baseW * 0.15} ${baseY - s * 0.5},
                      ${cx + baseW * 0.25} ${baseY - s * 0.16},
                      ${cx + baseW * 0.6} ${baseY} Z
                `} fill="url(#efFireR)" filter="url(#efSoft)">
                    <animateTransform attributeName="transform" type="skewX"
                        values="5;-6;9;-2;5" dur="4.2s" repeatCount="indefinite" additive="sum"
                        style={{transformOrigin:`${cx}px ${baseY}px`}}/>
                    <animate attributeName="opacity" values="0.7;0.85;0.55;0.8;0.7" dur="4.2s" repeatCount="indefinite" />
                </path>

                {/* ── Llama trasera grande y difusa ── */}
                <path d={`
                    M ${cx - baseW} ${baseY}
                    C ${cx - baseW * 1.5} ${baseY - s * 0.3},
                      ${cx - baseW * 0.8} ${baseY - s * 0.75},
                      ${cx} ${baseY - s * 1.05}
                    C ${cx + baseW * 0.8} ${baseY - s * 0.75},
                      ${cx + baseW * 1.5} ${baseY - s * 0.3},
                      ${cx + baseW} ${baseY} Z
                `} fill="url(#efFire)" filter="url(#efSoft)" opacity="0.6">
                    <animateTransform attributeName="transform" type="scale"
                        values="1 1;0.88 1.08;1.06 0.95;0.91 1.06;1 1"
                        dur="5.5s" repeatCount="indefinite" additive="sum"
                        style={{transformOrigin:`${cx}px ${baseY}px`}}/>
                </path>

                {/* ── Llama central principal — la más viva ── */}
                <path d={`
                    M ${cx - baseW * 0.85} ${baseY}
                    C ${cx - baseW * 1.1} ${baseY - s * 0.28},
                      ${cx - baseW * 0.55} ${baseY - s * 0.68},
                      ${cx - baseW * 0.08} ${baseY - s * 0.98}
                    C ${cx + baseW * 0.08} ${baseY - s * 1.0},
                      ${cx + baseW * 0.6} ${baseY - s * 0.65},
                      ${cx + baseW * 1.05} ${baseY - s * 0.25}
                    C ${cx + baseW * 1.3} ${baseY - s * 0.1},
                      ${cx + baseW * 0.95} ${baseY},
                      ${cx - baseW * 0.85} ${baseY} Z
                `} fill="url(#efFire)" filter="url(#efGlow)">
                    <animateTransform attributeName="transform" type="scale"
                        values="1 1;0.84 1.12;1.08 0.93;0.88 1.09;1 1"
                        dur="3.8s" repeatCount="indefinite" additive="sum"
                        style={{transformOrigin:`${cx}px ${baseY}px`}}/>
                    <animate attributeName="opacity" values="0.92;1;0.78;0.96;0.92" dur="3.8s" repeatCount="indefinite" />
                </path>

                {/* ── Punta de llama secundaria (tip) ── */}
                <path d={`
                    M ${cx - baseW * 0.35} ${baseY - s * 0.72}
                    C ${cx - baseW * 0.15} ${baseY - s * 0.88},
                      ${cx + baseW * 0.1} ${baseY - s * 1.02},
                      ${cx} ${baseY - s * 1.18}
                    C ${cx - baseW * 0.05} ${baseY - s * 1.0},
                      ${cx + baseW * 0.18} ${baseY - s * 0.84},
                      ${cx + baseW * 0.38} ${baseY - s * 0.7}
                    C ${cx + baseW * 0.15} ${baseY - s * 0.6},
                      ${cx - baseW * 0.1} ${baseY - s * 0.62},
                      ${cx - baseW * 0.35} ${baseY - s * 0.72} Z
                `} fill="url(#efFire)">
                    <animateTransform attributeName="transform" type="scale"
                        values="1 1;0.78 1.16;1.12 0.88;0.82 1.14;1 1"
                        dur="3.0s" repeatCount="indefinite" additive="sum"
                        style={{transformOrigin:`${cx}px ${baseY - s * 0.7}px`}}/>
                    <animate attributeName="opacity" values="0.85;1;0.65;0.95;0.85" dur="3.0s" repeatCount="indefinite" />
                </path>

                {/* ── Núcleo brillante en la base ── */}
                <ellipse cx={cx} cy={baseY - s * 0.08} rx={baseW * 0.7} ry={s * 0.1}
                    fill="rgba(255,255,255,0.92)" filter="url(#efSoft)">
                    <animate attributeName="opacity" values="0.8;1;0.65;0.95;0.8" dur="3.2s" repeatCount="indefinite" />
                    <animate attributeName="ry" values={`${s*0.1};${s*0.13};${s*0.09};${s*0.12};${s*0.1}`} dur="3.2s" repeatCount="indefinite" />
                </ellipse>

                {/* ── Embers ascendentes ── */}
                {embers.map((e, i) => (
                    <circle key={i} cx={e.x} cy={baseY - s * 0.05} r={e.sz}
                        fill={e.color} filter="url(#efEmber)">
                        <animate attributeName="cy"
                            values={`${baseY - s*0.05};${baseY - s*0.05 - s*(0.7 + (i%3)*0.35)}`}
                            dur={e.dur} begin={e.delay} repeatCount="indefinite" />
                        <animate attributeName="cx"
                            values={`${e.x};${e.x + e.drift};${e.x + e.drift * 0.5}`}
                            dur={e.dur} begin={e.delay} repeatCount="indefinite" />
                        <animate attributeName="opacity"
                            values={`0.9;0.6;0`}
                            dur={e.dur} begin={e.delay} repeatCount="indefinite" />
                        <animate attributeName="r"
                            values={`${e.sz};${e.sz * 0.6};0`}
                            dur={e.dur} begin={e.delay} repeatCount="indefinite" />
                    </circle>
                ))}
            </svg>
        </div>
    );
}

// ─── Mini Essence Fire x5 ────────────────────────────────────

function MiniFragment({ dim }: { dim: boolean }) {
    const s = 72, cx = 36, baseY = 62, baseW = 10;
    return (
        <svg viewBox="0 0 72 96" width={72} height={96} style={{ display: "block", overflow: "visible", opacity: dim ? 0.25 : 1, transition: "opacity 0.5s" }}>
            <defs>
                <linearGradient id="mfFire" x1="0" y1={baseY} x2="0" y2="8" gradientUnits="userSpaceOnUse">
                    <stop offset="0%"   stopColor="#ffffff" stopOpacity={dim ? "0.3" : "0.98"} />
                    <stop offset="20%"  stopColor="#e9d5ff" stopOpacity={dim ? "0.15" : "0.92"} />
                    <stop offset="50%"  stopColor="#a855f7" stopOpacity={dim ? "0.08" : "0.78"} />
                    <stop offset="80%"  stopColor="#6b21a8" stopOpacity={dim ? "0.04" : "0.45"} />
                    <stop offset="100%" stopColor="#3b0764" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="mfSide" x1="0" y1={baseY} x2="0" y2="20" gradientUnits="userSpaceOnUse">
                    <stop offset="0%"   stopColor="#ddd6fe" stopOpacity={dim ? "0.15" : "0.8"} />
                    <stop offset="100%" stopColor="#581c87" stopOpacity="0" />
                </linearGradient>
                <filter id="mfGl" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.5" result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="mfSoft"><feGaussianBlur stdDeviation="1.5"/></filter>
            </defs>

            {/* Llama lateral izquierda */}
            {!dim && <path d={`M ${cx-baseW*0.5} ${baseY} C ${cx-baseW*1.8} ${baseY-20} ${cx-baseW*1.4} ${baseY-44} ${cx-baseW*0.4} ${baseY-58} C ${cx-baseW*0.1} ${baseY-44} ${cx-baseW*0.3} ${baseY-18} ${cx-baseW*0.5} ${baseY} Z`}
                fill="url(#mfSide)" filter="url(#mfSoft)" opacity="0.7">
                <animate attributeName="opacity" values="0.6;0.85;0.5;0.75;0.6" dur="2s" repeatCount="indefinite"/>
            </path>}

            {/* Llama lateral derecha */}
            {!dim && <path d={`M ${cx+baseW*0.5} ${baseY} C ${cx+baseW*1.8} ${baseY-18} ${cx+baseW*1.5} ${baseY-42} ${cx+baseW*0.5} ${baseY-55} C ${cx+baseW*0.1} ${baseY-42} ${cx+baseW*0.2} ${baseY-16} ${cx+baseW*0.5} ${baseY} Z`}
                fill="url(#mfSide)" filter="url(#mfSoft)" opacity="0.65">
                <animate attributeName="opacity" values="0.55;0.8;0.45;0.7;0.55" dur="1.8s" repeatCount="indefinite"/>
            </path>}

            {/* Llama central */}
            <path d={`M ${cx-baseW} ${baseY} C ${cx-baseW*1.3} ${baseY-24} ${cx-baseW*0.6} ${baseY-58} ${cx} ${baseY-76} C ${cx+baseW*0.6} ${baseY-58} ${cx+baseW*1.3} ${baseY-24} ${cx+baseW} ${baseY} Z`}
                fill="url(#mfFire)" filter={dim ? undefined : "url(#mfGl)"}>
                {!dim && <><animateTransform attributeName="transform" type="scale"
                    values="1 1;0.82 1.12;1.1 0.92;0.86 1.1;1 1"
                    dur="1.6s" repeatCount="indefinite" additive="sum"
                    style={{transformOrigin:`${cx}px ${baseY}px`}}/>
                <animate attributeName="opacity" values="0.9;1;0.75;0.95;0.9" dur="1.6s" repeatCount="indefinite"/></>}
            </path>

            {/* Punta de llama tip */}
            {!dim && <path d={`M ${cx-baseW*0.3} ${baseY-58} C ${cx-baseW*0.1} ${baseY-68} ${cx+baseW*0.05} ${baseY-78} ${cx} ${baseY-88} C ${cx-baseW*0.05} ${baseY-76} ${cx+baseW*0.12} ${baseY-66} ${cx+baseW*0.35} ${baseY-57} C ${cx+baseW*0.1} ${baseY-52} ${cx-baseW*0.1} ${baseY-54} ${cx-baseW*0.3} ${baseY-58} Z`}
                fill="url(#mfFire)">
                <animateTransform attributeName="transform" type="scale"
                    values="1 1;0.7 1.18;1.15 0.85;0.75 1.15;1 1"
                    dur="1.2s" repeatCount="indefinite" additive="sum"
                    style={{transformOrigin:`${cx}px ${baseY-60}px`}}/>
            </path>}

            {/* Núcleo brillante base */}
            <ellipse cx={cx} cy={baseY-6} rx={baseW*0.75} ry={7}
                fill={dim ? "rgba(200,180,255,0.3)" : "rgba(255,255,255,0.9)"} filter="url(#mfSoft)">
                {!dim && <animate attributeName="opacity" values="0.8;1;0.65;0.95;0.8" dur="1.3s" repeatCount="indefinite"/>}
            </ellipse>

            {/* Embers mini */}
            {!dim && [0,1,2].map(i => (
                <circle key={i} cx={cx + Math.sin(i*1.8)*baseW*0.7} cy={baseY-8} r={1.1+i*0.5}
                    fill={i===0?"#ffffff":"#d8b4fe"}>
                    <animate attributeName="cy" values={`${baseY-8};${baseY-8-28-i*14}`} dur={`${1.0+i*0.28}s`} begin={`${-i*0.25}s`} repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.9;0" dur={`${1.0+i*0.28}s`} begin={`${-i*0.25}s`} repeatCount="indefinite"/>
                    <animate attributeName="r" values={`${1.1+i*0.5};0`} dur={`${1.0+i*0.28}s`} begin={`${-i*0.25}s`} repeatCount="indefinite"/>
                </circle>
            ))}
        </svg>
    );
}

// ─── Essence Icon — mini fuego reutilizable ───────────────────

function EssenceIcon({ size = 18, style }: { size?: number; style?: React.CSSProperties }) {
    const cx = size / 2, baseY = size * 0.88, baseW = size * 0.16;
    return (
        <svg viewBox={`0 0 ${size} ${size * 1.2}`} width={size} height={size * 1.2}
            style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
            overflow="visible">
            <defs>
                <linearGradient id={`efIcon${size}`} x1="0" y1={baseY} x2="0" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%"  stopColor="#ffffff" stopOpacity="0.98" />
                    <stop offset="25%" stopColor="#e9d5ff" stopOpacity="0.94" />
                    <stop offset="55%" stopColor="#a855f7" stopOpacity="0.82" />
                    <stop offset="85%" stopColor="#6b21a8" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#3b0764" stopOpacity="0" />
                </linearGradient>
                <filter id={`efIconGl${size}`} x="-60%" y="-60%" width="220%" height="220%">
                    <feGaussianBlur stdDeviation={size * 0.06} result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
            </defs>
            {/* Llama lateral izquierda */}
            <path d={`M ${cx-baseW*0.4} ${baseY} C ${cx-baseW*1.5} ${baseY-size*0.35} ${cx-baseW*1.1} ${baseY-size*0.72} ${cx-baseW*0.2} ${baseY-size*0.88} C ${cx} ${baseY-size*0.72} ${cx-baseW*0.2} ${baseY-size*0.3} ${cx-baseW*0.4} ${baseY} Z`}
                fill={`url(#efIcon${size})`} opacity="0.55">
                <animateTransform attributeName="transform" type="skewX" values="-5;5;-5" dur="2s" repeatCount="indefinite" additive="sum" style={{transformOrigin:`${cx}px ${baseY}px`}}/>
            </path>
            {/* Llama lateral derecha */}
            <path d={`M ${cx+baseW*0.4} ${baseY} C ${cx+baseW*1.5} ${baseY-size*0.32} ${cx+baseW*1.2} ${baseY-size*0.68} ${cx+baseW*0.2} ${baseY-size*0.85} C ${cx} ${baseY-size*0.68} ${cx+baseW*0.2} ${baseY-size*0.28} ${cx+baseW*0.4} ${baseY} Z`}
                fill={`url(#efIcon${size})`} opacity="0.5">
                <animateTransform attributeName="transform" type="skewX" values="4;-6;4" dur="1.8s" repeatCount="indefinite" additive="sum" style={{transformOrigin:`${cx}px ${baseY}px`}}/>
            </path>
            {/* Llama central */}
            <path d={`M ${cx-baseW} ${baseY} C ${cx-baseW*1.2} ${baseY-size*0.38} ${cx-baseW*0.5} ${baseY-size*0.82} ${cx} ${baseY-size*1.08} C ${cx+baseW*0.5} ${baseY-size*0.82} ${cx+baseW*1.2} ${baseY-size*0.38} ${cx+baseW} ${baseY} Z`}
                fill={`url(#efIcon${size})`} filter={`url(#efIconGl${size})`}>
                <animateTransform attributeName="transform" type="scale" values="1 1;0.85 1.1;1.08 0.93;0.88 1.07;1 1" dur="1.6s" repeatCount="indefinite" additive="sum" style={{transformOrigin:`${cx}px ${baseY}px`}}/>
            </path>
            {/* Punta */}
            <path d={`M ${cx-baseW*0.3} ${baseY-size*0.8} C ${cx-baseW*0.1} ${baseY-size*0.95} ${cx} ${baseY-size*1.1} ${cx} ${baseY-size*1.08} C ${cx} ${baseY-size*1.08} ${cx+baseW*0.1} ${baseY-size*0.93} ${cx+baseW*0.3} ${baseY-size*0.78} C ${cx+baseW*0.1} ${baseY-size*0.72} ${cx-baseW*0.1} ${baseY-size*0.74} ${cx-baseW*0.3} ${baseY-size*0.8} Z`}
                fill={`url(#efIcon${size})`}>
                <animateTransform attributeName="transform" type="scale" values="1 1;0.7 1.2;1.1 0.85;0.8 1.15;1 1" dur="1.2s" repeatCount="indefinite" additive="sum" style={{transformOrigin:`${cx}px ${baseY-size*0.85}px`}}/>
            </path>
            {/* Base brillante */}
            <ellipse cx={cx} cy={baseY - size*0.07} rx={baseW*0.8} ry={size*0.1} fill="rgba(255,255,255,0.88)">
                <animate attributeName="opacity" values="0.75;1;0.6;0.9;0.75" dur="1.4s" repeatCount="indefinite"/>
            </ellipse>
        </svg>
    );
}

// ─── LegendaryReveal — pantalla épica fullscreen para LEGENDARY/MYTHIC ────────
// Usada tanto en x1 como en x5 cuando toca rareza alta

type LgPhase = "bolts" | "emerge" | "info";

function LegendaryReveal({ result, onBack, fromMulti = false }: { result: PullResult; onBack: () => void; fromMulti?: boolean }) {
    const [phase, setPhase] = useState<LgPhase>("bolts");
    const [showBurst, setShowBurst] = useState(false);
    const rs = RS[result.rarity];
    const slug = toSlug(result.name);
    const isMythic = result.rarity === "MYTHIC";

    // Secuencia: rayos 1.2s → emerge con burst → info 1.8s después
    useEffect(() => {
        const t1 = setTimeout(() => { setPhase("emerge"); setShowBurst(true); }, 1800);
        const t2 = setTimeout(() => setPhase("info"), 3600);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, []);

    // Rayos horizontales y verticales
    const hBolts = [
        { top: "28%", dur: "1.8s", delay: "0s",    width: "100%", color: rs.border, opacity: 0.9 },
        { top: "48%", dur: "1.8s", delay: "0.12s", width: "80%",  color: "#ffffff", opacity: 0.7 },
        { top: "62%", dur: "1.8s", delay: "0.07s", width: "100%", color: rs.border, opacity: 0.6 },
        { top: "18%", dur: "1.8s", delay: "0.22s", width: "60%",  color: rs.color,  opacity: 0.5 },
        { top: "78%", dur: "1.8s", delay: "0.18s", width: "70%",  color: rs.border, opacity: 0.4 },
    ];
    const vBolts = [
        { left: "25%", dur: "1.8s", delay: "0.05s", height: "100%", color: rs.border, opacity: 0.7 },
        { left: "50%", dur: "1.8s", delay: "0s",    height: "100%", color: "#ffffff", opacity: 0.85 },
        { left: "75%", dur: "1.8s", delay: "0.14s", height: "80%",  color: rs.border, opacity: 0.55 },
        { left: "38%", dur: "1.8s", delay: "0.2s",  height: "60%",  color: rs.color,  opacity: 0.4 },
    ];

    const isInfo = phase === "info";

    return (
        <div style={{
            position: "fixed", inset: 0, zIndex: 200, overflow: "hidden",
            background: "#000000", fontFamily: "'Exo 2',sans-serif",
        }}>
            {/* ── Fondo con color de rareza ── */}
            <div style={{
                position: "absolute", inset: 0,
                background: `radial-gradient(ellipse at 50% 50%, ${rs.bgR.replace(/[\d.]+\)$/, "0.55)")} 0%, ${rs.bgR.replace(/[\d.]+\)$/, "0.2)")} 35%, rgba(0,0,0,0.98) 70%)`,
                transition: "opacity 1s",
                opacity: phase === "bolts" ? 0.6 : 1,
            }} />

            {/* ── Flash blanco al inicio ── */}
            {phase === "bolts" && (
                <div style={{
                    position: "absolute", inset: 0, zIndex: 10,
                    background: `radial-gradient(circle at 50% 50%, ${rs.glow.replace(/[\d.]+\)$/, "0.35)")} 0%, transparent 60%)`,
                    animation: "lgFlash 1.8s ease-out forwards",
                }} />
            )}

            {/* ── RAYOS HORIZONTALES ── */}
            {phase === "bolts" && hBolts.map((b, i) => (
                <div key={i} style={{
                    position: "absolute", top: b.top, left: i % 2 === 0 ? 0 : "auto",
                    right: i % 2 === 1 ? 0 : "auto",
                    width: b.width, height: "1px",
                    background: `linear-gradient(${i % 2 === 0 ? "to right" : "to left"}, transparent 0%, ${b.color} 20%, #ffffff 50%, ${b.color} 80%, transparent 100%)`,
                    boxShadow: `0 0 8px ${b.color}, 0 0 20px ${b.color}55`,
                    opacity: b.opacity,
                    animation: `lgBolt ${b.dur} ${b.delay} ease-out forwards`,
                    transformOrigin: i % 2 === 0 ? "left center" : "right center",
                    zIndex: 5,
                }} />
            ))}

            {/* ── RAYOS VERTICALES ── */}
            {phase === "bolts" && vBolts.map((b, i) => (
                <div key={i} style={{
                    position: "absolute", left: b.left,
                    top: i % 2 === 0 ? 0 : "auto", bottom: i % 2 === 1 ? 0 : "auto",
                    width: "1px", height: b.height,
                    background: `linear-gradient(${i % 2 === 0 ? "to bottom" : "to top"}, transparent 0%, ${b.color} 20%, #ffffff 50%, ${b.color} 80%, transparent 100%)`,
                    boxShadow: `0 0 8px ${b.color}, 0 0 20px ${b.color}55`,
                    opacity: b.opacity,
                    animation: `lgBoltV ${b.dur} ${b.delay} ease-out forwards`,
                    transformOrigin: i % 2 === 0 ? "center top" : "center bottom",
                    zIndex: 5,
                }} />
            ))}

            {/* ── Ondas expansivas en el centro ── */}
            {phase === "bolts" && [0,1,2].map(i => (
                <div key={i} style={{
                    position: "absolute", top: "50%", left: "50%",
                    borderRadius: "50%", border: `${i === 0 ? 3 : i === 1 ? 2 : 1.5}px solid ${i === 1 ? "#ffffff" : rs.border}`,
                    boxShadow: `0 0 ${20 + i*10}px ${rs.glow.replace(/[\d.]+\)$/, "0.6)")}`,
                    animation: `lgRing ${1.4 + i * 0.15}s ${i * 0.08}s ease-out forwards`,
                    zIndex: 6, transform: "translate(-50%,-50%)",
                    width: 0, height: 0,
                }} />
            ))}

            {/* ── Burst Three.js ── */}
            {showBurst && <FullScreenBurst color={rs.hex} onDone={() => setShowBurst(false)} />}

            {/* ── Mito emerge desde el centro ── */}
            {(phase === "emerge" || phase === "info") && (
                <div style={{
                    position: "absolute", inset: 0, zIndex: 10,
                    display: "flex", flexDirection: "column", alignItems: "center",
                    justifyContent: isInfo ? "flex-start" : "center",
                    paddingTop: isInfo ? "clamp(16px,4vh,40px)" : 0,
                    transition: "justify-content 0.5s",
                }}>
                    {/* Imagen del myth */}
                    <div style={{
                        position: "relative",
                        animation: phase === "emerge" ? "rvEmerge 0.8s cubic-bezier(0.34,1.56,0.64,1) both" : undefined,
                        flexShrink: 0,
                    }}>
                        {/* Aura de rareza */}
                        <div style={{
                            position: "absolute", inset: "-50px", borderRadius: "50%",
                            background: `radial-gradient(circle, ${rs.bgR.replace(/[\d.]+\)$/, "0.7)")} 0%, transparent 70%)`,
                            animation: "nxGlow 2s ease-in-out infinite",
                        }} />
                        <img src={mythFrontUrl(result.speciesId, slug)} alt={result.name}
                            style={{
                                width: isInfo ? "clamp(90px,16vw,160px)" : "clamp(130px,22vw,220px)",
                                height: isInfo ? "clamp(110px,20vw,200px)" : "clamp(155px,26vw,265px)",
                                objectFit: "contain", position: "relative", zIndex: 1,
                                filter: `drop-shadow(0 0 50px ${rs.glow}) drop-shadow(0 0 100px ${rs.glow.replace(/[\d.]+\)$/, "0.5)")})`,
                                transition: "width 0.5s ease, height 0.5s ease",
                            }}
                            onError={(e) => { const t = e.target as HTMLImageElement; t.style.display="none"; }}
                        />
                    </div>

                    {/* Info panel — solo en fase info */}
                    {isInfo && (
                        <div style={{
                            width: "100%", maxWidth: "clamp(340px,90vw,700px)",
                            display: "flex", flexDirection: "column", alignItems: "center",
                            gap: "clamp(6px,1.5vh,12px)",
                            padding: "0 clamp(16px,4vw,40px)",
                        }}>
                            {/* Rarity badge */}
                            <div style={{
                                padding: "4px 20px", borderRadius: 5,
                                fontSize: "var(--font-2xs)", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
                                background: rs.bg, border: `1px solid ${rs.border}`,
                                color: rs.color, boxShadow: `0 0 20px ${rs.glow.replace(/[\d.]+\)$/, "0.6)")}`,
                                animation: "rvInfo 0.4s ease both",
                            }}>★ {rs.label}{result.isPityGuarantee ? "  ✨" : ""}</div>

                            {/* Name — animado con glow pulsante */}
                            <p style={{
                                fontFamily: "'Rajdhani',sans-serif", fontWeight: 900,
                                fontSize: "clamp(26px,5.5vw,56px)", lineHeight: 1,
                                color: rs.color, letterSpacing: "0.05em",
                                animation: "nxNameRev 0.6s 0.1s ease both, lgNameGlow 2s 0.7s ease-in-out infinite",
                                opacity: 0,
                                ["--nc" as any]: rs.border,
                            }}>{result.name}</p>

                            {/* Affinities */}
                            <div style={{ display: "flex", gap: 8, animation: "rvInfo 0.4s 0.2s ease both", opacity: 0 }}>
                                {result.affinities.map(a => (
                                    <img key={a} src={affinityUrl(a)} alt={a}
                                        style={{ width: 24, height: 24, objectFit: "contain", filter: "drop-shadow(0 0 6px rgba(255,255,255,0.5))" }}
                                        onError={(e) => { (e.target as HTMLImageElement).style.display="none"; }} />
                                ))}
                            </div>

                            {/* Stats */}
                            <div style={{ display: "flex", gap: 6, animation: "rvInfo 0.4s 0.28s ease both", opacity: 0 }}>
                                {[["HP", result.maxHp], ["ATK", result.attack], ["DEF", result.defense], ["SPD", result.speed]].map(([k, v]) => (
                                    <div key={k as string} style={{
                                        background: "rgba(0,0,0,0.5)", border: `1px solid ${rs.border}55`,
                                        borderRadius: 8, padding: "5px 10px",
                                        display: "flex", flexDirection: "column", alignItems: "center", minWidth: 44,
                                        boxShadow: `inset 0 0 8px ${rs.border}22`,
                                    }}>
                                        <span style={{ fontSize: "var(--font-2xs)", color: "#8892a4", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</span>
                                        <span style={{ fontSize: "var(--font-sm)", fontWeight: 800, color: "#ffffff" }}>{v}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Divider */}
                            <div style={{
                                width: "100%", height: 1,
                                background: `linear-gradient(to right, transparent, ${rs.border}55, transparent)`,
                                animation: "rvInfo 0.4s 0.36s ease both", opacity: 0,
                            }} />

                            {/* Moves */}
                            {result.moves && result.moves.length > 0 && (
                                <div style={{
                                    width: "100%", display: "flex", flexDirection: "column", gap: 5,
                                    animation: "rvInfo 0.5s 0.4s ease both", opacity: 0,
                                }}>
                                    <p style={{ fontSize: "var(--font-2xs)", color: "#8892a4", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "monospace", marginBottom: 2 }}>Moves</p>
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                        {result.moves.map((move: any, mi: number) => (
                                            <div key={mi} style={{
                                                background: "rgba(0,0,0,0.55)",
                                                border: `1px solid ${rs.border}40`,
                                                borderLeft: `3px solid ${rs.border}`,
                                                borderRadius: "0 8px 8px 0",
                                                padding: "5px 12px",
                                                display: "flex", alignItems: "center", gap: 8,
                                                animation: `lgMoveIn 0.3s ${0.44 + mi * 0.06}s ease both`,
                                                opacity: 0,
                                                minWidth: "clamp(120px,28%,180px)",
                                                flex: "1 1 clamp(120px,28%,180px)",
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: "var(--font-xs)", fontWeight: 700, color: rs.color, fontFamily: "'Rajdhani',sans-serif", letterSpacing: "0.04em" }}>{move.name}</div>
                                                    {move.power && <div style={{ fontSize: "var(--font-2xs)", color: "#8892a4", fontFamily: "monospace" }}>PWR {move.power} · CD {move.cooldown}t</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* "No moves" fallback — mostrar placeholder elegante */}
                            {(!result.moves || result.moves.length === 0) && (
                                <div style={{
                                    width: "100%", padding: "8px 12px", borderRadius: 8,
                                    background: "rgba(0,0,0,0.3)", border: `1px solid ${rs.border}22`,
                                    animation: "rvInfo 0.4s 0.4s ease both", opacity: 0,
                                    textAlign: "center",
                                }}>
                                    <span style={{ fontSize: "var(--font-2xs)", color: "#5a6a80", fontFamily: "monospace", letterSpacing: "0.1em" }}>MOVES UNLOCKED IN BATTLE</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Botones laterales ── */}
            {isInfo && (
                <>
                    <button onClick={onBack} style={{
                        position: "absolute", left: "clamp(12px,3vw,36px)", top: "50%", transform: "translateY(-50%)",
                        padding: "12px 20px", borderRadius: 9, fontSize: "var(--font-xs)", fontWeight: 600,
                        cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)",
                        color: "#e2e8f0", zIndex: 30, animation: "rvInfo 0.4s 0.65s ease both", opacity: 0,
                    }}>← {fromMulti ? "Results" : "Back"}</button>
                    <button onClick={onBack} style={{
                        position: "absolute", right: "clamp(12px,3vw,36px)", top: "50%", transform: "translateY(-50%)",
                        padding: "12px 22px", borderRadius: 9, fontSize: "var(--font-xs)", fontWeight: 700,
                        cursor: "pointer", letterSpacing: "0.06em",
                        background: rs.bg, border: `1px solid ${rs.border}`, color: rs.color,
                        boxShadow: `0 0 20px ${rs.glow.replace(/[\d.]+\)$/, "0.5)")}`,
                        zIndex: 30, animation: "rvInfo 0.4s 0.7s ease both", opacity: 0,
                    }}>Collect ✓</button>
                </>
            )}
        </div>
    );
}

type RevealPhase = "flash" | "pillar" | "emerge" | "info";

function RevealSingle({ result, onBack }: { result: PullResult; onBack: () => void }) {
    const rank = ["COMMON","RARE","EPIC","ELITE","LEGENDARY","MYTHIC"].indexOf(result.rarity);

    // LEGENDARY y MYTHIC → pantalla épica con rayos + moves
    if (rank >= 4) return <LegendaryReveal result={result} onBack={onBack} />;

    const [phase, setPhase] = useState<RevealPhase>("flash");
    const [burstDone, setBurstDone] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const rs = RS[result.rarity];
    const slug = toSlug(result.name);

    // Phase sequence: flash → pillar (suspense) → emerge → info
    useEffect(() => {
        const t1 = setTimeout(() => setPhase("pillar"),  400);   // flash → pillar
        const t2 = setTimeout(() => setPhase("emerge"),  2200);  // pillar brilla solo durante 1.8s — intriga
        const t3 = setTimeout(() => setPhase("info"),   3200);   // emerge → info (mito visible 1s antes del texto)
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, []);

    // Ambient particle shower for high rarity
    useEffect(() => {
        if (rank < 3 || phase !== "info") return;
        const iv = setInterval(() => {
            if (containerRef.current) cssParticles(containerRef.current, rs.p, 6);
        }, 800);
        return () => clearInterval(iv);
    }, [rank, phase]);

    const isInfo = phase === "info";

    return (
        <div ref={containerRef} style={{
            position: "fixed", inset: 0, zIndex: 200,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            fontFamily: "'Exo 2',sans-serif", overflow: "hidden",
            background: "#070b14",
        }}>
            {/* ── Flash blanco cegador ── */}
            {phase === "flash" && (
                <div style={{ position: "absolute", inset: 0, background: "#ffffff", animation: "rvFlash 0.32s ease-out forwards", zIndex: 50 }} />
            )}

            {/* ── Pillar de luz ascendente — difuso, sin bordes duros ── */}
            {(phase === "pillar" || phase === "emerge" || phase === "info") && (
                <>
                    {/* Columna exterior ancha — muy difusa */}
                    <div style={{
                        position: "absolute", left: "50%", bottom: 0,
                        transform: "translateX(-50%)",
                        width: "clamp(180px,28vw,340px)",
                        height: "85%",
                        background: `radial-gradient(ellipse at 50% 100%, ${rs.border}30 0%, ${rs.border}12 35%, transparent 65%)`,
                        animation: "rvPillar 0.7s ease-out both",
                        zIndex: 1, pointerEvents: "none",
                        filter: "blur(18px)",
                    }} />
                    {/* Columna interior — más estrecha y luminosa */}
                    <div style={{
                        position: "absolute", left: "50%", bottom: 0,
                        transform: "translateX(-50%)",
                        width: "clamp(60px,9vw,110px)",
                        height: "75%",
                        background: `radial-gradient(ellipse at 50% 100%, ${rs.glow.replace(/[\d.]+\)$/, "0.55)")} 0%, ${rs.border}28 40%, transparent 70%)`,
                        animation: "rvPillar 0.55s 0.08s ease-out both",
                        zIndex: 2, pointerEvents: "none",
                        filter: "blur(8px)",
                    }} />
                    {/* Halo ground — charco de luz en el suelo */}
                    <div style={{
                        position: "absolute", bottom: 0, left: "50%",
                        transform: "translateX(-50%)",
                        width: "clamp(160px,32vw,400px)",
                        height: "clamp(20px,6vh,55px)",
                        background: `radial-gradient(ellipse at 50% 100%, ${rs.border}50 0%, ${rs.border}18 50%, transparent 75%)`,
                        animation: "rvPillar 0.5s ease-out both",
                        zIndex: 2, pointerEvents: "none",
                        filter: "blur(12px)",
                    }} />
                </>
            )}

            {/* ── Fondo radial dramático ── */}
            {(phase === "emerge" || phase === "info") && (
                <div style={{
                    position: "absolute", inset: 0,
                    background: `radial-gradient(ellipse at 50% 58%, ${rs.bgR} 0%, rgba(7,11,20,0.0) 55%)`,
                    animation: "rvBgReveal 0.7s ease-out both",
                    zIndex: 1,
                    pointerEvents: "none",
                }} />
            )}

            {/* ── Burst Three.js ── */}
            {(phase === "emerge" || phase === "info") && !burstDone && (
                <FullScreenBurst color={rs.hex} onDone={() => setBurstDone(true)} />
            )}

            {/* ── Aro de energía en torno al mito ── */}
            {(phase === "emerge" || phase === "info") && (
                <div style={{
                    position: "absolute", top: "50%", left: "50%",
                    transform: "translate(-50%,-50%)",
                    width: "clamp(260px,40vw,480px)",
                    height: "clamp(260px,40vw,480px)",
                    borderRadius: "50%",
                    border: `2px solid ${rs.border}55`,
                    boxShadow: `0 0 60px ${rs.glow.replace(/[\d.]+\)$/, "0.25)")}, inset 0 0 40px ${rs.glow.replace(/[\d.]+\)$/, "0.1)")}`,
                    animation: "rvRing 0.6s cubic-bezier(0.34,1.56,0.64,1) both",
                    zIndex: 3,
                    pointerEvents: "none",
                }} />
            )}

            {/* ── Mito emerge ── */}
            {(phase === "emerge" || phase === "info") && (
                <div style={{
                    position: "relative", zIndex: 10,
                    display: "flex", flexDirection: "column", alignItems: "center",
                    gap: "clamp(8px,2vh,14px)",
                    animation: "rvEmerge 0.65s cubic-bezier(0.34,1.56,0.64,1) both",
                }}>
                    <div style={{ position: "relative" }}>
                        {/* Aura pulsante */}
                        <div style={{
                            position: "absolute", inset: "-clamp(30px,5vw,60px)",
                            borderRadius: "50%",
                            background: `radial-gradient(circle, ${rs.bgR} 0%, transparent 70%)`,
                            animation: "nxGlow 2s ease-in-out infinite",
                            pointerEvents: "none",
                        }} />
                        <img
                            src={mythFrontUrl(result.speciesId, slug)}
                            alt={result.name}
                            style={{
                                width: "clamp(100px,18vw,180px)",
                                height: "clamp(120px,22vw,220px)",
                                objectFit: "contain",
                                position: "relative", zIndex: 1,
                                filter: `drop-shadow(0 0 40px ${rs.glow}) drop-shadow(0 0 80px ${rs.glow.replace(/[\d.]+\)$/, "0.4)")})`,
                            }}
                            onError={(e) => {
                                const t = e.target as HTMLImageElement;
                                t.style.display = "none";
                                if (t.parentElement) { t.parentElement.style.fontSize = "70px"; t.parentElement.innerHTML = "🔮"; }
                            }}
                        />
                    </div>

                    {/* Info — aparece en fase "info" */}
                    {isInfo && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "clamp(4px,1vh,7px)" }}>
                            {/* Rarity badge */}
                            <div style={{
                                padding: "3px 14px", borderRadius: 4,
                                fontSize: "var(--font-2xs)", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
                                background: rs.bg, border: `1px solid ${rs.border}`,
                                color: rs.color, boxShadow: `0 0 14px ${rs.glow.replace(/[\d.]+\)$/, "0.45)")}`,
                                animation: "rvInfo 0.4s ease both",
                            }}>
                                ★ {rs.label}{result.isPityGuarantee ? "  ✨" : ""}
                            </div>
                            {/* Name */}
                            <p style={{
                                fontFamily: "'Rajdhani',sans-serif", fontWeight: 800,
                                fontSize: "clamp(20px,4vw,36px)", color: rs.color, lineHeight: 1,
                                textShadow: `0 0 24px ${rs.glow}, 0 0 6px ${rs.glow}`,
                                animation: "nxNameRev 0.55s 0.1s ease both", opacity: 0,
                                letterSpacing: "0.04em",
                            }}>{result.name}</p>
                            {/* Affinities */}
                            <div style={{ display: "flex", gap: 6, animation: "rvInfo 0.4s 0.18s ease both", opacity: 0 }}>
                                {result.affinities.map(a => (
                                    <img key={a} src={affinityUrl(a)} alt={a}
                                        style={{ width: 20, height: 20, objectFit: "contain", filter: "drop-shadow(0 0 4px rgba(255,255,255,0.35))" }}
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                ))}
                            </div>
                            {/* Stats */}
                            <div style={{ display: "flex", gap: 5, animation: "rvInfo 0.4s 0.28s ease both", opacity: 0 }}>
                                {[["HP", result.maxHp], ["ATK", result.attack], ["DEF", result.defense], ["SPD", result.speed]].map(([k, v]) => (
                                    <div key={k as string} style={{
                                        background: "rgba(255,255,255,0.05)", border: `1px solid ${rs.border}44`,
                                        borderRadius: 6, padding: "4px 8px",
                                        display: "flex", flexDirection: "column", alignItems: "center", minWidth: 38,
                                    }}>
                                        <span style={{ fontSize: "var(--font-2xs)", color: "#8892a4", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k}</span>
                                        <span style={{ fontSize: "var(--font-xs)", fontWeight: 700, color: "#ffffff" }}>{v}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Botones laterales (fase info) ── */}
            {isInfo && (
                <>
                    <button onClick={onBack} style={{
                        position: "absolute", left: "clamp(12px,3vw,36px)", top: "50%", transform: "translateY(-50%)",
                        padding: "12px 20px", borderRadius: 9, fontSize: "var(--font-xs)", fontWeight: 600,
                        cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)",
                        color: "#e2e8f0", zIndex: 30, animation: "rvInfo 0.4s 0.5s ease both", opacity: 0,
                    }}>← Back</button>
                    <button onClick={onBack} style={{
                        position: "absolute", right: "clamp(12px,3vw,36px)", top: "50%", transform: "translateY(-50%)",
                        padding: "12px 22px", borderRadius: 9, fontSize: "var(--font-xs)", fontWeight: 700,
                        cursor: "pointer", letterSpacing: "0.06em",
                        background: rs.bg, border: `1px solid ${rs.border}`, color: rs.color,
                        boxShadow: `0 0 18px ${rs.glow.replace(/[\d.]+\)$/, "0.4)")}`,
                        zIndex: 30, animation: "rvInfo 0.4s 0.55s ease both", opacity: 0,
                    }}>Collect ✓</button>
                </>
            )}
        </div>
    );
}

// ─── Reveal x5 — Cinematic sequential ────────────────────────

type CrystalState = "idle" | "cracking" | "revealed";

function RevealMulti({ results, onBack }: { results: PullResult[]; onBack: () => void }) {
    const [states, setStates] = useState<CrystalState[]>(Array(5).fill("idle"));
    const [activeIdx, setActiveIdx] = useState<number>(-1);
    const [burstInfo, setBurstInfo] = useState<{ color: number; x: number; y: number; key: number } | null>(null);
    const [done, setDone] = useState(false);
    const [showLegendary, setShowLegendary] = useState<PullResult | null>(null);
    const wrapRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Encuentra el resultado de mayor rareza (LEGENDARY/MYTHIC primero)
    const RANK: Record<string,number> = { COMMON:0,RARE:1,EPIC:2,ELITE:3,LEGENDARY:4,MYTHIC:5 };
    const legendaryResult = results
        .filter(r => RANK[r.rarity] >= 4)
        .sort((a,b) => RANK[b.rarity] - RANK[a.rarity])[0] ?? null;

    useEffect(() => {
        let cancelled = false;
        async function run() {
            await loadThree();
            for (let i = 0; i < 5; i++) {
                if (cancelled) return;
                await new Promise(r => setTimeout(r, i === 0 ? 600 : 1100));
                if (cancelled) return;
                setActiveIdx(i);
                setStates(p => { const n = [...p]; n[i] = "cracking"; return n; });
                const ref = wrapRefs.current[i];
                let bx = window.innerWidth / 2, by = window.innerHeight / 2;
                if (ref) {
                    const rect = ref.getBoundingClientRect();
                    bx = rect.left + rect.width / 2;
                    by = rect.top + rect.height / 2;
                    cssParticles(ref, RS[results[i].rarity].p, 28);
                }
                setBurstInfo({ color: RS[results[i].rarity].hex, x: bx, y: by, key: i });
                await new Promise(r => setTimeout(r, 750));
                if (cancelled) return;
                setStates(p => { const n = [...p]; n[i] = "revealed"; return n; });
                await new Promise(r => setTimeout(r, 380));
            }
            await new Promise(r => setTimeout(r, 900));
            if (cancelled) return;
            // Si hay legendary/mythic → mostramos la pantalla épica primero
            if (legendaryResult) {
                setShowLegendary(legendaryResult);
            } else {
                setDone(true);
            }
        }
        run();
        return () => { cancelled = true; };
    }, []);

    // Pantalla épica de legendary — al cerrar va al SUMMONS
    if (showLegendary) {
        return <LegendaryReveal result={showLegendary} fromMulti onBack={() => { setShowLegendary(null); setDone(true); }} />;
    }

    if (done) {
        return (
            <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: "'Exo 2',sans-serif", overflow: "hidden", background: "#070b14" }}>
                {/* Fondo sólido oscuro con acento sutil */}
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 30%, rgba(123,47,255,0.18) 0%, rgba(7,11,20,0) 60%)", zIndex: 0, pointerEvents: "none" }} />
                <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(123,47,255,0.04) 1px, transparent 1px)", backgroundSize: "28px 28px", zIndex: 0, pointerEvents: "none" }} />
                <p style={{ fontFamily: "'Rajdhani',sans-serif", fontWeight: 800, fontSize: "clamp(22px,3.5vw,34px)", color: "#ffffff", letterSpacing: "0.18em", marginBottom: 28, position: "relative", zIndex: 1, textShadow: "0 0 30px rgba(123,47,255,0.6)" }}>SUMMONS</p>
                <div style={{ display: "flex", gap: "clamp(10px,2vw,20px)", justifyContent: "center", flexWrap: "wrap", position: "relative", zIndex: 1 }}>
                    {results.map((r, i) => {
                        const rs2 = RS[r.rarity];
                        return (
                            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: rs2.bg, border: `2px solid ${rs2.border}`, borderRadius: 14, padding: "clamp(10px,2vw,16px) clamp(12px,2.5vw,20px)", minWidth: "clamp(82px,10vw,112px)", boxShadow: `0 0 28px ${rs2.glow.replace(/[\d.]+\)$/, "0.35)")}`, animation: `nxSlideUp 0.4s ${i * 0.09}s ease both`, opacity: 0 }}>
                                <img src={mythFrontUrl(r.speciesId, toSlug(r.name))} alt={r.name} style={{ width: "clamp(52px,7vw,72px)", height: "clamp(65px,9vw,90px)", objectFit: "contain", filter: `drop-shadow(0 0 12px ${rs2.glow})` }} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                <span style={{ fontSize: "var(--font-xs)", color: rs2.color, fontWeight: 700, textAlign: "center" }}>{r.name}</span>
                                <span style={{ fontSize: "var(--font-2xs)", color: rs2.border, letterSpacing: "0.06em", textTransform: "uppercase" }}>{rs2.label}</span>
                                {r.isPityGuarantee && <span style={{ fontSize: 9, color: "#fbbf24" }}>✨</span>}
                            </div>
                        );
                    })}
                </div>
                <button onClick={onBack} style={{ marginTop: 32, padding: "12px 40px", borderRadius: 10, fontSize: "var(--font-sm)", fontWeight: 700, cursor: "pointer", letterSpacing: "0.07em", background: "rgba(123,47,255,0.28)", border: "1px solid rgba(123,47,255,0.65)", color: "#c4b5fd", position: "relative", zIndex: 1, boxShadow: "0 0 20px rgba(123,47,255,0.25)" }}>← Back to Nexus</button>
            </div>
        );
    }

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "clamp(16px,3vh,32px)", overflow: "hidden", fontFamily: "'Exo 2',sans-serif", background: "#070b14" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%, rgba(123,47,255,0.1) 0%, transparent 65%)", zIndex: 0, pointerEvents: "none" }} />
            {burstInfo && <FullScreenBurst key={burstInfo.key} color={burstInfo.color} x={burstInfo.x} y={burstInfo.y} onDone={() => setBurstInfo(null)} />}
            <p style={{ fontSize: "var(--font-xs)", color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 700, animation: "nxPulse 1.5s ease-in-out infinite", position: "relative", zIndex: 2 }}>Opening essences...</p>

            {/* ── Slots fijos — nunca cambian de tamaño ── */}
            <div style={{ display: "flex", gap: "clamp(16px,3.5vw,44px)", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 2 }}>
                {results.map((r, i) => {
                    const rs2 = RS[r.rarity]; const state = states[i]; const slug = toSlug(r.name);
                    const isActive = activeIdx === i && state === "cracking";
                    return (
                        /* Slot de ancho y alto fijos — los siblings nunca se mueven */
                        <div key={i} ref={el => { wrapRefs.current[i] = el; }}
                            style={{
                                width: "clamp(72px,10vw,108px)",
                                height: "clamp(140px,18vw,190px)",
                                position: "relative",
                                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
                                flexShrink: 0,
                            }}>

                            {/* Aura del slot activo */}
                            {isActive && (
                                <div style={{
                                    position: "absolute", inset: "-16px", borderRadius: 16,
                                    background: `radial-gradient(circle, ${rs2.bgR} 0%, transparent 72%)`,
                                    animation: "nxGlow 0.9s ease-in-out infinite",
                                    pointerEvents: "none", zIndex: 0,
                                }} />
                            )}

                            {/* Contenido — esencia o myth, fade-cross sin saltar */}
                            <div style={{
                                width: "100%", height: "100%",
                                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
                                gap: 6, position: "relative", zIndex: 1,
                            }}>
                                {state !== "revealed" ? (
                                    /* Esencia — explota suavemente */
                                    <div style={{
                                        position: "absolute", bottom: 16,
                                        animation: state === "cracking" ? "nxExplode 0.6s cubic-bezier(0.4,0,0.6,1) forwards" : undefined,
                                        opacity: state === "idle" && i > (activeIdx < 0 ? -1 : activeIdx) ? 0.32 : 1,
                                        transition: "opacity 0.5s ease",
                                    }}>
                                        <MiniFragment dim={state === "idle"} />
                                    </div>
                                ) : (
                                    /* Myth revelado — aparece suavemente desde abajo */
                                    <div style={{
                                        position: "absolute", inset: 0,
                                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
                                        gap: 5, paddingBottom: 8,
                                        animation: "multiReveal 0.55s cubic-bezier(0.34,1.4,0.64,1) both",
                                    }}>
                                        {/* Myth image */}
                                        <div style={{ position: "relative", flexShrink: 0 }}>
                                            <div style={{
                                                position: "absolute", inset: "-14px", borderRadius: "50%",
                                                background: `radial-gradient(circle, ${rs2.bgR} 0%, transparent 72%)`,
                                                animation: "nxGlow 2s ease-in-out infinite",
                                                pointerEvents: "none",
                                            }} />
                                            <img src={mythFrontUrl(r.speciesId, slug)} alt={r.name}
                                                style={{
                                                    width: "clamp(56px,7.5vw,88px)",
                                                    height: "clamp(70px,9.5vw,110px)",
                                                    objectFit: "contain", position: "relative", zIndex: 1,
                                                    filter: `drop-shadow(0 0 14px ${rs2.glow}) drop-shadow(0 0 28px ${rs2.glow.replace(/[\d.]+\)$/, "0.4)")})`,
                                                }}
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                        </div>
                                        {/* Rarity badge */}
                                        <div style={{
                                            padding: "2px 8px", borderRadius: 3,
                                            fontSize: "var(--font-2xs)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                                            background: rs2.bg, border: `1px solid ${rs2.border}`, color: rs2.color,
                                            boxShadow: `0 0 10px ${rs2.glow.replace(/[\d.]+\)$/, "0.45)")}`,
                                            whiteSpace: "nowrap",
                                        }}>{rs2.label}</div>
                                        {/* Name */}
                                        <span style={{
                                            fontSize: "clamp(9px,1vw,var(--font-2xs))", color: rs2.color, fontWeight: 700,
                                            textAlign: "center", maxWidth: "90%",
                                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                        }}>{r.name}</span>
                                        {r.isPityGuarantee && <span style={{ fontSize: 9, color: "#fbbf24", lineHeight: 1 }}>✨</span>}
                                    </div>
                                )}
                            </div>

                            {/* Dot indicator — fuera del slot para que no empuje */}
                            <div style={{
                                position: "absolute", bottom: -14,
                                width: 5, height: 5, borderRadius: "50%",
                                background: state === "revealed" ? rs2.border : "rgba(255,255,255,0.18)",
                                boxShadow: state === "revealed" ? `0 0 8px ${rs2.border}` : "none",
                                transition: "background 0.5s ease, box-shadow 0.5s ease",
                            }} />
                        </div>
                    );
                })}
            </div>

            <button onClick={onBack} style={{ position: "absolute", bottom: 24, left: 24, padding: "8px 18px", borderRadius: 7, fontSize: "var(--font-xs)", fontWeight: 600, cursor: "pointer", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.18)", color: "#e2e8f0", zIndex: 3 }}>← Skip</button>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────

export default function NexusPage() {
    const navigate = useNavigate();
    const [pity, setPity]       = useState<PityData | null>(null);
    const [loading, setLoading] = useState(true);
    const [pulling, setPulling] = useState(false);
    const [error, setError]     = useState<string | null>(null);
    const [singleResult, setSingleResult] = useState<PullResult | null>(null);
    const [multiResults, setMultiResults] = useState<PullResult[] | null>(null);

    const [sphereSize, setSphereSize] = useState(100);
    useEffect(() => {
        function onResize() {
            const w = window.innerWidth;
            setSphereSize(w < 500 ? 90 : w < 700 ? 110 : w < 1100 ? 150 : 200);
        }
        onResize();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    const fetchData = useCallback(async () => {
        try {
            const [br, pr] = await Promise.all([api.nexusBanner(), api.nexusPity()]);
            const bannerData = (br as any).banner;
            setPity({
                ...(pr as any),
                _boostedId:     bannerData?.boostedMythIds?.[0] ?? null,
                _boostedRarity: bannerData?.boostedRarity     ?? "LEGENDARY",
            } as any);
        } catch { setError("Failed to load Nexus"); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); loadThree(); }, [fetchData]);

    async function handlePull(amount: 1 | 5) {
        if (!pity || pity.essences < amount || pulling) return;
        setPulling(true); setError(null);
        try {
            const res: any = await api.nexusPull(amount);
            await fetchData();
            if (amount === 1) setSingleResult(res.results[0]);
            else setMultiResults(res.results);
        } catch (e: any) { setError(e.message ?? "Pull failed"); }
        finally { setPulling(false); }
    }

    const essences = pity?.essences ?? 0;
    const boostedId     = (pity as any)?._boostedId     ?? null;
    const boostedRarity = ((pity as any)?._boostedRarity ?? "LEGENDARY") as Rarity;
    const boostedRS     = RS[boostedRarity];
    const boostedSlug   = boostedId ? toSlug(boostedId) : null;
    const boostedName   = boostedId ?? null;

    return (
        <PageShell ambientColor="rgba(123,47,255,0.07)">
            <style>{`
                @keyframes nxGlow     { 0%,100%{opacity:0.5;transform:scale(0.95)} 50%{opacity:0.18;transform:scale(1.06)} }
                @keyframes nxFloat    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
                @keyframes nxMaura    { 0%,100%{opacity:0.4} 50%{opacity:0.9} }
                @keyframes nxX10      { 0%,100%{box-shadow:0 0 4px rgba(251,191,36,0.3)} 50%{box-shadow:0 0 14px rgba(251,191,36,0.8)} }
                @keyframes nxSparkle  { 0%,100%{opacity:0;transform:scale(0)} 40%,60%{opacity:1;transform:scale(1)} }
                @keyframes nxSlideUp  { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
                @keyframes nxNameRev  { from{letter-spacing:0.55em;opacity:0} to{letter-spacing:0.04em;opacity:1} }
                @keyframes nxExplode  { 0%{transform:scale(1);opacity:1;filter:blur(0)} 50%{transform:scale(2.1);opacity:0.35;filter:blur(4px)} 100%{transform:scale(0.04);opacity:0;filter:blur(8px)} }
                @keyframes nxPulse    { 0%,100%{opacity:0.55} 50%{opacity:1} }
                @keyframes nxPart     { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0} }
                @keyframes nxBinder   { from{transform:scale(0.08) translateY(70px);opacity:0;filter:blur(10px)} 60%{filter:blur(0)} to{transform:scale(1) translateY(0);opacity:1} }
                /* ── Cinematic reveal keyframes ── */
                @keyframes rvFlash    { 0%{opacity:1} 100%{opacity:0} }
                @keyframes rvPillar   { from{opacity:0} to{opacity:1} }
                @keyframes rvBgReveal { from{opacity:0;transform:scale(0.7)} to{opacity:1;transform:scale(1)} }
                @keyframes rvRing     { from{opacity:0;transform:translate(-50%,-50%) scale(0.2)} to{opacity:1;transform:translate(-50%,-50%) scale(1)} }
                @keyframes rvEmerge   { from{opacity:0;transform:translateY(60px) scale(0.5);filter:blur(12px)} 60%{filter:blur(0)} to{opacity:1;transform:translateY(0) scale(1)} }
                @keyframes rvInfo     { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
                /* ── LEGENDARY / MYTHIC — rayos épicos ── */
                @keyframes lgFlash    { 0%{opacity:0} 8%{opacity:1} 18%{opacity:0.3} 28%{opacity:1} 45%{opacity:0.5} 60%{opacity:1} 100%{opacity:0} }
                @keyframes lgBolt     { 0%{opacity:0;transform:scaleX(0) translateY(var(--by,0px))} 6%{opacity:1;transform:scaleX(1) translateY(var(--by,0px))} 85%{opacity:0.6;transform:scaleX(1) translateY(var(--by,0px))} 100%{opacity:0;transform:scaleX(1) translateY(var(--by,0px))} }
                @keyframes lgBoltV    { 0%{opacity:0;transform:scaleY(0) translateX(var(--bx,0px))} 6%{opacity:1;transform:scaleY(1) translateX(var(--bx,0px))} 85%{opacity:0.6;transform:scaleY(1) translateX(var(--bx,0px))} 100%{opacity:0;transform:scaleY(1) translateX(var(--bx,0px))} }
                @keyframes lgAura     { 0%{opacity:0;transform:translate(-50%,-50%) scale(0)} 25%{opacity:1;transform:translate(-50%,-50%) scale(1)} 70%{opacity:0.7;transform:translate(-50%,-50%) scale(1.15)} 100%{opacity:0;transform:translate(-50%,-50%) scale(1.4)} }
                @keyframes lgRing     { 0%{opacity:0.9;width:0;height:0} 100%{opacity:0;width:600px;height:600px} }
                @keyframes lgRingFast { 0%{opacity:0.7;width:0;height:0} 100%{opacity:0;width:400px;height:400px} }
                @keyframes lgShimmer  { 0%,100%{background-position:-200% 0} 50%{background-position:200% 0} }
                @keyframes lgNameGlow { 0%,100%{text-shadow:0 0 20px var(--nc,#fbbf24),0 0 40px var(--nc,#fbbf24)} 50%{text-shadow:0 0 40px var(--nc,#fbbf24),0 0 80px var(--nc,#fbbf24),0 0 120px var(--nc,#fbbf24)} }
                @keyframes lgMoveIn   { from{opacity:0;transform:translateX(-24px)} to{opacity:1;transform:translateX(0)} }
                @keyframes lgPulseRing { 0%,100%{box-shadow:0 0 0 0 var(--rc,rgba(251,191,36,0.4))} 50%{box-shadow:0 0 0 12px transparent} }
                /* ── x5 myth slot reveal ── */
                @keyframes multiReveal { from{opacity:0;transform:translateY(18px) scale(0.88);filter:blur(4px)} 60%{filter:blur(0)} to{opacity:1;transform:translateY(0) scale(1)} }
            `}</style>

            <PageTopbar title="Nexus" onBack={() => navigate(-1)} />

            <div className="relative flex-1 flex overflow-hidden">
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <p style={{ color: "#e2e8f0", fontSize: "var(--font-sm)" }}>Loading...</p>
                    </div>
                ) : (
                    <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

                        {/* ── FONDO: nebulosa profunda, no tan negro ── */}
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #0d0820 0%, #0a0f1e 40%, #080d18 70%, #0e0a1a 100%)", zIndex: 0 }} />
                        {/* Nebulosa púrpura izquierda */}
                        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "55%", height: "80%", background: "radial-gradient(ellipse, rgba(123,47,255,0.09) 0%, rgba(88,28,135,0.05) 45%, transparent 70%)", filter: "blur(40px)", zIndex: 0, pointerEvents: "none" }} />
                        {/* Nebulosa azul derecha */}
                        <div style={{ position: "absolute", bottom: "-15%", right: "-5%", width: "50%", height: "75%", background: "radial-gradient(ellipse, rgba(29,78,216,0.07) 0%, rgba(76,29,149,0.04) 50%, transparent 72%)", filter: "blur(50px)", zIndex: 0, pointerEvents: "none" }} />
                        {/* Nebulosa cian sutil arriba-derecha */}
                        <div style={{ position: "absolute", top: "0", right: "15%", width: "30%", height: "45%", background: "radial-gradient(ellipse, rgba(56,189,248,0.04) 0%, transparent 65%)", filter: "blur(30px)", zIndex: 0, pointerEvents: "none" }} />
                        {/* Grid de puntos más sutil */}
                        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(167,139,250,0.025) 1px, transparent 1px)", backgroundSize: "32px 32px", zIndex: 0, pointerEvents: "none" }} />

                        {/* ── PARTÍCULAS flotantes CSS en el centro ── */}
                        <style>{`
                            @keyframes nxDrift0 { 0%{transform:translate(0,0) rotate(0deg);opacity:0} 15%{opacity:1} 85%{opacity:0.6} 100%{transform:translate(var(--dx0),var(--dy0)) rotate(360deg);opacity:0} }
                            @keyframes nxDrift1 { 0%{transform:translate(0,0) scale(1);opacity:0} 20%{opacity:0.8} 80%{opacity:0.4} 100%{transform:translate(var(--dx1),var(--dy1)) scale(0.3);opacity:0} }
                            @keyframes nxDrift2 { 0%{transform:translate(0,0);opacity:0} 25%{opacity:0.7} 75%{opacity:0.3} 100%{transform:translate(var(--dx2),var(--dy2));opacity:0} }
                            @keyframes nxStarPulse { 0%,100%{opacity:0.15;transform:scale(0.8)} 50%{opacity:0.55;transform:scale(1.2)} }
                        `}</style>

                        {/* Partículas pequeñas flotando — posicionadas en el área central */}
                        {[
                            { top:"18%",left:"38%", sz:2.5, color:"#c4b5fd", dur:"9s",  delay:"0s",   dx:"-30px", dy:"-55px", anim:0 },
                            { top:"65%",left:"55%", sz:2,   color:"#a78bfa", dur:"11s", delay:"-3s",  dx:"25px",  dy:"-70px", anim:1 },
                            { top:"42%",left:"32%", sz:3,   color:"#7c3aed", dur:"8s",  delay:"-5s",  dx:"-20px", dy:"-45px", anim:0 },
                            { top:"28%",left:"62%", sz:1.8, color:"#ddd6fe", dur:"13s", delay:"-2s",  dx:"35px",  dy:"-60px", anim:2 },
                            { top:"72%",left:"40%", sz:2.2, color:"#818cf8", dur:"10s", delay:"-7s",  dx:"-25px", dy:"-50px", anim:1 },
                            { top:"52%",left:"68%", sz:1.5, color:"#c4b5fd", dur:"12s", delay:"-4s",  dx:"20px",  dy:"-65px", anim:2 },
                            { top:"35%",left:"45%", sz:2,   color:"#ffffff", dur:"7s",  delay:"-1.5s",dx:"-15px", dy:"-40px", anim:0 },
                            { top:"80%",left:"58%", sz:1.8, color:"#a78bfa", dur:"14s", delay:"-8s",  dx:"30px",  dy:"-55px", anim:1 },
                            { top:"22%",left:"50%", sz:2.5, color:"#7c3aed", dur:"9.5s",delay:"-6s",  dx:"-40px", dy:"-48px", anim:2 },
                            { top:"60%",left:"36%", sz:1.5, color:"#ddd6fe", dur:"11.5s",delay:"-2.5s",dx:"22px", dy:"-62px", anim:0 },
                            { top:"15%",left:"70%", sz:2,   color:"#818cf8", dur:"8.5s",delay:"-9s",  dx:"-18px", dy:"-52px", anim:1 },
                            { top:"88%",left:"48%", sz:2.2, color:"#c4b5fd", dur:"10.5s",delay:"-3.5s",dx:"28px", dy:"-45px", anim:2 },
                        ].map((p, i) => (
                            <div key={i} style={{
                                position: "absolute",
                                top: p.top, left: p.left,
                                width: p.sz, height: p.sz,
                                borderRadius: "50%",
                                background: p.color,
                                boxShadow: `0 0 ${p.sz * 3}px ${p.color}`,
                                pointerEvents: "none", zIndex: 0,
                                ["--dx" + p.anim as any]: p.dx,
                                ["--dy" + p.anim as any]: p.dy,
                                animation: `nxDrift${p.anim} ${p.dur} ${p.delay} ease-in-out infinite`,
                            }} />
                        ))}
                        {/* Estrellas fijas pulsantes */}
                        {[
                            { top:"12%",left:"55%",sz:1.2 }, { top:"45%",left:"72%",sz:1 },
                            { top:"78%",left:"62%",sz:1.4 }, { top:"30%",left:"38%",sz:1 },
                            { top:"62%",left:"44%",sz:1.2 }, { top:"20%",left:"65%",sz:0.9 },
                        ].map((s, i) => (
                            <div key={i} style={{
                                position: "absolute", top: s.top, left: s.left,
                                width: s.sz, height: s.sz, borderRadius: "50%",
                                background: "#e0d7ff",
                                boxShadow: `0 0 3px #c4b5fd`,
                                pointerEvents: "none", zIndex: 0,
                                animation: `nxStarPulse ${3.5 + i * 0.7}s ${-i * 0.9}s ease-in-out infinite`,
                            }} />
                        ))}

                        {/* LEFT: responsive width */}
                        <div style={{ width: "clamp(120px,22vw,220px)", minWidth: "clamp(120px,22vw,220px)", borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 1 }}>
                            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                                {/* Gradiente dinámico según rareza del boosted */}
                                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(160deg,${boostedRS.panelBg} 0%,${boostedRS.panelBg.replace(/[\d.]+\)$/, "0.22)")} 45%,rgba(7,11,20,0.95) 100%)` }} />
                                {boostedId && boostedSlug ? (
                                    <img src={mythFrontUrl(boostedId, boostedSlug)} alt="Boosted"
                                        style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center 10%", opacity: 0.9, display: "block", position: "relative", zIndex: 1, padding: "8px 8px 90px" }}
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                ) : (
                                    <div style={{ width: "100%", height: "calc(100% - 90px)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 80, position: "relative", zIndex: 1 }}>🐉</div>
                                )}
                                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top,rgba(7,11,20,1) 0%,rgba(7,11,20,0.35) 38%,transparent 65%)", zIndex: 2 }} />
                                {/* Aura dinámica según rareza */}
                                <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 50% 28%,${boostedRS.panelBg.replace(/[\d.]+\)$/, "0.35)")} 0%,transparent 58%)`, animation: "nxMaura 2.5s ease-in-out infinite", zIndex: 2, pointerEvents: "none" }} />
                                {SPARKLES.map((s, i) => (
                                    <div key={i} style={{ position: "absolute", zIndex: 3, pointerEvents: "none", color: boostedRS.border, fontSize: s.fs, top: s.top, left: s.left, animation: `nxSparkle 2.2s ease-in-out ${s.delay} infinite`, textShadow: `0 0 6px ${boostedRS.border}` }}>✦</div>
                                ))}
                                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "8px 10px", zIndex: 4 }}>
                                    <span style={{ fontSize: "var(--font-2xs)", textTransform: "uppercase", letterSpacing: "0.12em", color: boostedRS.border, fontWeight: 700, display: "block", marginBottom: 4, textShadow: `0 0 8px ${boostedRS.border}88` }}>✦ Featured this week</span>
                                    <div style={{ display: "inline-flex", alignItems: "center", gap: 3, background: boostedRS.bg, border: `1px solid ${boostedRS.border}bb`, borderRadius: 3, fontSize: "var(--font-2xs)", fontWeight: 700, color: boostedRS.color, padding: "2px 6px", marginBottom: 5, boxShadow: `0 0 8px ${boostedRS.border}55` }}>★ ×10 BOOST</div>
                                    <div style={{ fontSize: "var(--font-md)", fontFamily: "'Rajdhani',sans-serif", fontWeight: 700, color: "#ffffff", textShadow: `0 0 14px ${boostedRS.border}88,0 2px 4px rgba(0,0,0,0.8)`, lineHeight: 1, marginBottom: 2 }}>
                                        {boostedName ?? "Weekly Featured"}
                                    </div>
                                    {boostedName && <div style={{ fontSize: "var(--font-2xs)", color: boostedRS.color }}>{boostedRS.label}</div>}
                                </div>
                            </div>
                            {/* Pity */}
                            <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.25)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
                                    <EssenceIcon size={13} />
                                    <span style={{ fontSize: "var(--font-2xs)", textTransform: "uppercase", letterSpacing: "0.1em", color: "#ffffff", fontWeight: 700 }}>Pity Tracker</span>
                                </div>
                                {PITY_KEYS.map(({ key, label, color, max }) => {
                                    const cur = (pity as any)?.[key] ?? 0;
                                    const pct = Math.min((cur / max) * 100, 100);
                                    const hot = pct >= 70;
                                    return (
                                        <div key={key} style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3 }}>
                                            <span style={{ fontSize: "var(--font-2xs)", color: hot ? color : "#a8b5c8", minWidth: 44, fontWeight: hot ? 700 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                                            <div style={{ flex: 1, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                                                <div style={{ height: "100%", width: `${pct}%`, borderRadius: 2, background: color, transition: "width 0.4s ease", boxShadow: hot ? `0 0 6px ${color}` : "none" }} />
                                            </div>
                                            <span style={{ fontSize: "var(--font-2xs)", color: "#e2e8f0", fontFamily: "monospace", minWidth: 32, textAlign: "right" }}>{cur}/{max}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* CENTER: Fragmento + contador essences + botones */}
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "clamp(6px,1.5vh,14px)", position: "relative", zIndex: 1, minWidth: 0 }}>
                            <div style={{ animation: "nxFloat 5s ease-in-out infinite", position: "relative", zIndex: 1, marginBottom: -sphereSize * 0.15 }}>
                                <EssenceFragment size={sphereSize} />
                            </div>
                            <div style={{ textAlign: "center", position: "relative", zIndex: 2 }}>
                                <p style={{ fontSize: "var(--font-sm)", fontWeight: 700, color: "#ffffff", letterSpacing: "0.1em", textTransform: "uppercase" }}>Essence</p>
                                <p style={{ fontSize: "var(--font-xs)", color: "#67e8f9", marginTop: 2 }}>
                                    {boostedName ? `Boost active · ×10` : "Open essences below"}
                                </p>
                            </div>

                            {/* Essence counter — prominente, con icono de fuego */}
                            <div style={{
                                display: "flex", alignItems: "center", gap: 7,
                                background: "rgba(123,47,255,0.16)",
                                border: "1px solid rgba(167,139,250,0.4)",
                                borderRadius: 10,
                                padding: "6px 16px 6px 12px",
                                position: "relative", zIndex: 2,
                                boxShadow: "0 0 18px rgba(123,47,255,0.22)",
                            }}>
                                <EssenceIcon size={20} />
                                <span style={{
                                    fontSize: "var(--font-lg)", fontWeight: 800,
                                    color: "#e9d5ff", fontFamily: "'Rajdhani',sans-serif",
                                    letterSpacing: "0.04em", lineHeight: 1,
                                }}>{essences}</span>
                                <span style={{ fontSize: "var(--font-xs)", color: "#a78bfa", fontWeight: 500 }}>essences</span>
                            </div>

                            {error && <p style={{ fontSize: "var(--font-xs)", color: "#f87171", textAlign: "center", maxWidth: 160, position: "relative", zIndex: 2 }}>{error}</p>}

                            {/* Botones — compactos mobile, crecen en desktop */}
                            <div style={{ display: "flex", gap: "clamp(6px,1.5vw,12px)", position: "relative", zIndex: 10, width: "100%", justifyContent: "center", padding: "0 clamp(8px,3vw,0px)" }}>
                                {([1, 5] as const).map(n => (
                                    <button key={n} onClick={() => handlePull(n)} disabled={pulling || essences < n} style={{
                                        padding: "clamp(8px,1.5vh,11px) clamp(12px,2.5vw,28px)",
                                        borderRadius: 8,
                                        fontSize: "clamp(11px,1.2vw,var(--font-sm))", fontWeight: 700, letterSpacing: "0.04em",
                                        cursor: essences >= n && !pulling ? "pointer" : "not-allowed",
                                        border: `1px solid ${essences >= n ? (n === 5 ? "rgba(123,47,255,0.75)" : "rgba(123,47,255,0.55)") : "rgba(255,255,255,0.1)"}`,
                                        background: essences >= n ? (n === 5 ? "rgba(123,47,255,0.32)" : "rgba(123,47,255,0.18)") : "rgba(255,255,255,0.03)",
                                        color: essences >= n ? (n === 5 ? "#e2d9ff" : "#c4b5fd") : "#5a6a80",
                                        transition: "all 0.15s",
                                        boxShadow: essences >= n ? `0 0 14px ${n === 5 ? "rgba(123,47,255,0.4)" : "rgba(123,47,255,0.22)"}` : "none",
                                        whiteSpace: "nowrap", flexShrink: 0,
                                        display: "flex", alignItems: "center", gap: 5,
                                    }}>
                                        {pulling ? "..." : `Open ×${n}`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* RIGHT: responsive width */}
                        <div style={{ width: "clamp(90px,15vw,148px)", minWidth: "clamp(90px,15vw,148px)", borderLeft: "1px solid rgba(255,255,255,0.07)", padding: "10px clamp(6px,1vw,13px)", display: "flex", flexDirection: "column", gap: 4, position: "relative", zIndex: 1, overflow: "hidden" }}>
                            <p style={{ fontSize: "var(--font-2xs)", textTransform: "uppercase", letterSpacing: "0.1em", color: "#ffffff", fontWeight: 700, marginBottom: 3 }}>Rates</p>
                            {([
                                { l: "Common",    c: "#64748b", tc: "#e2e8f0", r: "60%" },
                                { l: "Rare",      c: "#6366f1", tc: "#c7d2fe", r: "30%" },
                                { l: "Epic",      c: "#a855f7", tc: "#e9d5ff", r: "7%"  },
                                { l: "Elite",     c: "#94a3b8", tc: "#f1f5f9", r: "2.5%" },
                                { l: "Legendary", c: "#fbbf24", tc: "#fde68a", r: "0.5%" },
                            ] as const).map(({ l, c, tc, r }) => (
                                <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0", gap: 3 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: 1, background: c, flexShrink: 0 }} />
                                        <span style={{ fontSize: "var(--font-2xs)", color: tc, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l}</span>
                                    </div>
                                    <span style={{ fontSize: "var(--font-2xs)", fontFamily: "monospace", color: "#e2e8f0", flexShrink: 0 }}>{r}</span>
                                </div>
                            ))}
                            <div style={{ marginTop: 5, paddingTop: 6, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                                <p style={{ fontSize: "var(--font-2xs)", color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 3 }}>Boost ×10</p>
                                <p style={{ fontSize: "var(--font-2xs)", color: "#a8b5c8", lineHeight: 1.5 }}>If you get the featured myth's rarity, ×10 chance it's them.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {singleResult && <RevealSingle result={singleResult} onBack={() => setSingleResult(null)} />}
            {multiResults && <RevealMulti results={multiResults} onBack={() => setMultiResults(null)} />}
        </PageShell>
    );
}
