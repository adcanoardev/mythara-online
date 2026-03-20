// apps/client/src/pages/NexusPage.tsx
import { useEffect, useState, useCallback, useRef } from "react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import PageShell from "../components/PageShell";
import PageTopbar from "../components/PageTopbar";
import { api } from "../lib/api";

// ─── Types ────────────────────────────────────────────────────

type Rarity = "COMMON" | "RARE" | "EPIC" | "ELITE" | "LEGENDARY" | "MYTHIC";
interface PityData {
    essences: number; goldEssences: number;
    pityRare: number; pityEpic: number; pityElite: number; pityLegendary: number;
    pityEliteGold: number; pityLegendaryGold: number;
}
interface PullResult { speciesId: string; name: string; rarity: Rarity; affinities: string[]; level: number; maxHp: number; attack: number; defense: number; speed: number; instanceId: string; isPityGuarantee: boolean; moves?: { name: string; power?: number; cooldown: number; affinity: string; }[]; }

// ─── Rarity config ────────────────────────────────────────────

const RS: Record<Rarity, { color: string; border: string; bg: string; glow: string; bgR: string; label: string; p: string; hex: number; panelBg: string }> = {
    COMMON:    { color: "var(--rarity-common-color)",    border: "var(--rarity-common-border)",    bg: "var(--rarity-common-bg)",    glow: "var(--rarity-common-glow)",    bgR: "var(--rarity-common-bgR)",    label: "Common",    p: "#94a3b8", hex: 0x94a3b8, panelBg: "var(--rarity-common-panel)"    },
    RARE:      { color: "var(--rarity-rare-color)",      border: "var(--rarity-rare-border)",      bg: "var(--rarity-rare-bg)",      glow: "var(--rarity-rare-glow)",      bgR: "var(--rarity-rare-bgR)",      label: "Rare",      p: "#818cf8", hex: 0x6366f1, panelBg: "var(--rarity-rare-panel)"      },
    EPIC:      { color: "var(--rarity-epic-color)",      border: "var(--rarity-epic-border)",      bg: "var(--rarity-epic-bg)",      glow: "var(--rarity-epic-glow)",      bgR: "var(--rarity-epic-bgR)",      label: "Epic",      p: "#c084fc", hex: 0xa855f7, panelBg: "var(--rarity-epic-panel)"      },
    ELITE:     { color: "var(--rarity-elite-color)",     border: "var(--rarity-elite-border)",     bg: "var(--rarity-elite-bg)",     glow: "var(--rarity-elite-glow)",     bgR: "var(--rarity-elite-bgR)",     label: "Elite",     p: "#22d3ee", hex: 0x22d3ee, panelBg: "var(--rarity-elite-panel)"     },
    LEGENDARY: { color: "var(--rarity-legendary-color)", border: "var(--rarity-legendary-border)", bg: "var(--rarity-legendary-bg)", glow: "var(--rarity-legendary-glow)", bgR: "var(--rarity-legendary-bgR)", label: "Legendary", p: "#fbbf24", hex: 0xfbbf24, panelBg: "var(--rarity-legendary-panel)" },
    MYTHIC:    { color: "var(--rarity-mythic-color)",    border: "var(--rarity-mythic-border)",    bg: "var(--rarity-mythic-bg)",    glow: "var(--rarity-mythic-glow)",    bgR: "var(--rarity-mythic-bgR)",    label: "Mythic",    p: "#f87171", hex: 0xf87171, panelBg: "var(--rarity-mythic-panel)"    },
};

const PITY_KEYS_PURPLE = [
    { key: "pityRare",      label: "Rare",      color: "#6366f1", max: 10  },
    { key: "pityEpic",      label: "Epic",      color: "#a855f7", max: 30  },
    { key: "pityElite",     label: "Elite",     color: "#22d3ee", max: 100 },
    { key: "pityLegendary", label: "Legendary", color: "#fbbf24", max: 150 },
] as const;

const PITY_KEYS_GOLD = [
    { key: "pityEliteGold",     label: "Elite",     color: "#22d3ee", max: 10  },
    { key: "pityLegendaryGold", label: "Legendary", color: "#fbbf24", max: 15  },
] as const;

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

function FullScreenBurst({ color, onDone, x, y, isGold = false }: { color: number; onDone: () => void; x?: number; y?: number; isGold?: boolean }) {
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

            const offsetX = x !== undefined ? ((x - W / 2) / W) * 10 : 0;
            const offsetY = y !== undefined ? -((y - H / 2) / H) * 8 : 0;

            const threeColor = new THREE.Color(color);
            // Gold burst: más partículas, velocidad mayor, anillos extra
            const count = isGold ? 600 : 320;
            const geo = new THREE.BufferGeometry();
            const pos = new Float32Array(count * 3);
            const vel: { x: number; y: number; z: number }[] = [];
            for (let i = 0; i < count; i++) {
                const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.5) * Math.PI;
                const spd = isGold ? (0.07 + Math.random() * 0.22) : (0.05 + Math.random() * 0.15);
                vel.push({ x: Math.cos(a) * Math.cos(e) * spd, y: Math.sin(e) * spd, z: Math.sin(a) * Math.cos(e) * spd * 0.3 });
                pos[i * 3] = offsetX; pos[i * 3 + 1] = offsetY; pos[i * 3 + 2] = 0;
            }
            geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
            const mat = new THREE.PointsMaterial({ color: threeColor, size: isGold ? 0.14 : 0.1, transparent: true, opacity: 1 });
            scene.add(new THREE.Points(geo, mat));

            // Segunda capa de partículas blancas para gold
            if (isGold) {
                const geoW = new THREE.BufferGeometry();
                const posW = new Float32Array(200 * 3);
                const velW: { x: number; y: number; z: number }[] = [];
                for (let i = 0; i < 200; i++) {
                    const a = Math.random() * Math.PI * 2, e = (Math.random() - 0.5) * Math.PI;
                    const spd = 0.04 + Math.random() * 0.1;
                    velW.push({ x: Math.cos(a) * Math.cos(e) * spd, y: Math.sin(e) * spd, z: Math.sin(a) * Math.cos(e) * spd * 0.3 });
                    posW[i * 3] = offsetX; posW[i * 3 + 1] = offsetY; posW[i * 3 + 2] = 0;
                }
                geoW.setAttribute("position", new THREE.BufferAttribute(posW, 3));
                const matW = new THREE.PointsMaterial({ color: 0xfffbe0, size: 0.07, transparent: true, opacity: 0.9 });
                scene.add(new THREE.Points(geoW, matW));
                // animate white particles inline via closure
                const animateW = () => {
                    const arr = geoW.attributes.position.array as Float32Array;
                    for (let i = 0; i < 200; i++) { arr[i*3]+=velW[i].x*0.8; arr[i*3+1]+=velW[i].y*0.8; arr[i*3+2]+=velW[i].z*0.8; }
                    geoW.attributes.position.needsUpdate = true;
                    matW.opacity = Math.max(0, matW.opacity - 0.009);
                };
                (scene as any)._goldWhiteAnimate = animateW;
            }

            const rings: any[] = [];
            const ringCount = isGold ? 9 : 6;
            for (let r = 0; r < ringCount; r++) {
                const rGeo = new THREE.RingGeometry(0.08 + r * 0.45, 0.1 + r * 0.45, 72);
                const rMat = new THREE.MeshBasicMaterial({ color: r % 2 === 0 ? threeColor : new THREE.Color(isGold ? 0xfffbe0 : 0xffffff), side: THREE.DoubleSide, transparent: true, opacity: 0.8 - r * 0.06 });
                const ring = new THREE.Mesh(rGeo, rMat);
                ring.position.x = offsetX; ring.position.y = offsetY;
                ring.rotation.x = Math.random() * Math.PI; ring.rotation.y = Math.random() * Math.PI;
                scene.add(ring);
                rings.push({ mesh: ring, speed: 0.005 + r * 0.003 });
            }
            const flashColor = isGold ? 0xfffbe0 : 0xffffff;
            const flashMat = new THREE.MeshBasicMaterial({ color: flashColor, transparent: true, opacity: isGold ? 1.0 : 0.9 });
            const flash = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), flashMat);
            flash.position.x = offsetX; flash.position.y = offsetY;
            scene.add(flash);
            let frame = 0;
            let raf: number;
            function animate() {
                if (!mounted) return;
                raf = requestAnimationFrame(animate);
                frame++;
                flashMat.opacity = Math.max(0, (isGold ? 1.0 : 0.9) - frame * 0.06);
                const arr = geo.attributes.position.array as Float32Array;
                for (let i = 0; i < count; i++) { arr[i*3]+=vel[i].x; arr[i*3+1]+=vel[i].y; arr[i*3+2]+=vel[i].z; vel[i].y -= 0.001; }
                geo.attributes.position.needsUpdate = true;
                mat.opacity = Math.max(0, mat.opacity - 0.007);
                (scene as any)._goldWhiteAnimate?.();
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
    }, [color, x, y, isGold]);
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

