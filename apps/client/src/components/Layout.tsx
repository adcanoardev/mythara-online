import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const NAV = [
    { icon: "🏡", label: "Posada", path: "/" },
    { icon: "⚔️", label: "Combatir", path: "/combate" },
    { icon: "🎒", label: "Inventario", path: "/inventario" },
    { icon: "🏅", label: "Santuarios", path: "/santuarios" },
    { icon: "🏆", label: "Ranking", path: "/ranking" },
    { icon: "👤", label: "Perfil", path: "/perfil" },
];

interface Props {
    children: React.ReactNode;
    sidebar?: React.ReactNode;
}

export default function Layout({ children, sidebar }: Props) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="h-screen w-screen overflow-hidden flex flex-col bg-bg">
            {/* Top bar — altura fija */}
            <header className="flex-shrink-0 bg-bg/90 backdrop-blur border-b border-border px-6 h-14 flex items-center justify-between">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
                    <svg className="w-6 h-6" viewBox="0 0 60 60" fill="none">
                        <circle cx="30" cy="30" r="28" stroke="#ffd60a" strokeWidth="2" />
                        <line x1="2" y1="30" x2="58" y2="30" stroke="#ffd60a" strokeWidth="2" />
                        <circle cx="30" cy="30" r="6" fill="#ffd60a" stroke="#070b14" strokeWidth="2" />
                    </svg>
                    <span className="font-display font-bold text-lg tracking-widest text-yellow">MYTHARA</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="font-display text-sm text-muted tracking-wider hidden sm:block">
                        {user?.username}
                    </span>
                    <button
                        onClick={logout}
                        className="px-3 py-1 border border-border rounded-lg text-muted text-xs font-display tracking-widest uppercase hover:border-red hover:text-red transition-all"
                    >
                        Salir
                    </button>
                </div>
            </header>

            {/* Body — ocupa todo lo restante */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar — ancho fijo, scroll interno si hace falta */}
                <aside className="w-56 flex-shrink-0 border-r border-border flex flex-col overflow-hidden">
                    {/* Info del entrenador */}
                    {sidebar && <div className="flex-shrink-0 p-3 border-b border-border">{sidebar}</div>}
                    {/* Navegación */}
                    <nav className="flex-1 p-2 flex flex-col gap-0.5">
                        {NAV.map((item) => {
                            const active = location.pathname === item.path;
                            return (
                                <div
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all
                                        ${
                                            active
                                                ? "bg-red/10 text-red border-l-2 border-red"
                                                : "text-muted hover:bg-white/5 hover:text-white"
                                        }`}
                                >
                                    <span>{item.icon}</span>
                                    <span className="font-display tracking-wide">{item.label}</span>
                                </div>
                            );
                        })}
                    </nav>
                </aside>

                {/* Contenido principal — ocupa el resto, sin overflow */}
                <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
            </div>
        </div>
    );
}
