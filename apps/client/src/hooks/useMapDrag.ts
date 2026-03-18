import { useState, useRef, useEffect, useCallback } from "react";

const STORAGE_KEY = "mythara_map_offset";

function readStoredOffset(): { x: number; y: number } | null {
    try {
        const raw = sessionStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") return parsed;
    } catch {}
    return null;
}

/**
 * useMapDrag
 *
 * Shared hook for draggable full-screen map pages.
 * Used by: HomePage, SanctuariesPage, and all future sub-map pages.
 *
 * Options:
 * - initialYRatio: 0 = show top of map, 0.5 = center (default), 1 = show bottom
 *   (ignored if a saved position exists in sessionStorage)
 */
export function useMapDrag(
    containerRef: React.RefObject<HTMLDivElement>,
    mapRef: React.RefObject<HTMLDivElement>,
    options: { initialYRatio?: number } = {}
) {
    const { initialYRatio = 0.5 } = options;

    // Initialize from sessionStorage if available
    const [offset, setOffsetRaw] = useState<{ x: number; y: number }>(
        () => readStoredOffset() ?? { x: 0, y: 0 }
    );

    // Wrap setOffset to persist to sessionStorage on every change
    const setOffset = useCallback((value: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => {
        setOffsetRaw(prev => {
            const next = typeof value === "function" ? value(prev) : value;
            try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
            return next;
        });
    }, []);

    const dragging  = useRef(false);
    const startPos  = useRef({ x: 0, y: 0 });
    const startOff  = useRef({ x: 0, y: 0 });
    const didDrag   = useRef(false);
    const centered  = useRef(false);

    // Momentum
    const lastPos   = useRef({ x: 0, y: 0 });
    const lastTime  = useRef(0);
    const velocity  = useRef({ x: 0, y: 0 });
    const rafRef    = useRef<number | null>(null);

    const clamp = useCallback((ox: number, oy: number) => {
        const c = containerRef.current;
        const m = mapRef.current;
        if (!c || !m) return { x: ox, y: oy };
        return {
            x: Math.max(Math.min(0, c.offsetWidth  - m.offsetWidth),  Math.min(0, ox)),
            y: Math.max(Math.min(0, c.offsetHeight - m.offsetHeight), Math.min(0, oy)),
        };
    }, [containerRef, mapRef]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (centered.current) return;
            const c = containerRef.current;
            const m = mapRef.current;
            if (!c || !m) return;
            centered.current = true;

            // If we have a saved position, clamp it to current viewport and restore it
            const stored = readStoredOffset();
            if (stored) {
                setOffset(clamp(stored.x, stored.y));
                return;
            }

            // No saved position — use initialYRatio default
            const maxOffsetY = Math.min(0, c.offsetHeight - m.offsetHeight);
            const targetY = maxOffsetY * initialYRatio;
            setOffset(clamp(
                (c.offsetWidth - m.offsetWidth) / 2,
                targetY,
            ));
        }, 80);
        return () => clearTimeout(timer);
    }, [clamp, containerRef, mapRef, initialYRatio, setOffset]);

    // Momentum animation loop
    const startMomentum = useCallback((vx: number, vy: number) => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        const FRICTION = 0.92;
        const MIN_VEL  = 0.3;

        const tick = () => {
            vx *= FRICTION;
            vy *= FRICTION;
            if (Math.abs(vx) < MIN_VEL && Math.abs(vy) < MIN_VEL) return;
            setOffset(prev => {
                const next = clamp(prev.x + vx, prev.y + vy);
                if (next.x === prev.x) vx = 0;
                if (next.y === prev.y) vy = 0;
                return next;
            });
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
    }, [clamp, setOffset]);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        dragging.current = true;
        didDrag.current  = false;
        startPos.current = { x: e.clientX, y: e.clientY };
        startOff.current = { ...offset };
        lastPos.current  = { x: e.clientX, y: e.clientY };
        lastTime.current = performance.now();
        velocity.current = { x: 0, y: 0 };
    }, [offset]);

    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!dragging.current) return;
            const dx = e.clientX - startPos.current.x;
            const dy = e.clientY - startPos.current.y;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
            setOffset(clamp(startOff.current.x + dx, startOff.current.y + dy));

            const now = performance.now();
            const dt  = now - lastTime.current;
            if (dt > 0) {
                velocity.current = {
                    x: (e.clientX - lastPos.current.x) / dt * 16,
                    y: (e.clientY - lastPos.current.y) / dt * 16,
                };
            }
            lastPos.current  = { x: e.clientX, y: e.clientY };
            lastTime.current = now;
        };
        const onUp = () => {
            if (!dragging.current) return;
            dragging.current = false;
            startMomentum(velocity.current.x, velocity.current.y);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup",   onUp);
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup",   onUp);
        };
    }, [clamp, startMomentum, setOffset]);

    const onTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length !== 1) return;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        dragging.current = true;
        didDrag.current  = false;
        startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        startOff.current = { ...offset };
        lastPos.current  = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        lastTime.current = performance.now();
        velocity.current = { x: 0, y: 0 };
    }, [offset]);

    useEffect(() => {
        const onMove = (e: TouchEvent) => {
            if (!dragging.current || e.touches.length !== 1) return;
            const dx = e.touches[0].clientX - startPos.current.x;
            const dy = e.touches[0].clientY - startPos.current.y;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
            setOffset(clamp(startOff.current.x + dx, startOff.current.y + dy));

            const now = performance.now();
            const dt  = now - lastTime.current;
            if (dt > 0) {
                velocity.current = {
                    x: (e.touches[0].clientX - lastPos.current.x) / dt * 16,
                    y: (e.touches[0].clientY - lastPos.current.y) / dt * 16,
                };
            }
            lastPos.current  = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            lastTime.current = now;
        };
        const onEnd = () => {
            if (!dragging.current) return;
            dragging.current = false;
            startMomentum(velocity.current.x, velocity.current.y);
        };
        window.addEventListener("touchmove", onMove, { passive: true });
        window.addEventListener("touchend",  onEnd);
        return () => {
            window.removeEventListener("touchmove", onMove);
            window.removeEventListener("touchend",  onEnd);
        };
    }, [clamp, startMomentum, setOffset]);

    useEffect(() => {
        const ro = new ResizeObserver(() => setOffset(p => clamp(p.x, p.y)));
        if (containerRef.current) ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [clamp, containerRef, setOffset]);

    // Cleanup RAF on unmount
    useEffect(() => () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); }, []);

    return { offset, onMouseDown, onTouchStart, didDrag };
}