// ─── Runic Fragment — hexagonal 3D slab, slow float, glow behind ─

// ─── Diamond Fragment — canvas-based, float + glow + effects ─────────────────

function DiamondFragment({ size, isGold = false, cracking = false }: { size: number; isGold: boolean; cracking?: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef({ t: 0, crackProgress: 0, shakeX: 0, shakeY: 0, cracks: [] as {x1:number,y1:number,x2:number,y2:number,alpha:number}[] });

    useEffect(() => {
        const cv = canvasRef.current; if (!cv) return;
        const ctx = cv.getContext('2d')!;
        const W = cv.width, H = cv.height;
        const CX = W * 0.5, CY = H * 0.46;
        const RX = W * 0.38, RY = H * 0.36;
        const OX = W * 0.06, OY = H * 0.07;

        const col = isGold ? {
            g1:'rgba(251,191,36,',g2:'rgba(253,230,138,',
            face:'#1c0e00',face2:'#2d1800',
            edge1:'#3a1f00',edge2:'#5c2e00',
            stroke:'#d97706',strokeE:'#92400e',
            spec:'rgba(255,253,200,',specLo:'rgba(251,191,36,',
            rim:'rgba(255,248,180,',dot:'#fcd34d',dotG:'rgba(252,211,77,',
            crack:'rgba(255,220,50,'
        } : {
            g1:'rgba(139,92,246,',g2:'rgba(196,181,253,',
            face:'#0d0624',face2:'#180a3c',
            edge1:'#1a0d3d',edge2:'#2d1860',
            stroke:'#7c3aed',strokeE:'#4c1d95',
            spec:'rgba(245,240,255,',specLo:'rgba(139,92,246,',
            rim:'rgba(230,215,255,',dot:'#c4b5fd',dotG:'rgba(196,181,253,',
            crack:'rgba(180,140,255,'
        };

        // Diamond points (relative to center)
        function getDiamondPts(cx: number, cy: number, rx: number, ry: number) {
            return [
                [cx, cy - ry],       // top
                [cx + rx, cy],       // right
                [cx, cy + ry],       // bottom
                [cx - rx, cy],       // left
            ];
        }

        // Generate initial cracks
        const s = stateRef.current;
        if (s.cracks.length === 0) {
            for (let i = 0; i < 8; i++) {
                const angle = (Math.PI / 4) * i + (Math.random() - 0.5) * 0.3;
                const len = RX * (0.3 + Math.random() * 0.5);
                const startR = RX * (0.05 + Math.random() * 0.2);
                s.cracks.push({
                    x1: CX + Math.cos(angle) * startR,
                    y1: CY + Math.sin(angle) * startR * 0.6,
                    x2: CX + Math.cos(angle) * (startR + len),
                    y2: CY + Math.sin(angle) * (startR + len) * 0.6,
                    alpha: 0
                });
            }
        }

        let raf: number;
        function frame() {
            s.t += 0.014;

            // Cracking animation
            if (cracking) {
                s.crackProgress = Math.min(1, s.crackProgress + 0.04);
                s.shakeX = cracking ? (Math.random() - 0.5) * 6 * s.crackProgress : 0;
                s.shakeY = cracking ? (Math.random() - 0.5) * 4 * s.crackProgress : 0;
                s.cracks.forEach((c, i) => {
                    c.alpha = Math.min(1, s.crackProgress * (1 + i * 0.1));
                });
            } else {
                s.crackProgress = 0;
                s.shakeX = 0; s.shakeY = 0;
                s.cracks.forEach(c => c.alpha = 0);
            }

            ctx.clearRect(0, 0, W, H);

            // Floating offset
            const floatY = Math.sin(s.t * 0.45) * 4;
            const cx = CX + s.shakeX;
            const cy = CY + floatY + s.shakeY;

            // Ambient glow — pulsing
            const ga = 0.16 + Math.sin(s.t * 0.6) * 0.06;
            const gr = ctx.createRadialGradient(cx, cy, 5, cx, cy, RX * 1.6);
            gr.addColorStop(0, col.g1 + (ga + 0.1) + ')');
            gr.addColorStop(0.5, col.g1 + ga + ')');
            gr.addColorStop(1, col.g1 + '0)');
            ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);

            // Wider secondary glow
            const gr2 = ctx.createRadialGradient(cx, cy - 10, 5, cx, cy - 10, RX * 2.2);
            gr2.addColorStop(0, col.g2 + '0.07)');
            gr2.addColorStop(1, col.g2 + '0)');
            ctx.fillStyle = gr2; ctx.fillRect(0, 0, W, H);

            const pts = getDiamondPts(cx, cy, RX, RY);
            const [top, right, bot, left] = pts;

            // ── 3D side faces (right + bottom-right) ──
            // Right face: top→right + depth
            ctx.beginPath();
            ctx.moveTo(top[0], top[1]);
            ctx.lineTo(right[0], right[1]);
            ctx.lineTo(right[0]+OX, right[1]+OY);
            ctx.lineTo(top[0]+OX, top[1]+OY);
            ctx.closePath();
            const rf = ctx.createLinearGradient(top[0], top[1], right[0]+OX, right[1]+OY);
            rf.addColorStop(0, col.edge2); rf.addColorStop(1, col.edge1);
            ctx.fillStyle = rf; ctx.fill();
            ctx.strokeStyle = col.strokeE; ctx.lineWidth = 0.6; ctx.stroke();

            // Bottom-right face: right→bot + depth
            ctx.beginPath();
            ctx.moveTo(right[0], right[1]);
            ctx.lineTo(bot[0], bot[1]);
            ctx.lineTo(bot[0]+OX, bot[1]+OY);
            ctx.lineTo(right[0]+OX, right[1]+OY);
            ctx.closePath();
            const bf = ctx.createLinearGradient(right[0], right[1], bot[0]+OX, bot[1]+OY);
            bf.addColorStop(0, col.edge1); bf.addColorStop(1, col.face);
            ctx.fillStyle = bf; ctx.fill();
            ctx.strokeStyle = col.strokeE; ctx.lineWidth = 0.6; ctx.stroke();

            // ── Front face ──
            ctx.beginPath();
            pts.forEach(([x,y],i)=>{ i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
            ctx.closePath();
            const ff = ctx.createLinearGradient(top[0]-10, top[1], bot[0]+10, bot[1]);
            ff.addColorStop(0, col.face2);
            ff.addColorStop(0.5, col.face);
            ff.addColorStop(1, col.edge1);
            ctx.fillStyle = ff; ctx.fill();
            ctx.strokeStyle = col.stroke; ctx.lineWidth = 1.5; ctx.stroke();

            // ── Clip for inner effects ──
            ctx.save();
            ctx.beginPath();
            pts.forEach(([x,y],i)=>{ i===0?ctx.moveTo(x,y):ctx.lineTo(x,y); });
            ctx.closePath(); ctx.clip();

            // Inner facet lines — center to each vertex
            pts.forEach(([x,y]) => {
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y);
                ctx.strokeStyle = col.specLo + '0.18)'; ctx.lineWidth = 0.5; ctx.stroke();
            });
            // Inner diamond at 62%
            ctx.beginPath();
            pts.forEach(([x,y],i)=>{
                const ix=cx+(x-cx)*0.62, iy=cy+(y-cy)*0.62;
                i===0?ctx.moveTo(ix,iy):ctx.lineTo(ix,iy);
            });
            ctx.closePath();
            ctx.strokeStyle = col.spec + '0.25)'; ctx.lineWidth = 0.7; ctx.stroke();

            // Inner diamond at 32%
            ctx.beginPath();
            pts.forEach(([x,y],i)=>{
                const ix=cx+(x-cx)*0.32, iy=cy+(y-cy)*0.32;
                i===0?ctx.moveTo(ix,iy):ctx.lineTo(ix,iy);
            });
            ctx.closePath();
            ctx.strokeStyle = col.spec + '0.15)'; ctx.lineWidth = 0.4; ctx.stroke();

            // Specular highlight — upper left
            const spg = ctx.createRadialGradient(cx-RX*0.35, cy-RY*0.45, 0, cx-RX*0.1, cy-RY*0.1, RX*0.65);
            spg.addColorStop(0, col.spec + '0.5)');
            spg.addColorStop(0.5, col.spec + '0.12)');
            spg.addColorStop(1, col.specLo + '0)');
            ctx.fillStyle = spg; ctx.fillRect(0, 0, W, H);

            // Inner pulse glow
            const pa = 0.05 + Math.sin(s.t * 1.1) * 0.03;
            const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, RX * 0.7);
            pg.addColorStop(0, col.g2 + pa + ')');
            pg.addColorStop(1, col.g1 + '0)');
            ctx.fillStyle = pg; ctx.fillRect(0, 0, W, H);

            // ── CRACKS ──
            if (s.crackProgress > 0) {
                s.cracks.forEach(c => {
                    if (c.alpha <= 0) return;
                    ctx.beginPath();
                    ctx.moveTo(c.x1 + s.shakeX * 0.5, c.y1 + s.shakeY * 0.5);
                    ctx.lineTo(c.x2 + s.shakeX * 0.5, c.y2 + s.shakeY * 0.5);
                    ctx.strokeStyle = col.crack + c.alpha + ')';
                    ctx.lineWidth = 0.8 + c.alpha * 0.6;
                    ctx.stroke();
                    // Crack glow
                    ctx.beginPath();
                    ctx.moveTo(c.x1, c.y1); ctx.lineTo(c.x2, c.y2);
                    ctx.strokeStyle = col.crack + (c.alpha * 0.3) + ')';
                    ctx.lineWidth = 3; ctx.stroke();
                });
                // Inner energy buildup when fully cracked
                if (s.crackProgress > 0.5) {
                    const pulse = (s.crackProgress - 0.5) * 2;
                    const eg = ctx.createRadialGradient(cx, cy, 0, cx, cy, RX * 0.5 * pulse);
                    eg.addColorStop(0, col.g2 + (pulse * 0.6) + ')');
                    eg.addColorStop(1, col.g1 + '0)');
                    ctx.fillStyle = eg; ctx.fillRect(0, 0, W, H);
                }
            }

            ctx.restore();

            // ── Rim light on top-left edges ──
            ctx.beginPath();
            ctx.moveTo(left[0], left[1]);
            ctx.lineTo(top[0], top[1]);
            ctx.lineTo(right[0], right[1]);
            ctx.strokeStyle = col.rim + '0.4)';
            ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();

            // ── Vertex dots ──
            pts.forEach(([x,y], i) => {
                const pulse = 0.35 + Math.sin(s.t * 1.5 + i * 1.1) * 0.4;
                const r = 2.8 + Math.sin(s.t * 1.2 + i) * 0.8;
                const dg = ctx.createRadialGradient(x,y,0,x,y,r*4);
                dg.addColorStop(0, col.dotG + (pulse*0.5) + ')');
                dg.addColorStop(1, col.dotG + '0)');
                ctx.fillStyle = dg; ctx.fillRect(x-12,y-12,24,24);
                ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2);
                ctx.fillStyle = col.dot; ctx.globalAlpha = pulse; ctx.fill();
                ctx.globalAlpha = 1;
            });

            // ── Orbital particles ──
            for (let i = 0; i < 6; i++) {
                const a = s.t * 0.35 + i * Math.PI * 2 / 6;
                const or = RX * 1.1 + Math.sin(s.t * 0.7 + i) * 6;
                const px = cx + Math.cos(a) * or * 0.75;
                const py = cy + Math.sin(a) * or * 0.48;
                const pa = 0.15 + Math.sin(s.t * 1.3 + i * 0.8) * 0.5;
                ctx.beginPath();
                ctx.arc(px, py, 1.5 + Math.sin(s.t+i)*0.5, 0, Math.PI*2);
                ctx.fillStyle = col.dot;
                ctx.globalAlpha = Math.max(0, pa); ctx.fill();
                ctx.globalAlpha = 1;
            }

            // Ground glow
            const sg = ctx.createRadialGradient(cx, cy+RY*0.85, 0, cx, cy+RY*0.85, RX*0.8);
            sg.addColorStop(0, col.g1 + '0.14)');
            sg.addColorStop(1, col.g1 + '0)');
            ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);

            raf = requestAnimationFrame(frame);
        }
        frame();
        return () => cancelAnimationFrame(raf);
    }, [isGold, cracking]);

    const W = size * 2.2, H = size * 2.4;
    return (
        <div style={{
            position: 'relative',
            width: W, height: H,
            // Fade edges radially so canvas boundary is invisible
            WebkitMaskImage: 'radial-gradient(ellipse 62% 58% at 50% 46%, black 38%, transparent 70%)',
            maskImage: 'radial-gradient(ellipse 62% 58% at 50% 46%, black 38%, transparent 70%)',
        }}>
            <canvas ref={canvasRef} width={W} height={H}
                style={{ display: 'block', width: W, height: H }}
            />
        </div>
    );
}

