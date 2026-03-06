import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import TrainerSidebar from "../components/TrainerSidebar";
import { api } from "../lib/api";

const BADGE_ICONS = ["🪨", "💧", "⚡", "🌿", "☠️", "🔮", "🔥", "🌍"];

export default function GimansiosPage() {
    const [gyms, setGyms] = useState<any[]>([]);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState<number | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        api.gyms().then(setGyms);
    }, []);

    async function handleChallenge(gymId: number) {
        setError("");
        setResult(null);
        setLoading(gymId);
        try {
            const res = await api.challengeGym(gymId);
            setResult(res);
            setGyms(await api.gyms());
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(null);
        }
    }

    return (
        <Layout sidebar={<TrainerSidebar />}>
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
                <h1 className="font-display font-bold text-2xl tracking-widest">
                    🏅 <span className="text-yellow">Gimnasios</span>
                </h1>
                {result && (
                    <div
                        className={`px-4 py-1.5 rounded-xl border font-display font-bold text-sm
                        ${result.result === "WIN" ? "border-green/30 text-green bg-green/10" : "border-red/30 text-red bg-red/10"}`}
                    >
                        {result.result === "WIN" ? `🏆 ${result.gym.badge}` : "💀 Derrota"}
                        <span className="text-muted font-normal ml-2 text-xs">
                            +{result.xpGained}XP +{result.coinsGained}💰
                        </span>
                    </div>
                )}
                {error && (
                    <div className="px-4 py-1.5 rounded-xl border border-red/30 text-red bg-red/10 font-display text-sm">
                        ❌ {error}
                    </div>
                )}
            </div>

            {/* Grid 4x2 de gimnasios */}
            <div className="flex-1 p-6 grid grid-cols-4 grid-rows-2 gap-3 overflow-hidden">
                {gyms.map((gym: any) => (
                    <div
                        key={gym.id}
                        className={`bg-card border rounded-2xl p-4 flex flex-col transition-all relative overflow-hidden
                            ${
                                gym.earned
                                    ? "border-yellow/40"
                                    : gym.unlocked
                                      ? "border-border hover:border-blue/40"
                                      : "border-border opacity-50"
                            }`}
                        style={gym.earned ? { boxShadow: "0 0 12px rgba(255,214,10,0.1)" } : {}}
                    >
                        {gym.earned && <div className="absolute top-3 right-3 text-lg">✅</div>}

                        <div className="text-3xl mb-2">{BADGE_ICONS[gym.id]}</div>
                        <div className="font-display font-bold text-sm leading-tight mb-0.5">{gym.name}</div>
                        <div className="text-muted text-xs mb-1">{gym.leader}</div>
                        <div className="text-xs text-muted flex-1">
                            Nv. mín. <span className="text-yellow font-bold font-display">{gym.requiredLevel}</span>
                        </div>

                        {gym.unlocked && !gym.earned && (
                            <button
                                onClick={() => handleChallenge(gym.id)}
                                disabled={loading === gym.id}
                                className="mt-2 py-1.5 rounded-lg font-display font-bold text-xs tracking-widest uppercase disabled:opacity-50 transition-all"
                                style={{ background: "linear-gradient(135deg,#e63946,#c1121f)" }}
                            >
                                {loading === gym.id ? "..." : "⚔️ Retar"}
                            </button>
                        )}
                        {!gym.unlocked && !gym.earned && (
                            <div className="mt-2 text-center text-muted text-xs font-display">🔒</div>
                        )}
                    </div>
                ))}
            </div>
        </Layout>
    );
}
