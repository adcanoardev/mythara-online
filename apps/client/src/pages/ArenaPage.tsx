// apps/client/src/pages/ArenaPage.tsx
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTrainer } from "../context/TrainerContext";
import { useAuth } from "../hooks/useAuth";
import { api } from "../lib/api";
import PageShell from "../components/PageShell";
import PageTopbar from "../components/PageTopbar";

const CDN = "https://cdn.jsdelivr.net/gh/adcanoardev/mythara-assets@7613486785dc2b2089f6d345e1281e9316c1d982";

// ─── Types ────────────────────────────────────────────────────
interface MythSlot {
  myth: MythData | null;
  strategy: "AGGRESSIVE" | "BALANCED" | "DEFENSIVE";
}

interface MythData {
  id: string;
  speciesId: string;
  nickname?: string;
  name: string;
  rarity: string;
  affinity: string | null;
  slug: string;
  level: number;
  hp: number;
  attack: number;
  defense: number;
  speed: number;
}

interface Opponent {
  userId: string;
  username: string;
  guildTag: string | null;
  avatar: string | null;
  trophies: number;
  tier: string;
  team: MythSlot[];
}

interface HistoryEntry {
  id: number;
  createdAt: string;
  role: "ATTACKER" | "DEFENDER";
  result: "WIN" | "LOSS";
  trophyChange: number;
  opponentName: string;
}

// ─── Constants ───────────────────────────────────────────────
const TIER_COLORS: Record<string, string> = {
  Bronze:   "#cd7f32",
  Silver:   "#c0c0c0",
  Gold:     "#fbbf24",
  Platinum: "#67e8f9",
  Diamond:  "#818cf8",
  Mythic:   "#f87171",
};

const TIER_THRESHOLDS = [
  { name: "Bronze",   min: 0,    max: 999  },
  { name: "Silver",   min: 1000, max: 1999 },
  { name: "Gold",     min: 2000, max: 2999 },
  { name: "Platinum", min: 3000, max: 3999 },
  { name: "Diamond",  min: 4000, max: 4999 },
  { name: "Mythic",   min: 5000, max: Infinity },
];

const RARITY_BORDER: Record<string, string> = {
  COMMON:    "#64748b",
  RARE:      "#6366f1",
  EPIC:      "#a855f7",
  ELITE:     "#22d3ee",
  LEGENDARY: "#fbbf24",
  MYTHIC:    "#f87171",
};

const STRATEGY_CONFIG = {
  AGGRESSIVE: { label: "Aggressive", color: "#f87171", icon: "⚔️" },
  BALANCED:   { label: "Balanced",   color: "#fbbf24", icon: "⚖️" },
  DEFENSIVE:  { label: "Defensive",  color: "#67e8f9", icon: "🛡️" },
} as const;

type Tab = "defense" | "opponents" | "history";

// ─── Sub-components ──────────────────────────────────────────

