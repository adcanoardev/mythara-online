// apps/client/src/components/LoadingScreen.tsx
import { useEffect, useState } from "react";

const MESSAGES = [
    "Loading assets...",
    "Invoking your myths...",
    "Distorting the universe...",
    "Syncing the multiverse...",
    "Awakening the Binders...",
    "Calibrating Nexus energy...",
    "Opening dimensional rifts...",
    "Binding the ancient forces...",
];

const LOADING_IMAGE = "https://cdn.jsdelivr.net/gh/adcanoardev/mythara-assets@53526ca4b68477020ac5434b7341683097b15381/loading/loading_1.webp";
const LOGO = "https://cdn.jsdelivr.net/gh/adcanoardev/mythara-assets@20c2494c976794775042d559db3df66687914944/logo/mythara_logo.webp";

export default function LoadingScreen() {
    const [progress, setProgress] = useState(0);
    const [msgIdx, setMsgIdx] = useState(0);

    useEffect(() => {
        // Progreso: sube rápido al principio, se frena al llegar a ~90, espera datos reales
        let current = 0;
        const interval = setInterval(() => {
            setProgress(prev => {
                // Curva: rápido hasta 70, lento hasta 92, se queda ahí esperando
                const speed = prev < 40 ? 3.5 : prev < 70 ? 1.8 : prev < 88 ? 0.4 : 0;
                const next = Math.min(prev + speed, 92);
                return next;
            });
        }, 60);

        // Rotar mensajes cada 900ms
        const msgInterval = setInterval(() => {
            setMsgIdx(i => (i + 1) % MESSAGES.length);
        }, 900);

        return () => {
            clearInterval(interval);
            clearInterval(msgInterval);
        };
    }, []);

    // Cuando el parent desmonta este componente, la barra llega a 100
    useEffect(() => {
        return () => setProgress(100);
    }, []);

    return (
        <div
            className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
            style={{ background: "#070b14", fontFamily: "'Exo 2', sans-serif", zIndex: 9999 }}
        >
            {/* Imagen de fondo */}
            <img
                src={LOADING_IMAGE}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: 0.6 }}
            />

            {/* Overlay oscuro para legibilidad */}
            <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to bottom, rgba(7,11,20,0.3) 0%, rgba(7,11,20,0.15) 50%, rgba(7,11,20,0.85) 100%)" }}
            />

            {/* Logo centrado */}
            <div className="relative z-10 flex flex-col items-center" style={{ marginBottom: "auto", paddingTop: "8vh" }}>
                <img
                    src={LOGO}
                    alt="Mythara"
                    style={{ width: "clamp(100px, 18vw, 180px)", objectFit: "contain", filter: "drop-shadow(0 0 40px rgba(123,47,255,0.6))" }}
                />
            </div>

            {/* Barra de progreso + texto — parte inferior */}
            <div
                className="relative z-10 flex flex-col items-center w-full"
                style={{ padding: "0 clamp(24px, 8vw, 120px)", paddingBottom: "clamp(24px, 5vh, 60px)" }}
            >
                {/* Texto dinámico */}
                <p
                    key={msgIdx}
                    style={{
                        fontFamily: "'Rajdhani', sans-serif",
                        fontWeight: 600,
                        fontSize: "clamp(11px, 1.4vw, 14px)",
                        letterSpacing: "0.2em",
                        textTransform: "uppercase",
                        color: "rgba(167,139,250,0.85)",
                        marginBottom: 10,
                        animation: "loadingMsgFade 0.4s ease-in-out",
                        textShadow: "0 0 20px rgba(167,139,250,0.5)",
                    }}
                >
                    {MESSAGES[msgIdx]}
                </p>

                {/* Barra de progreso */}
                <div
                    style={{
                        width: "100%",
                        maxWidth: 480,
                        height: 3,
                        background: "rgba(255,255,255,0.08)",
                        borderRadius: 2,
                        overflow: "hidden",
                        border: "1px solid rgba(123,47,255,0.2)",
                    }}
                >
                    <div
                        style={{
                            height: "100%",
                            width: `${progress}%`,
                            background: "linear-gradient(90deg, #7b2fff, #a78bfa, #4cc9f0)",
                            borderRadius: 2,
                            transition: "width 0.15s linear",
                            boxShadow: "0 0 12px rgba(123,47,255,0.7), 0 0 24px rgba(76,201,240,0.3)",
                        }}
                    />
                </div>

                {/* Porcentaje */}
                <p
                    style={{
                        fontFamily: "monospace",
                        fontSize: "clamp(9px, 1vw, 11px)",
                        color: "rgba(255,255,255,0.3)",
                        marginTop: 6,
                        letterSpacing: "0.1em",
                    }}
                >
                    {Math.round(progress)}%
                </p>
            </div>

            <style>{`
                @keyframes loadingMsgFade {
                    from { opacity: 0; transform: translateY(4px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