// ─── Mini Diamond for x5 slots ────────────────────────────────────────────────

function MiniDiamond({ dim, rarity, cracking = false }: { dim: boolean; rarity?: string; cracking?: boolean }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tRef = useRef(0);
    const cpRef = useRef(0);

    useEffect(() => {
        const cv = canvasRef.current; if (!cv) return;
        const ctx = cv.getContext('2d')!;
        const W = cv.width, H = cv.height;
        const CX = W*0.5, CY = H*0.48;
        const RX = W*0.36, RY = H*0.32;
        const OX = W*0.07, OY = H*0.08;

        // Color by rarity or default purple
        const rarColors: Record<string,{g:string,stroke:string,dot:string,face:string,edge:string}> = {
            COMMON:    {g:'rgba(100,116,139,',stroke:'#64748b',dot:'#94a3b8',face:'#0f172a',edge:'#1e293b'},
            RARE:      {g:'rgba(99,102,241,', stroke:'#6366f1',dot:'#a5b4fc',face:'#1e1b4b',edge:'#312e81'},
            EPIC:      {g:'rgba(168,85,247,', stroke:'#a855f7',dot:'#d8b4fe',face:'#3b0764',edge:'#581c87'},
            ELITE:     {g:'rgba(34,211,238,', stroke:'#22d3ee',dot:'#a5f3fc',face:'#0c1a2e',edge:'#0e4a5a'},
            LEGENDARY: {g:'rgba(251,191,36,', stroke:'#fbbf24',dot:'#fde68a',face:'#1c0e00',edge:'#451a03'},
            MYTHIC:    {g:'rgba(248,113,113,',stroke:'#f87171',dot:'#fca5a5',face:'#1a0505',edge:'#450a0a'},
        };
        const c = rarColors[rarity ?? 'EPIC'] ?? rarColors.EPIC;
        const alpha = dim ? 0.25 : 1;

        let raf: number;
        function frame() {
            tRef.current += 0.016;
            if (cracking) cpRef.current = Math.min(1, cpRef.current + 0.05);
            else cpRef.current = 0;

            ctx.clearRect(0,0,W,H);
            const t = tRef.current;
            const shakeX = cracking ? (Math.random()-0.5)*4*cpRef.current : 0;
            const shakeY = cracking ? (Math.random()-0.5)*3*cpRef.current : 0;
            const cx = CX+shakeX, cy = CY+shakeY;

            const pts = [[cx,cy-RY],[cx+RX,cy],[cx,cy+RY],[cx-RX,cy]];
            const [top,right,bot,left2] = pts;

            if (!dim) {
                const ga = 0.12+Math.sin(t*0.6)*0.04;
                const gr = ctx.createRadialGradient(cx,cy,2,cx,cy,RX*1.4);
                gr.addColorStop(0,c.g+(ga+0.08)+')');
                gr.addColorStop(1,c.g+'0)');
                ctx.fillStyle=gr; ctx.globalAlpha=alpha; ctx.fillRect(0,0,W,H); ctx.globalAlpha=1;
            }

            // Right face
            ctx.beginPath();
            ctx.moveTo(top[0],top[1]); ctx.lineTo(right[0],right[1]);
            ctx.lineTo(right[0]+OX,right[1]+OY); ctx.lineTo(top[0]+OX,top[1]+OY);
            ctx.closePath();
            ctx.fillStyle=c.edge; ctx.globalAlpha=alpha*0.8; ctx.fill();
            ctx.strokeStyle=c.stroke+'88'; ctx.lineWidth=0.5; ctx.stroke();
            ctx.globalAlpha=1;

            // Front face
            ctx.beginPath();
            pts.forEach(([x,y],i)=>{i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
            ctx.closePath();
            ctx.fillStyle=c.face; ctx.globalAlpha=alpha; ctx.fill();
            ctx.strokeStyle=c.stroke; ctx.lineWidth=1.2; ctx.stroke();
            ctx.globalAlpha=1;

            ctx.save();
            ctx.beginPath();
            pts.forEach(([x,y],i)=>{i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
            ctx.closePath(); ctx.clip();

            // Inner facets
            if (!dim) {
                const ig = ctx.createRadialGradient(cx-RX*0.3,cy-RY*0.4,0,cx,cy,RX*0.7);
                ig.addColorStop(0,c.g+'0.35)'); ig.addColorStop(1,c.g+'0)');
                ctx.fillStyle=ig; ctx.fillRect(0,0,W,H);
                pts.forEach(([x,y])=>{
                    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(x,y);
                    ctx.strokeStyle=c.g+'0.15)'; ctx.lineWidth=0.4; ctx.stroke();
                });
            }

            // Cracks
            if (cpRef.current > 0) {
                for(let i=0;i<6;i++){
                    const a=(Math.PI/3)*i+0.2;
                    const len=RX*(0.4+Math.random()*0.3);
                    ctx.beginPath();
                    ctx.moveTo(cx+Math.cos(a)*RX*0.1, cy+Math.sin(a)*RY*0.1);
                    ctx.lineTo(cx+Math.cos(a)*len, cy+Math.sin(a)*len*0.6);
                    ctx.strokeStyle=`rgba(255,220,100,${cpRef.current*0.9})`;
                    ctx.lineWidth=0.6; ctx.stroke();
                }
                if(cpRef.current>0.6){
                    const eg=ctx.createRadialGradient(cx,cy,0,cx,cy,RX*0.6*(cpRef.current-0.4));
                    eg.addColorStop(0,c.g+(cpRef.current*0.7)+')'); eg.addColorStop(1,c.g+'0)');
                    ctx.fillStyle=eg; ctx.fillRect(0,0,W,H);
                }
            }
            ctx.restore();

            // Rim
            if(!dim){
                ctx.beginPath();
                ctx.moveTo(left2[0],left2[1]); ctx.lineTo(top[0],top[1]); ctx.lineTo(right[0],right[1]);
                ctx.strokeStyle=`rgba(240,220,255,0.35)`; ctx.lineWidth=1.5; ctx.lineJoin='round'; ctx.stroke();
            }

            // Vertex dots
            if(!dim){
                pts.forEach(([x,y],i)=>{
                    const p=0.3+Math.sin(t*1.5+i*1.1)*0.4;
                    ctx.beginPath(); ctx.arc(x,y,1.8,0,Math.PI*2);
                    ctx.fillStyle=c.dot; ctx.globalAlpha=p; ctx.fill(); ctx.globalAlpha=1;
                });
            }
            raf=requestAnimationFrame(frame);
        }
        frame();
        return ()=>cancelAnimationFrame(raf);
    },[dim,rarity,cracking]);

    return <canvas ref={canvasRef} width={72} height={90} style={{display:'block',width:72,height:90}}/>;
}

// ─── Legacy: EssenceFragment y GoldEssenceFragment ahora apuntan a RunicFragment ─

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
                    <linearGradient id="efFire" gradientUnits="userSpaceOnUse"
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

// ─── Gold Essence Fragment — llama dorada para el centro ─────
function GoldEssenceFragment({ size }: { size: number }) {
    const s = size * 1.3; // más grande que la purple
    const cx = s / 2;
    const baseY = s * 0.82;
    const baseW = s * 0.28;
    const id = "gfrag";

    const embers = Array.from({ length: 20 }, (_, i) => ({
        x: cx + (Math.sin(i * 2.1) * s * 0.2),
        sz: 1.6 + (i % 4) * 1.0,
        dur: `${2.5 + (i % 5) * 0.65}s`,
        delay: `${-(i * 0.4)}s`,
        color: i % 4 === 0 ? "#ffffff" : i % 4 === 1 ? "#fef3c7" : i % 4 === 2 ? "#fbbf24" : "#f59e0b",
        drift: Math.sin(i * 0.9) * s * 0.14,
    }));

    return (
        <div style={{ position: "relative", width: s, height: s * 1.4, flexShrink: 0 }}>
            {/* Aura dorada difusa */}
            <div style={{
                position: "absolute",
                bottom: s * 0.05, left: "50%", transform: "translateX(-50%)",
                width: s * 1.3, height: s * 0.65,
                background: "radial-gradient(ellipse at 50% 80%, rgba(251,191,36,0.35) 0%, rgba(245,158,11,0.15) 45%, transparent 70%)",
                filter: "blur(18px)",
                pointerEvents: "none",
                animation: "nxGlow 2.2s ease-in-out infinite",
            }} />

            <svg viewBox={`0 0 ${s} ${s * 1.4}`}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }}>
                <defs>
                    <linearGradient id={`${id}Main`} x1="0" y1={baseY} x2="0" y2={s * 0.05} gradientUnits="userSpaceOnUse">
                        <stop offset="0%"   stopColor="#ffffff"  stopOpacity="0.98" />
                        <stop offset="12%"  stopColor="#fef9c3"  stopOpacity="0.95" />
                        <stop offset="32%"  stopColor="#fbbf24"  stopOpacity="0.9"  />
                        <stop offset="58%"  stopColor="#d97706"  stopOpacity="0.78" />
                        <stop offset="80%"  stopColor="#92400e"  stopOpacity="0.4"  />
                        <stop offset="100%" stopColor="#451a03"  stopOpacity="0"    />
                    </linearGradient>
                    <linearGradient id={`${id}L`} x1="0" y1={baseY} x2="0" y2={s * 0.18} gradientUnits="userSpaceOnUse">
                        <stop offset="0%"   stopColor="#fef3c7"  stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#b45309"  stopOpacity="0"    />
                    </linearGradient>
                    <linearGradient id={`${id}R`} x1="0" y1={baseY} x2="0" y2={s * 0.22} gradientUnits="userSpaceOnUse">
                        <stop offset="0%"   stopColor="#fde68a"  stopOpacity="0.75" />
                        <stop offset="100%" stopColor="#92400e"  stopOpacity="0"    />
                    </linearGradient>
                    <filter id={`${id}Soft`} x="-30%" y="-30%" width="160%" height="160%">
                        <feGaussianBlur stdDeviation={s * 0.035} result="b"/>
                        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                    <filter id={`${id}Glow`} x="-60%" y="-60%" width="220%" height="220%">
                        <feGaussianBlur stdDeviation={s * 0.08} result="b"/>
                        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                    </filter>
                </defs>

                {/* Espiral decorativa */}
                <path d={`M ${cx} ${baseY*0.92} C ${cx+s*0.55} ${baseY*0.82} ${cx+s*0.62} ${baseY*0.38} ${cx+s*0.22} ${baseY*0.1} C ${cx+s*0.04} ${baseY*0.0} ${cx-s*0.16} ${baseY*0.0} ${cx-s*0.3} ${baseY*0.1} C ${cx-s*0.58} ${baseY*0.32} ${cx-s*0.52} ${baseY*0.74} ${cx-s*0.12} ${baseY*0.88}`}
                    fill="none" stroke="rgba(251,191,36,0.4)" strokeWidth={s * 0.022} strokeLinecap="round">
                    <animate attributeName="stroke-opacity" values="0.2;0.6;0.18;0.55;0.2" dur="3s" repeatCount="indefinite"/>
                </path>

                {/* Llama izquierda */}
                <path d={`M ${cx-baseW*0.6} ${baseY} C ${cx-baseW*2.2} ${baseY-s*0.32} ${cx-baseW*1.6} ${baseY-s*0.68} ${cx-baseW*0.25} ${baseY-s*0.85} C ${cx} ${baseY-s*0.68} ${cx-baseW*0.22} ${baseY-s*0.28} ${cx-baseW*0.6} ${baseY} Z`}
                    fill={`url(#${id}L)`} filter={`url(#${id}Soft)`} opacity="0.7">
                    <animateTransform attributeName="transform" type="skewX" values="-7;6;-5;7;-7" dur="2.3s" repeatCount="indefinite" additive="sum" style={{transformOrigin:`${cx}px ${baseY}px`}}/>
                </path>
                {/* Llama derecha */}
                <path d={`M ${cx+baseW*0.6} ${baseY} C ${cx+baseW*2.2} ${baseY-s*0.3} ${cx+baseW*1.7} ${baseY-s*0.65} ${cx+baseW*0.28} ${baseY-s*0.82} C ${cx} ${baseY-s*0.65} ${cx+baseW*0.25} ${baseY-s*0.26} ${cx+baseW*0.6} ${baseY} Z`}
                    fill={`url(#${id}R)`} filter={`url(#${id}Soft)`} opacity="0.65">
                    <animateTransform attributeName="transform" type="skewX" values="6;-8;5;-6;6" dur="2s" repeatCount="indefinite" additive="sum" style={{transformOrigin:`${cx}px ${baseY}px`}}/>
                </path>
                {/* Llama central */}
                <path d={`M ${cx-baseW*1.3} ${baseY} C ${cx-baseW*1.6} ${baseY-s*0.45} ${cx-baseW*0.65} ${baseY-s*0.9} ${cx} ${baseY-s*1.22} C ${cx+baseW*0.65} ${baseY-s*0.9} ${cx+baseW*1.6} ${baseY-s*0.45} ${cx+baseW*1.3} ${baseY} Z`}
                    fill={`url(#${id}Main)`} filter={`url(#${id}Glow)`}>
                    <animateTransform attributeName="transform" type="scale" values="1 1;0.88 1.12;1.1 0.92;0.86 1.1;1 1" dur="1.8s" repeatCount="indefinite" additive="sum" style={{transformOrigin:`${cx}px ${baseY}px`}}/>
                </path>
                {/* Punta */}
                <path d={`M ${cx-baseW*0.4} ${baseY-s*0.88} C ${cx-baseW*0.12} ${baseY-s*1.06} ${cx} ${baseY-s*1.24} ${cx} ${baseY-s*1.22} C ${cx} ${baseY-s*1.22} ${cx+baseW*0.12} ${baseY-s*1.04} ${cx+baseW*0.4} ${baseY-s*0.86} C ${cx+baseW*0.14} ${baseY-s*0.78} ${cx-baseW*0.14} ${baseY-s*0.8} ${cx-baseW*0.4} ${baseY-s*0.88} Z`}
                    fill={`url(#${id}Main)`}>
                    <animateTransform attributeName="transform" type="scale" values="1 1;0.65 1.28;1.14 0.8;0.76 1.2;1 1" dur="1.3s" repeatCount="indefinite" additive="sum" style={{transformOrigin:`${cx}px ${baseY-s*0.9}px`}}/>
                </path>
                {/* Chispas */}
                {embers.map((e, i) => (
                    <g key={i}>
                        <circle cx={e.x} cy={baseY - s * 0.15} r={e.sz} fill={e.color} opacity="0">
                            <animate attributeName="opacity" values="0;0.9;0" dur={e.dur} begin={e.delay} repeatCount="indefinite"/>
                            <animateTransform attributeName="transform" type="translate" values={`0,0;${e.drift},${-s * 0.85}`} dur={e.dur} begin={e.delay} repeatCount="indefinite"/>
                        </circle>
                    </g>
                ))}
                {/* Base brillante */}
                <ellipse cx={cx} cy={baseY - s * 0.05} rx={baseW * 1.2} ry={s * 0.1} fill="rgba(255,248,200,0.92)">
                    <animate attributeName="opacity" values="0.7;1;0.55;0.95;0.7" dur="1.6s" repeatCount="indefinite"/>
                    <animate attributeName="rx" values={`${baseW*1.1};${baseW*1.35};${baseW*1.0};${baseW*1.3};${baseW*1.1}`} dur="1.6s" repeatCount="indefinite"/>
                </ellipse>
            </svg>
        </div>
    );
}

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

// ─── Gold Essence Icon — llama dorada más grande con espiral ─────────────────

function GoldEssenceIcon({ size = 24, style }: { size?: number; style?: React.CSSProperties }) {
    const cx = size / 2, baseY = size * 0.86, baseW = size * 0.18;
    const id = `gef${size}`;
    return (
        <svg viewBox={`0 0 ${size} ${size * 1.3}`} width={size} height={size * 1.3}
            style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style }}
            overflow="visible">
            <defs>
                {/* Gradiente dorado — blanco caliente en base, ámbar hacia arriba */}
                <linearGradient id={`${id}G`} x1="0" y1={baseY} x2="0" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0%"   stopColor="#ffffff"  stopOpacity="1"    />
                    <stop offset="15%"  stopColor="#fef3c7"  stopOpacity="0.98" />
                    <stop offset="40%"  stopColor="#fbbf24"  stopOpacity="0.92" />
                    <stop offset="70%"  stopColor="#d97706"  stopOpacity="0.7"  />
                    <stop offset="90%"  stopColor="#92400e"  stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#451a03"  stopOpacity="0"    />
                </linearGradient>
                {/* Glow filter */}
                <filter id={`${id}Gl`} x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur stdDeviation={size * 0.07} result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                {/* Glow exterior suave */}
                <filter id={`${id}Aura`} x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation={size * 0.18} result="b"/>
                    <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
            </defs>

            {/* Aura exterior dorada */}
            <ellipse cx={cx} cy={baseY * 0.6} rx={size * 0.38} ry={size * 0.55}
                fill="rgba(251,191,36,0.12)" filter={`url(#${id}Aura)`}>
                <animate attributeName="opacity" values="0.5;0.9;0.4;0.8;0.5" dur="2.2s" repeatCount="indefinite"/>
            </ellipse>

            {/* Espiral dorada — arco que rodea la llama */}
            <path d={`M ${cx} ${baseY*0.92}
                      C ${cx + size*0.52} ${baseY*0.85} ${cx + size*0.6} ${baseY*0.4} ${cx + size*0.22} ${baseY*0.12}
                      C ${cx + size*0.05} ${baseY*0.02} ${cx - size*0.15} ${baseY*0.01} ${cx - size*0.28} ${baseY*0.1}
                      C ${cx - size*0.55} ${baseY*0.3} ${cx - size*0.5} ${baseY*0.72} ${cx - size*0.12} ${baseY*0.88}`}
                fill="none" stroke="rgba(251,191,36,0.55)" strokeWidth={size * 0.025}
                strokeLinecap="round">
                <animate attributeName="stroke-opacity" values="0.3;0.7;0.25;0.6;0.3" dur="2.8s" repeatCount="indefinite"/>
            </path>
            {/* Segunda espiral más pequeña */}
            <path d={`M ${cx} ${baseY*0.88}
                      C ${cx + size*0.35} ${baseY*0.78} ${cx + size*0.38} ${baseY*0.45} ${cx + size*0.1} ${baseY*0.22}
                      C ${cx - size*0.05} ${baseY*0.1} ${cx - size*0.22} ${baseY*0.12} ${cx - size*0.32} ${baseY*0.28}
                      C ${cx - size*0.42} ${baseY*0.5} ${cx - size*0.3} ${baseY*0.75} ${cx - size*0.05} ${baseY*0.86}`}
                fill="none" stroke="rgba(253,230,138,0.4)" strokeWidth={size * 0.018}
                strokeLinecap="round">
                <animate attributeName="stroke-opacity" values="0.2;0.5;0.15;0.45;0.2" dur="2s" repeatCount="indefinite"/>
            </path>

            {/* Llama lateral izquierda — más ancha */}
            <path d={`M ${cx-baseW*0.5} ${baseY} C ${cx-baseW*1.8} ${baseY-size*0.38} ${cx-baseW*1.4} ${baseY-size*0.75} ${cx-baseW*0.25} ${baseY-size*0.92} C ${cx} ${baseY-size*0.75} ${cx-baseW*0.22} ${baseY-size*0.32} ${cx-baseW*0.5} ${baseY} Z`}
                fill={`url(#${id}G)`} opacity="0.6">
                <animateTransform attributeName="transform" type="skewX" values="-6;5;-4;6;-6" dur="2.2s" repeatCount="indefinite" additive="sum" style={{transformOrigin:`${cx}px ${baseY}px`}}/>
            </path>
            {/* Llama lateral derecha */}
            <path d={`M ${cx+baseW*0.5} ${baseY} C ${cx+baseW*1.8} ${baseY-size*0.35} ${cx+baseW*1.5} ${baseY-size*0.72} ${cx+baseW*0.25} ${baseY-size*0.88} C ${cx} ${baseY-size*0.72} ${cx+baseW*0.22} ${baseY-size*0.3} ${cx+baseW*0.5} ${baseY} Z`}
                fill={`url(#${id}G)`} opacity="0.55">
                <animateTransform attributeName="transform" type="skewX" values="5;-7;4;-5;5" dur="1.9s" repeatCount="indefinite" additive="sum" style={{transformOrigin:`${cx}px ${baseY}px`}}/>
            </path>
            {/* Llama central — más alta */}
            <path d={`M ${cx-baseW*1.1} ${baseY} C ${cx-baseW*1.4} ${baseY-size*0.42} ${cx-baseW*0.55} ${baseY-size*0.88} ${cx} ${baseY-size*1.18} C ${cx+baseW*0.55} ${baseY-size*0.88} ${cx+baseW*1.4} ${baseY-size*0.42} ${cx+baseW*1.1} ${baseY} Z`}
                fill={`url(#${id}G)`} filter={`url(#${id}Gl)`}>
                <animateTransform attributeName="transform" type="scale" values="1 1;0.88 1.12;1.1 0.92;0.86 1.1;1 1" dur="1.7s" repeatCount="indefinite" additive="sum" style={{transformOrigin:`${cx}px ${baseY}px`}}/>
            </path>
            {/* Punta */}
            <path d={`M ${cx-baseW*0.35} ${baseY-size*0.85} C ${cx-baseW*0.12} ${baseY-size*1.02} ${cx} ${baseY-size*1.2} ${cx} ${baseY-size*1.18} C ${cx} ${baseY-size*1.18} ${cx+baseW*0.12} ${baseY-size*1.0} ${cx+baseW*0.35} ${baseY-size*0.83} C ${cx+baseW*0.12} ${baseY-size*0.76} ${cx-baseW*0.12} ${baseY-size*0.78} ${cx-baseW*0.35} ${baseY-size*0.85} Z`}
                fill={`url(#${id}G)`}>
                <animateTransform attributeName="transform" type="scale" values="1 1;0.65 1.25;1.12 0.82;0.78 1.18;1 1" dur="1.3s" repeatCount="indefinite" additive="sum" style={{transformOrigin:`${cx}px ${baseY-size*0.9}px`}}/>
            </path>
            {/* Chispas doradas flotantes */}
            {[
                { cx: cx - size*0.22, cy: baseY - size*0.55, r: size*0.022, delay: "0s",    dur: "1.8s" },
                { cx: cx + size*0.28, cy: baseY - size*0.45, r: size*0.018, delay: "0.6s",  dur: "2.1s" },
                { cx: cx - size*0.18, cy: baseY - size*0.82, r: size*0.015, delay: "1.1s",  dur: "1.6s" },
                { cx: cx + size*0.12, cy: baseY - size*0.92, r: size*0.02,  delay: "0.3s",  dur: "2.4s" },
                { cx: cx + size*0.32, cy: baseY - size*0.68, r: size*0.013, delay: "0.9s",  dur: "1.9s" },
            ].map((s, i) => (
                <circle key={i} cx={s.cx} cy={s.cy} r={s.r} fill="#fde68a">
                    <animate attributeName="opacity" values="0;1;0" dur={s.dur} begin={s.delay} repeatCount="indefinite"/>
                    <animateTransform attributeName="transform" type="translate" values="0,0;0,-6;0,0" dur={s.dur} begin={s.delay} repeatCount="indefinite"/>
                </circle>
            ))}
            {/* Base brillante dorada */}
            <ellipse cx={cx} cy={baseY - size*0.06} rx={baseW*1.1} ry={size*0.11} fill="rgba(255,255,220,0.9)">
                <animate attributeName="opacity" values="0.7;1;0.55;0.95;0.7" dur="1.5s" repeatCount="indefinite"/>
            </ellipse>
        </svg>
    );
}

