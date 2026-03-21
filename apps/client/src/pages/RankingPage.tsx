// apps/client/src/pages/RankingPage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import PageShell from "../components/PageShell";
import PageTopbar from "../components/PageTopbar";

const CDN = "https://cdn.jsdelivr.net/gh/adcanoardev/mythara-assets@7613486785dc2b2089f6d345e1281e9316c1d982";

// ─── Tier config ──────────────────────────────────────────────
const TIERS = [
  { name: "Mythic",   min: 5000, color: "#f87171", glow: "rgba(248,113,113,0.25)", icon: "💀" },
  { name: "Diamond",  min: 4000, color: "#818cf8", glow: "rgba(129,140,248,0.2)",  icon: "💎" },
  { name: "Platinum", min: 3000, color: "#67e8f9", glow: "rgba(103,232,249,0.2)",  icon: "🔷" },
  { name: "Gold",     min: 2000, color: "#fbbf24", glow: "rgba(251,191,36,0.2)",   icon: "🥇" },
  { name: "Silver",   min: 1000, color: "#c0c0c0", glow: "rgba(192,192,192,0.15)", icon: "🥈" },
  { name: "Bronze",   min: 0,    color: "#cd7f32", glow: "rgba(205,127,50,0.15)",  icon: "🥉" },
] as const;

function getTier(trophies: number) {
  return TIERS.find(t => trophies >= t.min) ?? TIERS[TIERS.length - 1];
}

interface RankEntry {
  position: number;
  userId: string;
  username: string;
  guildTag: string | null;
  avatar: string | null;
  trophies: number;
  tier: string;
}

// ─── Tier section divider ────────────────────────────────────
function TierDivider({ tier }: { tier: typeof TIERS[number] }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2 sticky top-0"
      style={{
        background: `linear-gradient(90deg, ${tier.glow} 0%, rgba(7,11,20,0.95) 60%)`,
        borderTop: `1px solid ${tier.color}25`,
        borderBottom: `1px solid ${tier.color}15`,
        zIndex: 2,
      }}
    >
      <span style={{ fontSize: 14 }}>{tier.icon}</span>
      <span
        className="font-black tracking-widest uppercase"
        style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "var(--font-sm)", color: tier.color }}
      >
        {tier.name}
      </span>
      <span style={{ fontSize: "var(--font-xs)", color: `${tier.color}70`, fontFamily: "monospace" }}>
        {tier.min === 5000 ? "5000+" : `${tier.min}–${tier.min + 999}`}
      </span>
    </div>
  );
}

// ─── Rank row ────────────────────────────────────────────────
function RankRow({ entry, isMe }: { entry: RankEntry; isMe: boolean }) {
  const tier = getTier(entry.trophies);
  const top3 = entry.position <= 3;
  const medals = ["", "🥇", "🥈", "🥉"];

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b transition-colors duration-150"
      style={{
        borderColor: "rgba(255,255,255,0.04)",
        background: isMe
          ? `linear-gradient(90deg, ${tier.glow} 0%, rgba(7,11,20,0.4) 80%)`
          : top3 ? "rgba(255,255,255,0.015)" : "transparent",
        boxShadow: isMe ? `inset 0 0 0 1px ${tier.color}30` : "none",
      }}
    >
      {/* Position */}
      <div className="flex-shrink-0 font-mono tabular-nums" style={{ width: 36, textAlign: "center" }}>
        {top3 ? (
          <span style={{ fontSize: 16 }}>{medals[entry.position]}</span>
        ) : (
          <span style={{ fontSize: "var(--font-sm)", color: isMe ? tier.color : "rgba(255,255,255,0.3)" }}>
            #{entry.position}
          </span>
        )}
      </div>

      {/* Avatar placeholder */}
      <div
        className="flex-shrink-0 rounded-full flex items-center justify-center"
        style={{
          width: 32, height: 32,
          background: `${tier.color}20`,
          border: `1px solid ${tier.color}40`,
          fontSize: 14,
        }}
      >
        {entry.avatar ? (
          <img
            src={`${CDN}/avatars/${entry.avatar}.webp`}
            alt=""
            className="w-full h-full rounded-full object-cover"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <span>{tier.icon}</span>
        )}
      </div>

      {/* Username + guild */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        {entry.guildTag && (
          <span
            style={{
              fontSize: "var(--font-xs)", color: "#7b2fff", fontWeight: 900,
              fontFamily: "monospace", letterSpacing: ".08em", flexShrink: 0,
            }}
          >
            [{entry.guildTag}]
          </span>
        )}
        <span
          className="font-semibold truncate"
          style={{ fontSize: "var(--font-sm)", color: isMe ? "#e2e8f0" : "var(--text-secondary)" }}
        >
          {entry.username}
        </span>
        {isMe && (
          <span className="flex-shrink-0 text-xs" style={{ color: tier.color }}>(you)</span>
        )}
      </div>

      {/* Trophies + tier */}
      <div className="flex-shrink-0 flex flex-col items-end">
        <span
          className="font-black tabular-nums"
          style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "var(--font-base)", color: tier.color }}
        >
          {entry.trophies.toLocaleString()}
        </span>
        <span style={{ fontSize: "var(--font-2xs)", color: `${tier.color}80`, fontFamily: "monospace" }}>
          {tier.icon} {entry.tier}
        </span>
      </div>
    </div>
  );
}