function TrophyBar({ trophies }: { trophies: number }) {
  const tier = TIER_THRESHOLDS.find(t => trophies >= t.min && trophies <= t.max) ?? TIER_THRESHOLDS[0];
  const next = TIER_THRESHOLDS[TIER_THRESHOLDS.indexOf(tier) + 1];
  const color = TIER_COLORS[tier.name];
  const progress = next
    ? Math.min(100, ((trophies - tier.min) / (next.min - tier.min)) * 100)
    : 100;

  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center flex-shrink-0" style={{ minWidth: 64 }}>
        <span className="font-black text-sm" style={{ color, fontFamily: "'Rajdhani', sans-serif" }}>
          {tier.name}
        </span>
        <span className="font-mono text-xs tabular-nums" style={{ color, opacity: 0.8 }}>
          {trophies.toLocaleString()}
        </span>
      </div>
      <div className="flex-1 flex flex-col gap-1">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${color}80, ${color})` }}
          />
        </div>
        {next && (
          <div className="flex justify-between" style={{ fontSize: "var(--font-2xs)", color: "var(--text-muted)" }}>
            <span>{trophies}</span>
            <span>{next.min} → {next.name}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MythCard({
  slot,
  onClick,
  compact = false,
}: {
  slot: MythSlot;
  onClick?: () => void;
  compact?: boolean;
}) {
  const { myth, strategy } = slot;
  const strat = STRATEGY_CONFIG[strategy];
  const border = myth ? (RARITY_BORDER[myth.rarity] ?? "#64748b") : "rgba(255,255,255,0.1)";

  return (
    <div
      onClick={onClick}
      className="relative flex flex-col rounded-xl overflow-hidden transition-all duration-200"
      style={{
        border: `1px solid ${border}40`,
        background: myth ? `${border}10` : "rgba(255,255,255,0.02)",
        cursor: onClick ? "pointer" : "default",
        boxShadow: myth ? `0 0 12px ${border}20` : "none",
        minHeight: compact ? 80 : 100,
      }}
    >
      {myth ? (
        <>
          {/* Myth sprite */}
          <div className="flex items-center gap-2 p-2">
            <div
              className="flex-shrink-0 rounded-lg overflow-hidden"
              style={{
                width: compact ? 40 : 48,
                height: compact ? 40 : 48,
                border: `1px solid ${border}50`,
                background: "rgba(0,0,0,0.3)",
              }}
            >
              <img
                src={`${CDN}/myths/${myth.speciesId}/${myth.slug}_portrait.png`}
                alt={myth.name}
                className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate" style={{ fontSize: "var(--font-sm)", color: "#e2e8f0" }}>
                {myth.nickname ?? myth.name}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                {myth.affinity && (
                  <img
                    src={`${CDN}/affinity/${myth.affinity}_affinity_icon.webp`}
                    alt={myth.affinity}
                    style={{ width: 14, height: 14 }}
                  />
                )}
                <span style={{ fontSize: "var(--font-2xs)", color: border }}>
                  {myth.rarity}
                </span>
                <span style={{ fontSize: "var(--font-2xs)", color: "var(--text-muted)" }}>
                  · Lv.{myth.level}
                </span>
              </div>
            </div>
          </div>
          {/* Strategy badge */}
          <div
            className="px-2 py-1 flex items-center gap-1"
            style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
          >
            <span style={{ fontSize: 11 }}>{strat.icon}</span>
            <span style={{ fontSize: "var(--font-2xs)", color: strat.color, fontFamily: "monospace" }}>
              {strat.label}
            </span>
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-1 py-4">
          <span style={{ fontSize: 20, opacity: 0.3 }}>+</span>
          <span style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>Empty</span>
        </div>
      )}
    </div>
  );
}

// ─── Defense Tab ─────────────────────────────────────────────
function DefenseTab({ trophies }: { trophies: number | null }) {
  const [defense, setDefense] = useState<MythSlot[] | null>(null);
  const [myMyths, setMyMyths] = useState<MythData[]>([]);
  const [editing, setEditing] = useState<number | null>(null); // slot index being edited
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [localSlots, setLocalSlots] = useState<MythSlot[]>([
    { myth: null, strategy: "BALANCED" },
    { myth: null, strategy: "BALANCED" },
    { myth: null, strategy: "BALANCED" },
  ]);

  useEffect(() => {
    // Load defense
    api.arenaDefense().then((r: any) => {
      if (r.defense) {
        setDefense(r.defense.slots);
        setLocalSlots(r.defense.slots);
      }
    }).catch(() => {});

    // Load trainer's party myths for selection
    api.party().then((r: any) => {
      if (Array.isArray(r)) setMyMyths(r);
      else if (Array.isArray(r?.myths)) setMyMyths(r.myths);
    }).catch(() => {});
  }, []);

  function selectMyth(slotIdx: number, myth: MythData) {
    setLocalSlots(prev => {
      const next = [...prev];
      next[slotIdx] = { ...next[slotIdx], myth };
      return next;
    });
    setEditing(null);
  }

  function setStrategy(slotIdx: number, strategy: MythSlot["strategy"]) {
    setLocalSlots(prev => {
      const next = [...prev];
      next[slotIdx] = { ...next[slotIdx], strategy };
      return next;
    });
  }

  async function saveDefense() {
    const valid = localSlots.every(s => s.myth !== null);
    if (!valid) return;
    setSaving(true);
    try {
      await api.arenaDefenseSave(localSlots.map(s => ({ mythId: s.myth!.id, strategy: s.strategy })));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {}
    setSaving(false);
  }

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      {trophies !== null && (
        <div
          className="rounded-2xl p-4"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="text-xs font-mono mb-2" style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}>
            YOUR TROPHIES
          </div>
          <TrophyBar trophies={trophies} />
        </div>
      )}

      <div
        className="rounded-2xl p-4"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-mono" style={{ color: "var(--text-muted)", letterSpacing: "0.1em" }}>
            DEFENSE TEAM
          </span>
          <span style={{ fontSize: "var(--font-xs)", color: "var(--text-secondary)" }}>
            AI controls your defense when attacked
          </span>
        </div>

        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {localSlots.map((slot, i) => (
            <div key={i} className="flex flex-col gap-2">
              <MythCard
                slot={slot}
                onClick={() => setEditing(editing === i ? null : i)}
              />
              {/* Strategy selector */}
              <div className="flex gap-1">
                {(["AGGRESSIVE", "BALANCED", "DEFENSIVE"] as const).map(s => {
                  const cfg = STRATEGY_CONFIG[s];
                  const active = slot.strategy === s;
                  return (
                    <button
                      key={s}
                      onClick={() => setStrategy(i, s)}
                      className="flex-1 rounded-lg py-1 transition-all duration-150"
                      style={{
                        fontSize: "var(--font-2xs)",
                        fontFamily: "monospace",
                        background: active ? `${cfg.color}20` : "rgba(255,255,255,0.03)",
                        border: `1px solid ${active ? `${cfg.color}50` : "rgba(255,255,255,0.07)"}`,
                        color: active ? cfg.color : "var(--text-muted)",
                      }}
                    >
                      {cfg.icon}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Myth picker */}
        {editing !== null && (
          <div
            className="mt-3 rounded-xl p-3"
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div className="text-xs font-mono mb-2" style={{ color: "var(--text-muted)" }}>
              SELECT MYTH FOR SLOT {editing + 1}
            </div>
            <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              {myMyths.length === 0 && (
                <div className="col-span-3 text-center py-4" style={{ color: "var(--text-muted)", fontSize: "var(--font-sm)" }}>
                  No myths in party
                </div>
              )}
              {myMyths.map(myth => (
                <MythCard
                  key={myth.id}
                  slot={{ myth, strategy: "BALANCED" }}
                  compact
                  onClick={() => selectMyth(editing, myth)}
                />
              ))}
            </div>
          </div>
        )}

        <button
          onClick={saveDefense}
          disabled={saving || !localSlots.every(s => s.myth !== null)}
          className="mt-4 w-full rounded-xl py-2.5 font-black tracking-widest uppercase transition-all duration-200"
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: "var(--font-sm)",
            background: saved
              ? "rgba(34,197,94,0.15)"
              : localSlots.every(s => s.myth) ? "rgba(245,158,11,0.15)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${saved ? "rgba(34,197,94,0.4)" : localSlots.every(s => s.myth) ? "rgba(245,158,11,0.35)" : "rgba(255,255,255,0.08)"}`,
            color: saved ? "#4ade80" : localSlots.every(s => s.myth) ? "#fbbf24" : "rgba(255,255,255,0.2)",
            cursor: localSlots.every(s => s.myth) ? "pointer" : "not-allowed",
          }}
        >
          {saved ? "✓ Saved" : saving ? "Saving…" : "Save Defense"}
        </button>
      </div>
    </div>
  );
}

