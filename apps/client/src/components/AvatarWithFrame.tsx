// apps/client/src/components/AvatarWithFrame.tsx
// Avatar con marco PNG superpuesto.
// El frame PNG es más grande que el avatar y lo rodea por fuera.
// Estructura: contenedor = tamaño total (avatar + margen del frame)
//   - avatar: inset = margen (espacio para el borde del frame)
//   - frame: inset:0 = ocupa todo el contenedor (rodea al avatar)

import React from "react";

const AVATAR_CDN = "https://cdn.jsdelivr.net/gh/adcanoardev/mythara-assets@8788a27ffc7fdfbb47b3379de8219f24117be8aa/avatars";
const FRAME_CDN  = "https://cdn.jsdelivr.net/gh/adcanoardev/mythara-assets@20c2494c976794775042d559db3df66687914944/frames";

export function avatarUrl(av: string): string {
    const id = av.startsWith("avatar_") ? av : `avatar_${av}`;
    return `${AVATAR_CDN}/${id}.webp`;
}

export function frameUrl(frameId: string): string {
    return `${FRAME_CDN}/${frameId}.webp`;
}

interface AvatarWithFrameProps {
    /** ID del avatar, ej: "avatar_male_1" o "male_1" (legacy) */
    avatar: string;
    /** ID del frame, ej: "frame_3". Si es null/undefined, no muestra frame */
    frameId?: string | null;
    /** Tamaño total del componente (incluye el frame). Default: 120 */
    size?: number;
    /** Margen interior del avatar respecto al frame. Default: 10% del size */
    padding?: number;
    /** onClick handler */
    onClick?: () => void;
    /** Badge de nivel encima del frame */
    level?: number;
    /** className adicional */
    className?: string;
}

export default function AvatarWithFrame({
    avatar,
    frameId,
    size = 120,
    padding,
    onClick,
    level,
    className = "",
}: AvatarWithFrameProps) {
    // El padding por defecto es ~10% del tamaño para que el frame se vea bien
    const p = padding ?? Math.round(size * 0.10);

    const Tag = onClick ? "button" : "div";

    return (
        <Tag
            onClick={onClick}
            className={className}
            style={{
                position: "relative",
                width: size,
                height: size,
                flexShrink: 0,
                padding: 0,
                border: "none",
                background: "none",
                cursor: onClick ? "pointer" : "default",
                display: "block",
            }}
        >
            {/* z1 — Avatar: inset = padding, así el frame lo rodea */}
            <div style={{
                position: "absolute",
                top: p, left: p, right: p, bottom: p,
                borderRadius: 6,
                overflow: "hidden",
                background: "linear-gradient(160deg,#1a1a2e,#0d1025)",
                zIndex: 1,
            }}>
                {/* Fallback emoji */}
                <div style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: Math.round(size * 0.35),
                }}>🧙</div>
                <img
                    src={avatarUrl(avatar)}
                    onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                    style={{
                        position: "absolute", inset: 0,
                        width: "100%", height: "100%",
                        objectFit: "cover", objectPosition: "top",
                        display: "block",
                    }}
                    alt=""
                />
            </div>

            {/* z2 — Frame: inset:0, ocupa todo el contenedor, rodea al avatar */}
            {frameId && (
                <img
                    src={frameUrl(frameId)}
                    alt=""
                    style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        pointerEvents: "none",
                        zIndex: 2,
                    }}
                />
            )}

            {/* z3 — Nivel badge encima del frame */}
            {level !== undefined && (
                <div style={{
                    position: "absolute",
                    top: Math.round(p * 0.3),
                    left: Math.round(p * 0.3),
                    zIndex: 3,
                    width: Math.round(size * 0.22),
                    height: Math.round(size * 0.22),
                    background: "linear-gradient(135deg,#78350f,#fbbf24)",
                    border: "2px solid #020810",
                    borderRadius: 5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Rajdhani,sans-serif",
                    fontWeight: 700,
                    fontSize: Math.round(size * 0.115),
                    color: "#020810",
                    lineHeight: 1,
                }}>
                    {level}
                </div>
            )}
        </Tag>
    );
}