// ─── RankingPage ──────────────────────────────────────────────
export default function RankingPage() {
  const navigate = useNavigate();
  const { user }  = useAuth();
  const [data, setData] = useState<{
    ranking: RankEntry[];
    myPosition: number | null;
    myTrophies: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");

  useEffect(() => {
    api.arenaRanking()
      .then((r: any) => setData(r))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const myEntry  = data?.ranking.find(r => r.username === user?.username);
  const myTier   = myEntry ? getTier(myEntry.trophies) : null;
  const filtered = filter === "All"
    ? (data?.ranking ?? [])
    : (data?.ranking ?? []).filter(r => r.tier === filter);

  // Group rows by tier for dividers
  const rows: { type: "divider"; tier: typeof TIERS[number] } | { type: "row"; entry: RankEntry }[] = [];
  let lastTier = "";
  for (const entry of filtered) {
    const tier = getTier(entry.trophies);
    if (tier.name !== lastTier) {
      rows.push({ type: "divider", tier } as any);
      lastTier = tier.name;
    }
    rows.push({ type: "row", entry } as any);
  }

  return (
    <PageShell ambientColor="rgba(251,191,36,0.04)">
      <PageTopbar
        title={
          <div className="flex flex-col items-center">
            <span className="tracking-[0.22em] uppercase font-black" style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "var(--font-lg)", color: "var(--text-primary)" }}>
              Ranking
            </span>
            <span className="tracking-widest uppercase" style={{ fontSize: "var(--font-2xs)", color: "var(--text-muted)", fontFamily: "monospace" }}>
              Global · Trophies
            </span>
          </div>
        }
        onBack={() => navigate(-1)}
        right={
          data?.myPosition ? (
            <div
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg"
              style={{
                background: myTier ? `${myTier.glow}` : "rgba(251,191,36,0.08)",
                border: `1px solid ${myTier?.color ?? "#fbbf24"}40`,
              }}
            >
              <span style={{ fontSize: "var(--font-xs)", color: myTier?.color ?? "#fbbf24", fontFamily: "monospace" }}>
                #{data.myPosition}
              </span>
              {data.myTrophies !== null && (
                <span className="font-mono tabular-nums" style={{ fontSize: "var(--font-xs)", color: myTier?.color ?? "#fbbf24" }}>
                  · {data.myTrophies} 🏆
                </span>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="relative flex-1 flex flex-col overflow-hidden min-h-0">
        {/* ── Tier filter pills ── */}
        <div
          className="flex-shrink-0 flex gap-2 px-4 py-3 overflow-x-auto"
          style={{ scrollbarWidth: "none", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          {["All", ...TIERS.map(t => t.name)].map(name => {
            const tierCfg = TIERS.find(t => t.name === name);
            const active  = filter === name;
            const color   = tierCfg?.color ?? "#fbbf24";
            return (
              <button
                key={name}
                onClick={() => setFilter(name)}
                className="flex-shrink-0 px-3 py-1 rounded-lg font-mono transition-all duration-150"
                style={{
                  fontSize: "var(--font-xs)",
                  background: active
                    ? `${tierCfg ? color : "#fbbf24"}20`
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${active ? (tierCfg ? `${color}50` : "rgba(251,191,36,0.4)") : "rgba(255,255,255,0.08)"}`,
                  color: active ? (tierCfg ? color : "#fbbf24") : "var(--text-muted)",
                }}
              >
                {tierCfg && <span className="mr-1">{tierCfg.icon}</span>}
                {name}
              </button>
            );
          })}
        </div>

        {/* ── My position banner (if not in top 10) ── */}
        {myEntry && (data?.myPosition ?? 0) > 10 && (
          <div
            className="flex-shrink-0 flex items-center justify-between px-4 py-2 border-b"
            style={{
              background: myTier ? `${myTier.glow}` : "rgba(251,191,36,0.05)",
              borderColor: `${myTier?.color ?? "#fbbf24"}25`,
            }}
          >
            <span style={{ fontSize: "var(--font-xs)", color: "var(--text-muted)", fontFamily: "monospace" }}>
              YOUR POSITION
            </span>
            <div className="flex items-center gap-3">
              <span className="font-semibold" style={{ fontSize: "var(--font-sm)", color: "#e2e8f0" }}>
                {myEntry.username}
              </span>
              <span
                className="font-black"
                style={{ fontFamily: "'Rajdhani', sans-serif", color: myTier?.color, fontSize: "var(--font-sm)" }}
              >
                #{data?.myPosition}
              </span>
              <span className="font-mono" style={{ color: myTier?.color, fontSize: "var(--font-sm)" }}>
                {myEntry.trophies} 🏆
              </span>
            </div>
          </div>
        )}

        {/* ── List ── */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center" style={{ color: "var(--text-muted)" }}>
            <span className="font-mono text-sm">Loading ranking…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <span style={{ fontSize: 32, opacity: 0.4 }}>🏆</span>
            <span style={{ fontSize: "var(--font-sm)", color: "var(--text-muted)" }}>
              {filter === "All" ? "No ranked trainers yet" : `No trainers in ${filter} tier`}
            </span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
            {(rows as any[]).map((item, i) =>
              item.type === "divider" ? (
                <TierDivider key={`div-${item.tier.name}`} tier={item.tier} />
              ) : (
                <RankRow
                  key={item.entry.userId}
                  entry={item.entry}
                  isMe={item.entry.username === user?.username}
                />
              )
            )}
          </div>
        )}
      </div>
    </PageShell>
  );
}
