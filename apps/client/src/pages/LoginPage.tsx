import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
    const { login, register } = useAuth();
    const [mode, setMode] = useState<"login" | "register">("login");
    const [form, setForm] = useState({ username: "", email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit() {
        setError("");
        setLoading(true);
        try {
            if (mode === "login") await login(form.email, form.password);
            else await register(form.username, form.email, form.password);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center relative overflow-hidden">
            {/* Fondo animado */}
            <div className="absolute inset-0 pointer-events-none">
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "radial-gradient(ellipse 80% 60% at 20% 50%, rgba(230,57,70,0.1) 0%, transparent 60%), radial-gradient(ellipse 60% 80% at 80% 30%, rgba(76,201,240,0.07) 0%, transparent 60%)",
                    }}
                />
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage:
                            "linear-gradient(rgba(76,201,240,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(76,201,240,0.03) 1px, transparent 1px)",
                        backgroundSize: "40px 40px",
                    }}
                />
            </div>

            {/* Card */}
            <div className="relative w-[420px] bg-card border border-border rounded-2xl p-12 shadow-2xl">
                {/* Logo */}
                <div className="text-center mb-10">
                    <svg className="w-16 h-16 mx-auto mb-4" viewBox="0 0 60 60" fill="none">
                        <circle cx="30" cy="30" r="28" stroke="#ffd60a" strokeWidth="2" />
                        <line x1="2" y1="30" x2="58" y2="30" stroke="#ffd60a" strokeWidth="2" />
                        <circle cx="30" cy="30" r="8" fill="#ffd60a" stroke="#070b14" strokeWidth="3" />
                        <circle cx="30" cy="30" r="4" fill="#070b14" />
                    </svg>
                    <h1
                        className="font-display font-bold text-5xl tracking-widest"
                        style={{
                            background: "linear-gradient(135deg, #ffd60a, #e63946)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        POKÉMMO
                    </h1>
                    <p className="text-muted text-xs tracking-[6px] uppercase mt-1">Online Idle MMO</p>
                </div>

                {/* Campos */}
                {mode === "register" && (
                    <div className="mb-4">
                        <label className="block text-xs text-muted tracking-widest uppercase mb-2">Entrenador</label>
                        <input
                            className="w-full bg-white/5 border border-border rounded-lg px-4 py-3 text-sm outline-none focus:border-blue transition-colors"
                            placeholder="AshKetchum"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                        />
                    </div>
                )}
                <div className="mb-4">
                    <label className="block text-xs text-muted tracking-widest uppercase mb-2">Email</label>
                    <input
                        className="w-full bg-white/5 border border-border rounded-lg px-4 py-3 text-sm outline-none focus:border-blue transition-colors"
                        placeholder="ash@pokemon.com"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                </div>
                <div className="mb-6">
                    <label className="block text-xs text-muted tracking-widest uppercase mb-2">Contraseña</label>
                    <input
                        className="w-full bg-white/5 border border-border rounded-lg px-4 py-3 text-sm outline-none focus:border-blue transition-colors"
                        placeholder="••••••••"
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    />
                </div>

                {error && <p className="text-red text-sm mb-4 text-center">{error}</p>}

                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full py-4 rounded-xl font-display font-bold text-lg tracking-widest uppercase transition-all disabled:opacity-50"
                    style={{
                        background: "linear-gradient(135deg, #e63946, #c1121f)",
                        boxShadow: "0 0 20px rgba(230,57,70,0.4)",
                    }}
                >
                    {loading ? "..." : mode === "login" ? "Entrar al mundo" : "Crear entrenador"}
                </button>

                <div className="relative my-5 text-center">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border" />
                    </div>
                    <span className="relative bg-card px-3 text-xs text-muted">o</span>
                </div>

                <button
                    onClick={() => {
                        setMode(mode === "login" ? "register" : "login");
                        setError("");
                    }}
                    className="w-full py-3 rounded-xl border border-border text-muted font-display font-semibold text-sm tracking-widest uppercase hover:border-blue hover:text-blue transition-all"
                >
                    {mode === "login" ? "Crear nueva cuenta" : "Ya tengo cuenta"}
                </button>
            </div>
        </div>
    );
}
