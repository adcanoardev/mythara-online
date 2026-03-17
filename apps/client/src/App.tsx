import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { api } from "./lib/api";

// Guard: if there's an active battle, redirect to /battle.
// Wraps all routes except /battle, /login, /onboarding, /fragment.
function BattleGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (localStorage.getItem("mythara_battle_active") === "1") {
      navigate("/battle", { replace: true });
      return;
    }
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

import LoginPage        from "./pages/LoginPage";
import OnboardingPage   from "./pages/OnboardingPage";
import HomePage         from "./pages/HomePage";
import BattlePage       from "./pages/BattlePage";
import InnPage          from "./pages/InnPage";
import SanctuariesPage  from "./pages/SanctuariesPage";
import ProfilePage      from "./pages/ProfilePage";
import TeamPage         from "./pages/TeamPage";
import InventoryPage    from "./pages/InventoryPage";
import MythsPage        from "./pages/MythsPage";
import RankingPage      from "./pages/RankingPage";
import RuinsPage        from "./pages/RuinsPage";
import ArenaPage        from "./pages/ArenaPage";

// Placeholder for pages not yet implemented
function ComingSoon({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <div className="font-display text-2xl text-yellow tracking-widest opacity-50">
        {name}
      </div>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg">
        <div className="font-display text-2xl text-yellow tracking-widest animate-pulse">
          LOADING...
        </div>
      </div>
    );

  // Helper: require auth + wrap with BattleGuard
  const guard = (el: React.ReactNode) =>
    user ? <BattleGuard>{el}</BattleGuard> : <Navigate to="/login" />;

  return (
    <Routes>
      {/* ── Auth ─────────────────────────────────────────────── */}
      <Route path="/login"      element={!user ? <LoginPage /> : <Navigate to="/" />} />
      <Route path="/onboarding" element={user ? <OnboardingPage /> : <Navigate to="/login" />} />

      {/* ── Home — fullscreen, no Layout ─────────────────────── */}
      <Route
        path="/"
        element={
          user
            ? user.onboardingComplete
              ? <BattleGuard><HomePage /></BattleGuard>
              : <Navigate to="/onboarding" />
            : <Navigate to="/login" />
        }
      />

      {/* ── City districts — fullscreen, no Layout ───────────── */}
      <Route path="/arena"   element={guard(<ArenaPage />)} />
      <Route path="/ruins"   element={guard(<RuinsPage />)} />
      <Route path="/tavern"  element={guard(<ComingSoon name="TAVERN" />)} />
      <Route path="/nexus"   element={guard(<ComingSoon name="NEXUS" />)} />
      <Route path="/market"  element={guard(<ComingSoon name="MARKET" />)} />
      <Route path="/guild"   element={guard(<ComingSoon name="GUILD" />)} />

      {/* ── Game pages — with Layout ──────────────────────────── */}
      <Route path="/battle"      element={user ? <BattlePage /> : <Navigate to="/login" />} />
      <Route path="/inn"         element={guard(<InnPage />)} />
      <Route path="/sanctuaries" element={guard(<SanctuariesPage />)} />
      <Route path="/profile"     element={guard(<ProfilePage />)} />
      <Route path="/team"        element={guard(<TeamPage />)} />
      <Route path="/inventory"   element={guard(<InventoryPage />)} />
      <Route path="/myths"       element={guard(<MythsPage />)} />
      <Route path="/ranking"     element={guard(<RankingPage />)} />

      {/* ── Fallback ──────────────────────────────────────────── */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
