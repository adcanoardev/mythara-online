import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { api } from "./lib/api";

// Guard: if there's an active battle, redirect to /battle.
// Wraps all routes except /battle, /login, /onboarding.
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

import LoginPage           from "./pages/LoginPage";
import OnboardingPage      from "./pages/OnboardingPage";
import HomePage            from "./pages/HomePage";
import BattlePage          from "./pages/BattlePage";
import OutpostPage         from "./pages/OutpostPage";
import TavernPage          from "./pages/TavernPage";
import SanctuariesPage     from "./pages/SanctuariesPage";
import ProfilePage         from "./pages/ProfilePage";
import TeamPage            from "./pages/TeamPage";
import InventoryPage       from "./pages/InventoryPage";
import MythsPage           from "./pages/MythsPage";
import RankingPage         from "./pages/RankingPage";
import RuinsPage           from "./pages/RuinsPage";
import ArenaPage           from "./pages/ArenaPage";
import GuildPage           from "./pages/GuildPage";
import MarketPage          from "./pages/MarketPage";
import NexusPage           from "./pages/NexusPage";
import AccountSettingsPage from "./pages/AccountSettingsPage";
import ChatPanel           from "./components/ChatPanel";
import LoadingScreen       from "./components/LoadingScreen";
import { useTrainer }      from "./context/TrainerContext";

function ComingSoon({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <div className="font-display text-2xl text-yellow tracking-widest opacity-50">
        {name}
      </div>
    </div>
  );
}

function ChatButtonFloating({ user, onOpen }: { user: any; onOpen: () => void }) {
  const location = useLocation();
  const pagesWithOwnChat = [
    "/", "/tavern", "/outpost", "/guild", "/arena", "/ruins",
    "/market", "/battle", "/login", "/onboarding", "/nexus",
    "/arcanum", "/sanctuaries", "/ranking", "/profile",
    "/account", "/team", "/inventory", "/myths",
  ];
  const hasOwnChat = pagesWithOwnChat.some(r =>
    location.pathname === r || (r !== "/" && location.pathname.startsWith(r))
  );
  if (!user || hasOwnChat) return null;
  return (
    <button
      onClick={onOpen}
      style={{
        position: "fixed", top: 4, right: 12, zIndex: 500,
        width: 40, height: 38, borderRadius: "30%",
        background: "rgba(7,11,20,0.92)",
        border: "2px solid rgba(123,47,255,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "pointer",
        boxShadow: "0 0 12px rgba(123,47,255,0.2)",
      }}
      title="Chat"
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(167,139,250,0.85)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </button>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const { trainerReady } = useTrainer();
  const [chatOpen, setChatOpen] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), 800);
    return () => clearTimeout(t);
  }, []);

  if (loading || (user && !trainerReady) || !minTimePassed) return <LoadingScreen />;

  const guard = (el: React.ReactNode) =>
    user ? <BattleGuard>{el}</BattleGuard> : <Navigate to="/login" />;

  return (
    <>
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
        <Route path="/tavern"  element={guard(<TavernPage />)} />
        <Route path="/nexus"   element={guard(<NexusPage />)} />
        <Route path="/market"  element={guard(<MarketPage />)} />
        <Route path="/guild"   element={guard(<GuildPage />)} />
        <Route path="/arcanum" element={guard(<ComingSoon name="ARCANUM" />)} />

        {/* ── Game pages — fullscreen, no Layout ──────────────── */}
        <Route path="/battle"      element={user ? <BattlePage /> : <Navigate to="/login" />} />
        <Route path="/outpost"     element={guard(<OutpostPage />)} />
        <Route path="/inn"         element={<Navigate to="/outpost" />} />
        <Route path="/sanctuaries" element={guard(<SanctuariesPage />)} />
        <Route path="/profile"     element={guard(<ProfilePage />)} />
        <Route path="/account"     element={guard(<AccountSettingsPage />)} />
        <Route path="/team"        element={guard(<TeamPage />)} />
        <Route path="/inventory"   element={guard(<InventoryPage />)} />
        <Route path="/myths"       element={guard(<MythsPage />)} />
        <Route path="/ranking"     element={guard(<RankingPage />)} />

        {/* ── Fallback ──────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      <ChatButtonFloating user={user} onOpen={() => setChatOpen(true)} />
      {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
    </>
  );
}
