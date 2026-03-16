import { useState, useRef, useEffect, useCallback } from "react";

/**
 * useMapDrag
 *
 * Shared hook for draggable full-screen map pages.
 * Used by: HomePage, SanctuariesPage, and all future sub-map pages.
 *
 * Options:
 * - initialYRatio: 0 = show top of map, 0.5 = center (default), 1 = show bottom
 */
export function useMapDrag(
    containerRef: React.RefObject<HTMLDivElement>,
    mapRef: React.RefObject<HTMLDivElement>,
    options: { initialYRatio?: number } = {}
) {
    const { initialYRatio = 0.5 } = options;

    const [offset, setOffset]   = useState({ x: 0, y: 0 });
    const dragging  = useRef(false);
    const startPos  = useRef({ x: 0, y: 0 });
    const startOff  = useRef({ x: 0, y: 0 });
    const didDrag   = useRef(false);
    const centered  = useRef(false);

    const clamp = useCallback((ox: number, oy: number) => {
        const c = containerRef.current;
        const m = mapRef.current;
        if (!c || !m) return { x: ox, y: oy };
        return {
            x: Math.max(Math.min(0, c.offsetWidth  - m.offsetWidth),  Math.min(0, ox)),
            y: Math.max(Math.min(0, c.offsetHeight - m.offsetHeight), Math.min(0, oy)),
        };
    }, [containerRef, mapRef]);

    // Set initial position based on initialYRatio
    // 0 = top (x centered, y at top) — shows top of map (Arcanum)
    // 0.5 = center — default for SanctuariesPage
    // 1 = bottom — shows bottom of map
    useEffect(() => {
        const timer = setTimeout(() => {
            if (centered.current) return;
            const c = containerRef.current;
            const m = mapRef.current;
            if (!c || !m) return;
            centered.current = true;

            const maxOffsetY = Math.min(0, c.offsetHeight - m.offsetHeight); // negative
            const targetY = maxOffsetY * initialYRatio; // 0 = top, negative = pushed up

            setOffset(clamp(
                (c.offsetWidth - m.offsetWidth) / 2,  // always center horizontally
                targetY,
            ));
        }, 80);
        return () => clearTimeout(timer);
    }, [clamp, containerRef, mapRef, initialYRatio]);

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
        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup",   onUp);
        };
    }, [clamp]);

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
        return () => {
            window.removeEventListener("touchmove", onMove);
            window.removeEventListener("touchend",  onEnd);
        };
    }, [clamp]);

    useEffect(() => {
        const ro = new ResizeObserver(() => setOffset(p => clamp(p.x, p.y)));
        if (containerRef.current) ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [clamp, containerRef]);

    return { offset, onMouseDown, onTouchStart, didDrag };
}