// ─── Opponents Tab ───────────────────────────────────────────
function OpponentsTab() {
  const [data, setData] = useState<{ opponents: Opponent[]; myTrophies: number; myTier: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [attacking, setAttacking] = useState<string | null>(null);
  const [result, setResult] = useState<{ win: boolean; trophyChange: number; newTrophies: number } | null>(null);
  const { tokens } = useTrainer();
  const tok = tokens as any;
  const pvpTokens = tok?.pvpTokens ?? 0;

  const load = useCallback(() => {
    setLoading(true);
    api.arenaOpponents()
      .then((r: any) => setData(r))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function attack(opponent: Opponent) {
    if (pvpTokens <= 0) return;
    let mythIds: string[] = [];
    try {
      const party: any = await api.party();
      const myths = Array.isArray(party) ? party : (party?.myths ?? []);
      mythIds = myths.slice(0, 3).map((m: any) => m.id);
    } catch {}

    if (mythIds.length < 3) return;

    setAttacking(opponent.userId);
    try {
      const res: any = await api.arenaAttack(opponent.userId, mythIds);
      setResult({
        win: res.result === "WIN",
        trophyChange: res.trophyChange,
        newTrophies: res.newTrophies,
      });
      setTimeout(() => { setResult(null); load(); }, 2500);
    } catch {}
    setAttacking(null);
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
        <span className="font-mono text-sm">Loading opponents…</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      {/* Result banner */}
      {result && (
        <div
          className="rounded-2xl p-4 text-center"
          style={{
            background: result.win ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            border: `1px solid ${result.win ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)"}`,
          }}
        >
          <div className="font-black text-xl" style={{ color: result.win ? "#4ade80" : "#f87171", fontFamily: "'Rajdhani', sans-serif" }}>
            {result.win ? "VICTORY" : "DEFEAT"}
          </div>
          <div className="font-mono text-sm" style={{ color: result.win ? "#4ade80" : "#f87171" }}>
            {result.win ? "+" : ""}{result.trophyChange} trophies → {result.newTrophies}
          </div>
        </div>
      )}

      {/* My trophies summary */}
      {data && (
        <div
          className="rounded-2xl px-4 py-3 flex items-center justify-between"
          style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <span style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", fontFamily: "monospace" }}>MY TROPHIES</span>
          <div className="flex items-center gap-2">
            <span className="font-black" style={{ color: TIER_COLORS[data.myTier] ?? "#e2e8f0", fontFamily: "'Rajdhani', sans-serif" }}>
              {data.myTier}
            </span>
            <span className="font-mono tabular-nums" style={{ color: TIER_COLORS[data.myTier] ?? "#e2e8f0", fontSize: "var(--font-sm)" }}>
              {data.myTrophies}
            </span>
          </div>
        </div>
      )}

      {/* Opponent cards */}
      {data?.opponents.map(opp => {
        const tierColor = TIER_COLORS[opp.tier] ?? "#e2e8f0";
        const isAttacking = attacking === opp.userId;
        return (
          <div
            key={opp.userId}
            className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2">
                {opp.guildTag && (
                  <span style={{ fontSize: "var(--font-xs)", color: "#7b2fff", fontWeight: 900, fontFamily: "monospace" }}>
                    [{opp.guildTag}]
                  </span>
                )}
                <span className="font-semibold" style={{ fontSize: "var(--font-sm)", color: "#e2e8f0" }}>
                  {opp.username}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <span className="font-black" style={{ fontSize: "var(--font-xs)", color: tierColor, fontFamily: "'Rajdhani', sans-serif" }}>
                    {opp.tier}
                  </span>
                  <span className="font-mono tabular-nums" style={{ fontSize: "var(--font-2xs)", color: tierColor }}>
                    {opp.trophies} 🏆
                  </span>
                </div>
              </div>
            </div>

            {/* Defense team preview */}
            <div className="px-4 py-3">
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                {opp.team.map((slot, i) => (
                  <MythCard key={i} slot={slot} compact />
                ))}
              </div>
            </div>

            {/* Attack button */}
            <div className="px-4 pb-3">
              <button
                onClick={() => attack(opp)}
                disabled={!!attacking || pvpTokens <= 0 || !!result}
                className="w-full rounded-xl py-2 font-black tracking-widest uppercase transition-all duration-200"
                style={{
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: "var(--font-sm)",
                  background: pvpTokens <= 0 ? "rgba(255,255,255,0.03)" : "rgba(245,158,11,0.12)",
                  border: `1px solid ${pvpTokens <= 0 ? "rgba(255,255,255,0.07)" : "rgba(245,158,11,0.3)"}`,
                  color: pvpTokens <= 0 ? "rgba(255,255,255,0.2)" : isAttacking ? "#fbbf24" : "#f59e0b",
                  cursor: pvpTokens <= 0 || !!attacking ? "not-allowed" : "pointer",
                }}
              >
                {isAttacking ? "Battling…" : pvpTokens <= 0 ? "No Tokens" : "⚔️ Attack"}
              </button>
            </div>
          </div>
        );
      })}

      {data?.opponents.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
          <span style={{ fontSize: 32, opacity: 0.4 }}>⚔️</span>
          <span style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)" }}>No opponents found yet</span>
          <span style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>Set your defense team first</span>
        </div>
      )}
    </div>
  );
}

// ─── History Tab ─────────────────────────────────────────────
function HistoryTab() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.arenaHistory()
      .then((r: any) => setHistory(r.history ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
        <span className="font-mono text-sm">Loading history…</span>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
        <span style={{ fontSize: 32, opacity: 0.4 }}>📜</span>
        <span style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)" }}>No battles yet</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
      {history.map(entry => {
        const isWin = entry.result === "WIN";
        const color = isWin ? "#4ade80" : "#f87171";
        const date = new Date(entry.createdAt);
        const ago = Math.round((Date.now() - date.getTime()) / 60000);
        const agoStr = ago < 60 ? `${ago}m ago` : ago < 1440 ? `${Math.floor(ago / 60)}h ago` : `${Math.floor(ago / 1440)}d ago`;

        return (
          <div
            key={entry.id}
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{
              background: isWin ? "rgba(34,197,94,0.04)" : "rgba(239,68,68,0.04)",
              border: `1px solid ${isWin ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)"}`,
            }}
          >
            <div
              className="flex-shrink-0 font-black rounded-lg px-2 py-1"
              style={{
                fontSize: "var(--font-xs)",
                fontFamily: "'Rajdhani', sans-serif",
                background: `${color}20`,
                color,
                minWidth: 44,
                textAlign: "center",
              }}
            >
              {isWin ? "WIN" : "LOSS"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate" style={{ fontSize: "var(--font-sm)", color: "#e2e8f0" }}>
                vs {entry.opponentName}
              </div>
              <div style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)" }}>
                {entry.role === "DEFENDER" ? "Defended" : "Attacked"} · {agoStr}
              </div>
            </div>
            <div
              className="flex-shrink-0 font-mono font-bold tabular-nums"
              style={{ fontSize: "var(--font-sm)", color }}
            >
              {entry.trophyChange > 0 ? "+" : ""}{entry.trophyChange}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ArenaPage ────────────────────────────────────────────────
export default function ArenaPage() {
  const navigate = useNavigate();
  const { tokens } = useTrainer();
  const tok = tokens as any;
  const pvpTokens = tok?.pvpTokens ?? 0;
  const pvpMax    = tok?.pvpMax   ?? 10;

  const [tab, setTab]       = useState<Tab>("defense");
  const [trophies, setTrophies] = useState<number | null>(null);

  useEffect(() => {
    api.arenaDefense().then((r: any) => {
      if (r.defense) setTrophies(r.defense.trophies);
    }).catch(() => {});
  }, []);

  const TABS: { id: Tab; label: string; icon: string }[] = [
    { id: "defense",   label: "Defense",   icon: "🛡️" },
    { id: "opponents", label: "Opponents", icon: "⚔️" },
    { id: "history",   label: "History",   icon: "📜" },
  ];

  const tierColor = trophies !== null
    ? TIER_COLORS[TIER_THRESHOLDS.find(t => trophies >= t.min && trophies <= t.max)?.name ?? "Bronze"]
    : "#fcd34d";

  return (
    <PageShell ambientColor="rgba(245,158,11,0.05)">
      <PageTopbar
        title={
          <div className="flex flex-col items-center">
            <span className="tracking-[0.22em] uppercase font-black" style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "var(--font-lg)", color: "var(--text-primary)" }}>
              The Arena
            </span>
            <span className="tracking-widest uppercase" style={{ fontSize: "var(--font-2xs)", color: "var(--text-muted)", fontFamily: "monospace" }}>
              PvP · Async Combat
            </span>
          </div>
        }
        onBack={() => navigate(-1)}
        right={
          <div className="flex items-center gap-2">
            {/* Ranking shortcut */}
            <button
              onClick={() => navigate("/ranking")}
              className="px-2.5 py-1 rounded-lg transition-all duration-150"
              style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", fontSize: "var(--font-xs)", color: "#38bdf8", fontFamily: "monospace" }}
            >
              🏆 Ranking
            </button>
            {/* PvP tokens */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <span style={{ fontSize: "var(--font-base)" }}>⚔️</span>
              <span className="font-mono font-bold tabular-nums" style={{ fontSize: "var(--font-sm)", color: "#fcd34d" }}>
                {pvpTokens}<span style={{ opacity: 0.35 }}>/{pvpMax}</span>
              </span>
            </div>
          </div>
        }
      />

      {/* Tab bar */}
      <div
        className="flex-shrink-0 flex border-b"
        style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.2)" }}
      >
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 flex items-center justify-center gap-2 py-3 transition-all duration-150"
              style={{
                fontSize: "var(--font-sm)",
                fontFamily: "monospace",
                color: active ? "#fbbf24" : "var(--text-muted)",
                borderBottom: active ? "2px solid #fbbf24" : "2px solid transparent",
                background: active ? "rgba(251,191,36,0.04)" : "transparent",
              }}
            >
              <span style={{ fontSize: 14 }}>{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {tab === "defense"   && <DefenseTab trophies={trophies} />}
        {tab === "opponents" && <OpponentsTab />}
        {tab === "history"   && <HistoryTab />}
      </div>
    </PageShell>
  );
}