// ─── LegendaryReveal — pantalla épica fullscreen para LEGENDARY/MYTHIC ────────
// Usada tanto en x1 como en x5 cuando toca rareza alta

type LgPhase = "cracking" | "bolts" | "emerge" | "info";

function LegendaryReveal({ result, onBack, fromMulti = false, isGold = false }: { result: PullResult; onBack: () => void; fromMulti?: boolean; isGold?: boolean }) {
    const [phase, setPhase] = useState<LgPhase>("cracking");
    const [showBurst, setShowBurst] = useState(false);
    const rs = RS[result.rarity];
    const slug = toSlug(result.name);
    const isMythic = result.rarity === "MYTHIC";

    // Secuencia: cracking (1.4s) → bolts/rayos (1.8s) → emerge con burst → info
    useEffect(() => {
        const t0 = setTimeout(() => setPhase("bolts"),  1400);
        const t1 = setTimeout(() => { setPhase("emerge"); setShowBurst(true); }, 3200);
        const t2 = setTimeout(() => setPhase("info"), 5000);
        return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); };
    }, []);

    // Rayos horizontales, verticales y diagonales — más intensos
    const hBolts = [
        { top: "28%",  dur: "1.8s", delay: "0s",    width: "100%", color: rs.border,  opacity: 0.95 },
        { top: "48%",  dur: "1.8s", delay: "0.08s", width: "100%", color: "#ffffff",  opacity: 0.85 },
        { top: "62%",  dur: "1.8s", delay: "0.05s", width: "100%", color: rs.border,  opacity: 0.7  },
        { top: "18%",  dur: "1.8s", delay: "0.18s", width: "75%",  color: rs.color,   opacity: 0.6  },
        { top: "78%",  dur: "1.8s", delay: "0.14s", width: "80%",  color: rs.border,  opacity: 0.5  },
        { top: "35%",  dur: "1.6s", delay: "0.22s", width: "60%",  color: "#ffffff",  opacity: 0.4  },
        { top: "55%",  dur: "1.6s", delay: "0.3s",  width: "55%",  color: rs.color,   opacity: 0.35 },
        { top: "88%",  dur: "1.4s", delay: "0.1s",  width: "45%",  color: rs.border,  opacity: 0.3  },
    ];
    const vBolts = [
        { left: "25%", dur: "1.8s", delay: "0.04s", height: "100%", color: rs.border, opacity: 0.8  },
        { left: "50%", dur: "1.8s", delay: "0s",    height: "100%", color: "#ffffff",  opacity: 0.95 },
        { left: "75%", dur: "1.8s", delay: "0.12s", height: "100%", color: rs.border, opacity: 0.65 },
        { left: "38%", dur: "1.6s", delay: "0.2s",  height: "80%",  color: rs.color,  opacity: 0.5  },
        { left: "62%", dur: "1.6s", delay: "0.16s", height: "70%",  color: rs.border, opacity: 0.45 },
        { left: "12%", dur: "1.4s", delay: "0.28s", height: "60%",  color: "#ffffff",  opacity: 0.3  },
        { left: "88%", dur: "1.4s", delay: "0.08s", height: "55%",  color: rs.color,  opacity: 0.28 },
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

            {/* ── CRACKING phase — diamante grande vibrando antes de los rayos ── */}
            {phase === "cracking" && (
                <div style={{
                    position: "absolute", inset: 0, zIndex: 15,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexDirection: "column", gap: 16,
                    background: "#000000",
                }}>
                    {/* Glow que crece con la rareza */}
                    <div style={{
                        position: "absolute",
                        width: "clamp(240px,45vw,520px)", height: "clamp(240px,45vw,520px)",
                        borderRadius: "50%",
                        background: `radial-gradient(circle, ${rs.glow.replace(/[\d.]+\)$/, "0.25)")} 0%, transparent 70%)`,
                        animation: "nxGlow 0.5s ease-in-out infinite",
                    }} />
                    <DiamondFragment size={110} isGold={isGold} cracking={true} />
                    <div style={{
                        fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
                        fontSize: "clamp(12px,1.6vw,16px)", letterSpacing: "0.3em",
                        textTransform: "uppercase", color: rs.color, opacity: 0.8,
                        animation: "nxPulse 0.35s ease-in-out infinite",
                    }}>The essence shatters...</div>
                </div>
            )}

            {/* ── Flash blanco al inicio de bolts ── */}
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
                    width: b.width, height: i < 2 ? "2px" : "1px",
                    background: `linear-gradient(${i % 2 === 0 ? "to right" : "to left"}, transparent 0%, ${b.color} 15%, #ffffff 50%, ${b.color} 85%, transparent 100%)`,
                    boxShadow: `0 0 ${i < 2 ? 14 : 8}px ${b.color}, 0 0 ${i < 2 ? 35 : 18}px ${b.color}77, 0 0 ${i < 2 ? 60 : 30}px ${b.color}33`,
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
                    width: i < 2 ? "2px" : "1px", height: b.height,
                    background: `linear-gradient(${i % 2 === 0 ? "to bottom" : "to top"}, transparent 0%, ${b.color} 15%, #ffffff 50%, ${b.color} 85%, transparent 100%)`,
                    boxShadow: `0 0 ${i < 2 ? 14 : 8}px ${b.color}, 0 0 ${i < 2 ? 35 : 18}px ${b.color}77, 0 0 ${i < 2 ? 60 : 30}px ${b.color}33`,
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
            {showBurst && <FullScreenBurst color={rs.hex} onDone={() => setShowBurst(false)} isGold={isGold} />}

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

type RevealPhase = "cracking" | "flash" | "pillar" | "emerge" | "info";

function RevealSingle({ result, onBack, isGold = false }: { result: PullResult; onBack: () => void; isGold?: boolean }) {
    const rank = ["COMMON","RARE","EPIC","ELITE","LEGENDARY","MYTHIC"].indexOf(result.rarity);

    // LEGENDARY y MYTHIC → pantalla épica con rayos + moves
    if (rank >= 4) return <LegendaryReveal result={result} onBack={onBack} isGold={isGold} />;

    const [phase, setPhase] = useState<RevealPhase>("cracking");
    const [burstDone, setBurstDone] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const rs = RS[result.rarity];
    const slug = toSlug(result.name);

    // Phase sequence: cracking (vibra+grietas) → flash → pillar → emerge → info
    useEffect(() => {
        const t0 = setTimeout(() => setPhase("flash"),  1200);  // cracking dura 1.2s
        const t1 = setTimeout(() => setPhase("pillar"), 1600);  // flash → pillar
        const t2 = setTimeout(() => setPhase("emerge"), 3400);  // pillar 1.8s
        const t3 = setTimeout(() => setPhase("info"),   4400);  // emerge → info
        return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
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
    const isCracking = phase === "cracking";

    return (
        <div ref={containerRef} style={{
            position: "fixed", inset: 0, zIndex: 200,
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            fontFamily: "'Exo 2',sans-serif", overflow: "hidden",
            background: "#070b14",
        }}>
            {/* ── CRACKING phase — diamante en pantalla con grietas y vibración ── */}
            {isCracking && (
                <div style={{
                    position: "absolute", inset: 0, zIndex: 10,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "#070b14",
                }}>
                    {/* Ambient glow que crece */}
                    <div style={{
                        position: "absolute",
                        width: "clamp(200px,35vw,400px)", height: "clamp(200px,35vw,400px)",
                        borderRadius: "50%",
                        background: `radial-gradient(circle, ${rs.p}44 0%, transparent 70%)`,
                        animation: "nxGlow 0.6s ease-in-out infinite",
                    }} />
                    <DiamondFragment size={100} isGold={isGold} cracking={true} />
                    {/* Tension text */}
                    <div style={{
                        position: "absolute", bottom: "25%",
                        fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
                        fontSize: "clamp(11px,1.4vw,14px)", letterSpacing: "0.25em",
                        textTransform: "uppercase", color: rs.p,
                        opacity: 0.7,
                        animation: "nxPulse 0.4s ease-in-out infinite",
                    }}>Essence breaking...</div>
                </div>
            )}

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
                <FullScreenBurst color={rs.hex} onDone={() => setBurstDone(true)} isGold={isGold} />
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

function RevealMulti({ results, onBack, isGold = false }: { results: PullResult[]; onBack: () => void; isGold?: boolean }) {
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
        return <LegendaryReveal result={showLegendary} fromMulti isGold={isGold} onBack={() => { setShowLegendary(null); setDone(true); }} />;
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
            {burstInfo && <FullScreenBurst key={burstInfo.key} color={burstInfo.color} x={burstInfo.x} y={burstInfo.y} isGold={isGold} onDone={() => setBurstInfo(null)} />}
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
                                        <MiniDiamond dim={state === "idle"} rarity={results[i]?.rarity} cracking={state === "cracking"} />
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
    const [essenceMode, setEssenceMode] = useState<"purple" | "gold">("purple");

    const [sphereSize, setSphereSize] = useState(100);
    useEffect(() => {
        function onResize() {
            const w = window.innerWidth;
            setSphereSize(w < 500 ? 55 : w < 700 ? 70 : w < 1100 ? 105 : 145);
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
                goldEssences:      (pr as any).goldEssences      ?? 0,
                pityEliteGold:     (pr as any).pityEliteGold     ?? 0,
                pityLegendaryGold: (pr as any).pityLegendaryGold ?? 0,
                _boostedId:        bannerData?.boostedMythIds?.[0] ?? null,
                _boostedName:      bannerData?.boostedMythName   ?? null,
                _boostedRarity:    bannerData?.boostedRarity     ?? "LEGENDARY",
            } as any);
        } catch { setError("Failed to load Nexus"); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchData(); loadThree(); }, [fetchData]);

    async function handlePull(amount: 1 | 5) {
        const available = essenceMode === "gold" ? (pity?.goldEssences ?? 0) : (pity?.essences ?? 0);
        if (!pity || available < amount || pulling) return;
        setPulling(true); setError(null);
        try {
            const res: any = await api.nexusPull(amount, essenceMode);
            await fetchData();
            if (amount === 1) setSingleResult(res.results[0]);
            else setMultiResults(res.results);
        } catch (e: any) { setError(e.message ?? "Pull failed"); }
        finally { setPulling(false); }
    }

    const essences     = pity?.essences     ?? 0;
    const goldEssences = pity?.goldEssences ?? 0;
    const activeEssences = essenceMode === "gold" ? goldEssences : essences;
    const isGold = essenceMode === "gold";
    const boostedId     = (pity as any)?._boostedId     ?? null;
    const boostedRarity = ((pity as any)?._boostedRarity ?? "LEGENDARY") as Rarity;
    const boostedRS     = RS[boostedRarity];
    const boostedSlug   = boostedId ? toSlug(boostedId) : null;
    const boostedName   = (pity as any)?._boostedName ?? null;

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
                        <div style={{ width: "clamp(160px,22vw,260px)", minWidth: "clamp(160px,22vw,260px)", borderRight: "1px solid rgba(255,255,255,0.07)", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 1 }}>
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
                                    {isGold ? <GoldEssenceIcon size={13} /> : <EssenceIcon size={13} />}
                                    <span style={{ fontSize: "var(--font-2xs)", textTransform: "uppercase", letterSpacing: "0.1em", color: isGold ? "#fbbf24" : "#ffffff", fontWeight: 700 }}>Pity Tracker</span>
                                </div>
                                {(isGold ? PITY_KEYS_GOLD : PITY_KEYS_PURPLE).map(({ key, label, color, max }) => {
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

                        {/* CENTER: Fragmento arriba centrado + botones abajo */}
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", paddingTop: "clamp(6px,2vh,20px)", paddingBottom: "clamp(6px,1.5vh,16px)", position: "relative", zIndex: 1, minWidth: 0, overflow: "hidden" }}>
                            {/* Top area — fragmento flotante centrado */}
                            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 0 }}>
                            <div style={{ animation: "nxFloat 5s ease-in-out infinite", position: "relative", zIndex: 1 }}>
                                <DiamondFragment size={sphereSize} isGold={isGold} />
                            </div>
                            <div style={{ textAlign: "center", position: "relative", zIndex: 2, marginTop: -sphereSize * 0.12 }}>
                                <p style={{ fontSize: "var(--font-xs)", fontWeight: 700, color: isGold ? "#fbbf24" : "#ffffff", letterSpacing: "0.12em", textTransform: "uppercase", transition: "color 0.3s" }}>
                                    {isGold ? "Gold Essence" : "Essence"}
                                </p>
                            </div>

                            </div>{/* end top area */}

                            {/* Bottom controls — pegados abajo */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "clamp(4px,1vh,8px)", width: "100%", position: "relative", zIndex: 2 }}>
                            {/* Essence mode toggle — número prominente */}
                            <div style={{ display: "flex", gap: 6, position: "relative", zIndex: 2, width: "100%", maxWidth: 240, justifyContent: "center" }}>
                                {(["purple", "gold"] as const).map(mode => {
                                    const active = essenceMode === mode;
                                    const isG = mode === "gold";
                                    const count = isG ? goldEssences : essences;
                                    return (
                                        <button key={mode} onClick={() => setEssenceMode(mode)} style={{
                                            flex: 1,
                                            padding: "6px 10px",
                                            borderRadius: 9,
                                            border: `1px solid ${active ? (isG ? "rgba(251,191,36,0.6)" : "rgba(167,139,250,0.6)") : "rgba(255,255,255,0.08)"}`,
                                            background: active ? (isG ? "rgba(251,191,36,0.12)" : "rgba(123,47,255,0.15)") : "rgba(255,255,255,0.02)",
                                            cursor: "pointer", transition: "all 0.2s",
                                            boxShadow: active ? `0 0 10px ${isG ? "rgba(251,191,36,0.25)" : "rgba(123,47,255,0.25)"}` : "none",
                                            display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
                                        }}>
                                            {/* Label + icono */}
                                            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                                {isG
                                                    ? <GoldEssenceIcon size={10} style={{ opacity: active ? 1 : 0.4 }} />
                                                    : <EssenceIcon size={9} style={{ opacity: active ? 1 : 0.35 }} />
                                                }
                                                <span style={{
                                                    fontFamily: "'Rajdhani',sans-serif", fontWeight: 700,
                                                    fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
                                                    color: active ? (isG ? "#fbbf24" : "#c4b5fd") : "#5a6a80",
                                                    transition: "color 0.2s",
                                                }}>
                                                    {isG ? "Gold" : "Purple"}
                                                </span>
                                            </div>
                                            {/* Número prominente en blanco */}
                                            <span style={{
                                                fontFamily: "'Rajdhani',sans-serif", fontWeight: 800,
                                                fontSize: 18, lineHeight: 1,
                                                color: active ? "#ffffff" : "#334155",
                                                letterSpacing: "0.02em",
                                                transition: "color 0.2s",
                                            }}>
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {error && <p style={{ fontSize: "var(--font-xs)", color: "#f87171", textAlign: "center", maxWidth: 160, position: "relative", zIndex: 2 }}>{error}</p>}

                            {/* Botones — compactos, solo x1 en gold */}
                            <div style={{ display: "flex", gap: 6, position: "relative", zIndex: 10, width: "100%", maxWidth: 220, justifyContent: "center" }}>
                                {(isGold ? [1] as const : [1, 5] as const).map(n => {
                                    const canPull = activeEssences >= n && !pulling;
                                    const isX5 = n === 5;
                                    const borderColor = canPull
                                        ? isGold ? "rgba(251,191,36,0.65)" : (isX5 ? "rgba(123,47,255,0.75)" : "rgba(123,47,255,0.55)")
                                        : "rgba(255,255,255,0.1)";
                                    const bgColor = canPull
                                        ? isGold ? "rgba(251,191,36,0.14)" : (isX5 ? "rgba(123,47,255,0.28)" : "rgba(123,47,255,0.16)")
                                        : "rgba(255,255,255,0.03)";
                                    const textColor = canPull
                                        ? isGold ? "#fcd34d" : (isX5 ? "#e2d9ff" : "#c4b5fd")
                                        : "#5a6a80";
                                    const shadow = canPull
                                        ? isGold ? "0 0 12px rgba(251,191,36,0.3)" : `0 0 12px ${isX5 ? "rgba(123,47,255,0.4)" : "rgba(123,47,255,0.2)"}`
                                        : "none";
                                    return (
                                        <button key={n} onClick={() => handlePull(n)} disabled={pulling || activeEssences < n} style={{
                                            flex: 1,
                                            padding: "8px 0",
                                            borderRadius: 8,
                                            fontSize: "var(--font-xs)", fontWeight: 700, letterSpacing: "0.06em",
                                            cursor: canPull ? "pointer" : "not-allowed",
                                            border: `1px solid ${borderColor}`,
                                            background: bgColor, color: textColor,
                                            transition: "all 0.2s", boxShadow: shadow,
                                            whiteSpace: "nowrap",
                                            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                                        }}>
                                            {isGold && canPull && <GoldEssenceIcon size={12} />}
                                            {pulling ? "..." : `Open ×${n}`}
                                        </button>
                                    );
                                })}
                            </div>
                            </div>{/* end bottom controls */}
                        </div>

                        {/* RIGHT: responsive width */}
                        <div style={{ width: "clamp(130px,17vw,195px)", minWidth: "clamp(130px,17vw,195px)", borderLeft: "1px solid rgba(255,255,255,0.07)", padding: "10px clamp(8px,1.2vw,16px)", display: "flex", flexDirection: "column", gap: 4, position: "relative", zIndex: 1, overflow: "hidden" }}>
                            <p style={{ fontSize: "var(--font-2xs)", textTransform: "uppercase", letterSpacing: "0.1em", color: isGold ? "#fbbf24" : "#ffffff", fontWeight: 700, marginBottom: 3 }}>Rates</p>
                            {isGold ? (
                                // Gold Essence rates: EPIC 85% / ELITE 10% / LEGENDARY 5%
                                [
                                    { l: "Epic",      c: "#a855f7", tc: "#e9d5ff", r: "85%" },
                                    { l: "Elite",     c: "#22d3ee", tc: "#a5f3fc", r: "10%" },
                                    { l: "Legendary", c: "#fbbf24", tc: "#fde68a", r: "5%"  },
                                ].map(({ l, c, tc, r }) => (
                                    <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0", gap: 3 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                                            <div style={{ width: 6, height: 6, borderRadius: 1, background: c, flexShrink: 0, boxShadow: `0 0 4px ${c}` }} />
                                            <span style={{ fontSize: "var(--font-2xs)", color: tc, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l}</span>
                                        </div>
                                        <span style={{ fontSize: "var(--font-2xs)", fontFamily: "monospace", color: "#fde68a", flexShrink: 0, fontWeight: 700 }}>{r}</span>
                                    </div>
                                ))
                            ) : (
                                // Purple Essence rates estándar
                                [
                                    { l: "Common",    c: "#64748b", tc: "#e2e8f0", r: "60%" },
                                    { l: "Rare",      c: "#6366f1", tc: "#c7d2fe", r: "30%" },
                                    { l: "Epic",      c: "#a855f7", tc: "#e9d5ff", r: "7%"  },
                                    { l: "Elite",     c: "#22d3ee", tc: "#a5f3fc", r: "2.5%" },
                                    { l: "Legendary", c: "#fbbf24", tc: "#fde68a", r: "0.5%" },
                                ].map(({ l, c, tc, r }) => (
                                    <div key={l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "2px 0", gap: 3 }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 4, minWidth: 0 }}>
                                            <div style={{ width: 6, height: 6, borderRadius: 1, background: c, flexShrink: 0 }} />
                                            <span style={{ fontSize: "var(--font-2xs)", color: tc, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l}</span>
                                        </div>
                                        <span style={{ fontSize: "var(--font-2xs)", fontFamily: "monospace", color: "#e2e8f0", flexShrink: 0 }}>{r}</span>
                                    </div>
                                ))
                            )}
                            {/* Pity info según modo */}
                            <div style={{ marginTop: 5, paddingTop: 6, borderTop: `1px solid ${isGold ? "rgba(251,191,36,0.15)" : "rgba(255,255,255,0.07)"}` }}>
                                {isGold ? (
                                    <>
                                        <p style={{ fontSize: "var(--font-2xs)", color: "#fbbf24", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 3 }}>Pity</p>
                                        <p style={{ fontSize: "var(--font-2xs)", color: "#a8b5c8", lineHeight: 1.5 }}>Elite in 10 · Legendary in 15 · Epic always</p>
                                    </>
                                ) : (
                                    <>
                                        <p style={{ fontSize: "var(--font-2xs)", color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, marginBottom: 3 }}>Boost ×10</p>
                                        <p style={{ fontSize: "var(--font-2xs)", color: "#a8b5c8", lineHeight: 1.5 }}>If you get the featured myth's rarity, ×10 chance it's them.</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {singleResult && <RevealSingle result={singleResult} isGold={isGold} onBack={() => setSingleResult(null)} />}
            {multiResults && <RevealMulti results={multiResults} isGold={isGold} onBack={() => setMultiResults(null)} />}
        </PageShell>
    );
}
