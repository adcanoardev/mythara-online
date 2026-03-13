import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { api } from "./lib/api";

// Guard global: si hay combate activo, redirige a /battle.
// Envuelve todas las rutas que NO son /battle, /login, /onboarding, /fragment.
function BattleGuard({ children }: { children: React.ReactNode }) {
    const navigate = useNavigate();
    const location = useLocation();
    useEffect(() => {
        // Check rápido sin red
        if (localStorage.getItem("mythara_battle_active") === "1") {
            navigate("/battle", { replace: true });
            return;
        }
        // Fallback servidor (cubre apertura directa de URL en otra pestaña)
        let cancelled = false;
        api.battleNpcActive()
            .then((session: any) => {
                if (cancelled) return;
                if (session?.status === "ongoing") {
                    localStorage.setItem("mythara_battle_active", "1");
                    navigate("/battle", { replace: true });
                }
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [location.pathname, navigate]);
    return <>{children}</>;
}
import LoginPage from "./pages/LoginPage";
import CombatPage from "./pages/BattlePage";
import InventarioPage from "./pages/InventarioPage";
import RankingPage from "./pages/RankingPage";
import PerfilPage from "./pages/PerfilPage";
import OnboardingPage from "./pages/OnboardingPage";
import PosadaPage from "./pages/PosadaPage";
import SantuariosPage from "./pages/SantuariosPage";
import EquipoPage from "./pages/EquipoPage";
import FragmentPage from "./pages/FragmentPage";
import MythsPage from "./pages/MythsPage";

export default function App() {
    const { user, loading } = useAuth();
    if (loading)
        return (
            <div className="flex items-center justify-center min-h-screen bg-bg">
                <div className="font-display text-2xl text-yellow tracking-widest animate-pulse">CARGANDO...</div>
            </div>
        );

    return (
        <Routes>
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
            <Route
                path="/"
                element={
                    user ? (
                        user.onboardingComplete ? (
                            <BattleGuard><PosadaPage /></BattleGuard>
                        ) : (
                            <Navigate to="/onboarding" />
                        )
                    ) : (
                        <Navigate to="/login" />
                    )
                }
            />
            <Route path="/ranking" element={user ? <BattleGuard><RankingPage /></BattleGuard> : <Navigate to="/login" />} />
            <Route path="/onboarding" element={user ? <OnboardingPage /> : <Navigate to="/login" />} />
            <Route path="/myths" element={user ? <BattleGuard><MythsPage /></BattleGuard> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <BattleGuard><PerfilPage /></BattleGuard> : <Navigate to="/login" />} />
            <Route path="/team" element={user ? <BattleGuard><EquipoPage /></BattleGuard> : <Navigate to="/login" />} />
            <Route path="/battle" element={user ? <CombatPage /> : <Navigate to="/login" />} />
            <Route path="/fragment" element={<FragmentPage />} />
            <Route path="/inventory" element={user ? <BattleGuard><InventarioPage /></BattleGuard> : <Navigate to="/login" />} />
            <Route path="/sanctums" element={user ? <BattleGuard><SantuariosPage /></BattleGuard> : <Navigate to="/login" />} />
        </Routes>
    );
}
