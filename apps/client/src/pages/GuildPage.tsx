// apps/client/src/pages/GuildPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GuildMember {
  username: string;
  rank: string;
  role: "Leader" | "Officer" | "Member";
  power: number;
  online: boolean;
}

interface GuildData {
  id: string;
  name: string;
  tag: string;
  banner: string; // accent color
  level: number;
  power: number;
  wins: number;
  members: GuildMember[];
  description: string;
  leaderId: string;
}

// ─── Mock data (until Prisma migration) ──────────────────────────────────────
const MOCK_MY_GUILD: GuildData = {
  id: "guild_1",
  name: "Void Walkers",
  tag: "VOID",
  banner: "#7b2fff",
  level: 7,
  power: 14820,
  wins: 38,
  description: "Elite binders forged in the depths of the Void Sanctum. Competitive focus, friendly community.",
  leaderId: "trainer_1",
  members: [
    { username: "Adrián",   rank: "Mythic",    role: "Leader",  power: 3410, online: true  },
    { username: "Kaelith",  rank: "Diamond",   role: "Officer", power: 2980, online: true  },
    { username: "Nyxara",   rank: "Diamond",   role: "Officer", power: 2870, online: false },
    { username: "Solvein",  rank: "Platinum",  role: "Member",  power: 2340, online: true  },
    { username: "Torrath",  rank: "Gold",      role: "Member",  power: 1780, online: false },
    { username: "Elyndra",  rank: "Gold",      role: "Member",  power: 1440, online: false },
  ],
};

const MOCK_GUILDS: GuildData[] = [
  { id: "g1", name: "Embral Order",  tag: "EMBR", banner: "#ff6b35", level: 9,  power: 21400, wins: 72, members: [], description: "Fire-forged and battle-hardened.", leaderId: "" },
  { id: "g2", name: "Tide Covenant", tag: "TIDE", banner: "#4cc9f0", level: 8,  power: 18950, wins: 61, members: [], description: "Masters of the deep currents.", leaderId: "" },
  { id: "g3", name: "Void Walkers",  tag: "VOID", banner: "#7b2fff", level: 7,  power: 14820, wins: 38, members: [], description: "Elite binders of the Void Sanctum.", leaderId: "" },
  { id: "g4", name: "Ironveil",      tag: "IRON", banner: "#90a4ae", level: 6,  power: 12300, wins: 29, members: [], description: "Discipline. Strategy. Victory.", leaderId: "" },
  { id: "g5", name: "Grove Pact",    tag: "GROV", banner: "#06d6a0", level: 5,  power: 9800,  wins: 17, members: [], description: "Nature's guardians, always.", leaderId: "" },
];

const RANK_COLOR: Record<string, string> = {
  Mythic:   "#f87171",
  Diamond:  "#e040fb",
  Platinum: "#4cc9f0",
  Gold:     "#ffd60a",
  Silver:   "#e2e8f0",
  Bronze:   "#cd7c5b",
};

const ROLE_COLOR: Record<string, string> = {
  Leader:  "#ffd60a",
  Officer: "#7b2fff",
  Member:  "rgba(255,255,255,0.35)",
};

// ─── Sub-views for "has guild" panel ─────────────────────────────────────────
type GuildTab = "overview" | "members" | "activity";

// ─── SVG art ─────────────────────────────────────────────────────────────────
function GuildShieldArt({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 220 160" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="gsh1" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor="#070b14" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="220" height="160" fill="url(#gsh1)" />
      {/* Shield silhouette */}
      <path d="M110 30 L148 48 L148 88 Q148 118 110 132 Q72 118 72 88 L72 48 Z"
        fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.35" />
      <path d="M110 42 L138 56 L138 86 Q138 108 110 120 Q82 108 82 86 L82 56 Z"
        fill={color} fillOpacity="0.06" />
      {/* Center rune */}
      <line x1="110" y1="58" x2="110" y2="106" stroke={color} strokeWidth="1" strokeOpacity="0.5" />
      <line x1="92" y1="72" x2="128" y2="88" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      <line x1="128" y1="72" x2="92" y2="88" stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      <circle cx="110" cy="80" r="5" fill={color} fillOpacity="0.6" />
      <circle cx="110" cy="80" r="2.5" fill="#070b14" />
      {/* Ambient particles */}
      {[[35,25],[185,20],[22,90],[198,95],[45,135],[175,130]].map(([sx,sy],i) => (
        <circle key={i} cx={sx} cy={sy} r="1.5" fill={color} fillOpacity={0.15 + i * 0.05} />
      ))}
      {/* Corner decorations */}
      <line x1="15" y1="15" x2="40" y2="15" stroke={color} strokeWidth="0.7" strokeOpacity="0.2" />
      <line x1="15" y1="15" x2="15" y2="35" stroke={color} strokeWidth="0.7" strokeOpacity="0.2" />
      <line x1="205" y1="15" x2="180" y2="15" stroke={color} strokeWidth="0.7" strokeOpacity="0.2" />
      <line x1="205" y1="15" x2="205" y2="35" stroke={color} strokeWidth="0.7" strokeOpacity="0.2" />
    </svg>
  );
}

function SearchArt() {
  return (
    <svg viewBox="0 0 220 160" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <defs>
        <radialGradient id="gsrc" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#4cc9f0" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#070b14" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="220" height="160" fill="url(#gsrc)" />
      {/* Guild list silhouettes */}
      {[30, 60, 90, 120].map((y, i) => (
        <rect key={i} x="40" y={y} width={80 - i * 8} height="14" rx="2"
          fill="rgba(76,201,240,0.07)" stroke="rgba(76,201,240,0.12)" strokeWidth="0.7" />
      ))}
      {/* Search circle */}
      <circle cx="155" cy="70" r="28" fill="none" stroke="rgba(76,201,240,0.2)" strokeWidth="1.5" />
      <line x1="175" y1="90" x2="192" y2="107" stroke="rgba(76,201,240,0.25)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="155" cy="70" r="18" fill="rgba(76,201,240,0.06)" />
      {/* Stars */}
      {[[20,20],[200,30],[25,140],[195,145]].map(([sx,sy],i)=>(
        <circle key={i} cx={sx} cy={sy} r="1.2" fill={`rgba(76,201,240,${0.2+i*0.07})`} />
      ))}
    </svg>
  );
}

// ─── GuildPage ────────────────────────────────────────────────────────────────
export default function GuildPage() {
  const navigate = useNavigate();

  // TODO: replace with real API call — api.myGuild()
  const [myGuild] = useState<GuildData | null>(MOCK_MY_GUILD);
  // Set to null to see the "no guild" view: const [myGuild] = useState<GuildData | null>(null);

  const [tab, setTab] = useState<GuildTab>("overview");
  const [mode, setMode] = useState<"browse" | "create">("browse");
  const [searchQuery, setSearchQuery] = useState("");
  const [createName, setCreateName] = useState("");
  const [createTag, setCreateTag] = useState("");

  const filteredGuilds = MOCK_GUILDS.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── No guild view ──────────────────────────────────────────────────────────
  const NoGuildView = () => (
    <div className="relative flex-1 flex flex-col md:flex-row overflow-hidden">
      {/* Left panel — Create */}
      <div
        className="relative flex-1 flex flex-col overflow-hidden group transition-all duration-300"
        style={{ borderRight: "1px solid rgba(255,255,255,0.04)" }}
      >
        {/* Art bg */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0" style={{
            background: "linear-gradient(180deg, rgba(7,11,20,0.1) 0%, rgba(7,11,20,0.72) 55%, rgba(7,11,20,0.97) 100%)",
            zIndex: 1,
          }} />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(123,47,255,0.1) 0%, transparent 70%)",
            zIndex: 2,
          }} />
          <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 0 }}>
            <GuildShieldArt color="#7b2fff" />
          </div>
        </div>
        {/* Left accent bar */}
        <div className="absolute top-0 left-0 bottom-0 w-0.5" style={{
          background: "linear-gradient(180deg, transparent 0%, #7b2fff80 40%, #7b2fff40 70%, transparent 100%)",
          zIndex: 3,
        }} />

        <div className="relative flex-1 flex flex-col px-5 py-5 overflow-y-auto" style={{ zIndex: 4, scrollbarWidth: "none" }}>
          <div className="mb-auto pt-2">
            <span className="font-mono tracking-widest" style={{ fontSize: 10, color: "rgba(123,47,255,0.5)" }}>01</span>
          </div>

          <div className="mb-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono tracking-widest"
              style={{ fontSize: 9, background: "rgba(123,47,255,0.1)", border: "1px solid rgba(123,47,255,0.25)", color: "#7b2fff" }}>
              FOUND · Guilds
            </span>
          </div>

          <h2 className="font-black tracking-wide leading-none mb-1"
            style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "clamp(20px, 3vw, 28px)", color: "#e2e8f0" }}>
            Create Guild
          </h2>
          <p className="font-mono mb-4" style={{ fontSize: 10, color: "#7b2fff", letterSpacing: "0.08em" }}>
            Forge your own legacy
          </p>
          <p className="leading-relaxed mb-5" style={{ fontSize: 11, color: "rgba(255,255,255,0.33)", lineHeight: 1.55 }}>
            Start a new guild, recruit binders and compete as a unit. You become the Guild Leader.
          </p>

          {mode === "create" ? (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block font-mono tracking-widest mb-1.5" style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
                  GUILD NAME
                </label>
                <input
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                  placeholder="e.g. Void Walkers"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(123,47,255,0.3)", color: "#e2e8f0", fontFamily: "'Exo 2', sans-serif" }}
                />
              </div>
              <div>
                <label className="block font-mono tracking-widest mb-1.5" style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>
                  TAG (4 chars)
                </label>
                <input
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                  placeholder="VOID"
                  maxLength={4}
                  value={createTag}
                  onChange={e => setCreateTag(e.target.value.toUpperCase())}
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(123,47,255,0.3)", color: "#e2e8f0", fontFamily: "monospace", letterSpacing: "0.2em" }}
                />
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setMode("browse")}
                  className="flex-1 py-2 rounded-xl font-mono tracking-widest transition-all"
                  style={{ fontSize: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.35)" }}
                >
                  Cancel
                </button>
                <button
                  disabled={createName.length < 3 || createTag.length < 2}
                  className="flex-1 py-2 rounded-xl font-black tracking-widest uppercase transition-all disabled:opacity-30"
                  style={{ fontSize: 10, background: "linear-gradient(135deg, #7b2fff, #4cc9f0)", color: "#070b14", fontFamily: "'Rajdhani', sans-serif" }}
                >
                  Create ▶
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setMode("create")}
              className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 w-fit"
              style={{ background: "rgba(123,47,255,0.1)", border: "1px solid rgba(123,47,255,0.28)" }}
            >
              <span className="font-black tracking-widest uppercase" style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: "#7b2fff" }}>
                Create
              </span>
              <span style={{ fontSize: 9, color: "#7b2fff" }}>▶</span>
            </button>
          )}
        </div>
      </div>

      {/* Right panel — Browse & Join */}
      <div className="relative flex-1 flex flex-col overflow-hidden group transition-all duration-300">
        {/* Art bg */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0" style={{
            background: "linear-gradient(180deg, rgba(7,11,20,0.1) 0%, rgba(7,11,20,0.72) 55%, rgba(7,11,20,0.97) 100%)",
            zIndex: 1,
          }} />
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(76,201,240,0.09) 0%, transparent 70%)",
            zIndex: 2,
          }} />
          <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 0 }}>
            <SearchArt />
          </div>
        </div>
        <div className="absolute top-0 left-0 bottom-0 w-0.5" style={{
          background: "linear-gradient(180deg, transparent 0%, #4cc9f080 40%, #4cc9f040 70%, transparent 100%)",
          zIndex: 3,
        }} />

        <div className="relative flex-1 flex flex-col px-5 py-5 overflow-hidden" style={{ zIndex: 4 }}>
          <div className="flex-shrink-0 mb-auto pt-2">
            <span className="font-mono tracking-widest" style={{ fontSize: 10, color: "rgba(76,201,240,0.5)" }}>02</span>
          </div>

          <div className="flex-shrink-0 mb-3">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono tracking-widest"
              style={{ fontSize: 9, background: "rgba(76,201,240,0.1)", border: "1px solid rgba(76,201,240,0.22)", color: "#4cc9f0" }}>
              JOIN · Guilds
            </span>
          </div>

          <h2 className="flex-shrink-0 font-black tracking-wide leading-none mb-1"
            style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: "clamp(20px, 3vw, 28px)", color: "#e2e8f0" }}>
            Find a Guild
          </h2>
          <p className="flex-shrink-0 font-mono mb-3" style={{ fontSize: 10, color: "#4cc9f0", letterSpacing: "0.08em" }}>
            Join an existing crew
          </p>

          {/* Search input */}
          <div className="flex-shrink-0 relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>🔍</span>
            <input
              className="w-full rounded-lg pl-8 pr-3 py-2 text-sm outline-none transition-colors"
              placeholder="Search guilds..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(76,201,240,0.2)", color: "#e2e8f0", fontFamily: "'Exo 2', sans-serif" }}
            />
          </div>

          {/* Guild list */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-1.5" style={{ scrollbarWidth: "none" }}>
            {filteredGuilds.map(g => (
              <div
                key={g.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group/row"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = `${g.banner}40`)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)")}
              >
                {/* Banner dot */}
                <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-black"
                  style={{ background: `${g.banner}18`, border: `1px solid ${g.banner}40`, fontFamily: "'Rajdhani', sans-serif", fontSize: 10, color: g.banner }}>
                  {g.tag}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate" style={{ color: "#e2e8f0" }}>{g.name}</div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>Lv.{g.level}</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>·</span>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{g.power.toLocaleString()} PWR</span>
                  </div>
                </div>
                <button
                  className="flex-shrink-0 px-2.5 py-1 rounded-lg font-black tracking-widest uppercase transition-all"
                  style={{ fontSize: 9, background: `${g.banner}15`, border: `1px solid ${g.banner}35`, color: g.banner, fontFamily: "'Rajdhani', sans-serif" }}
                >
                  Join
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // ── Has guild view ─────────────────────────────────────────────────────────
  const HasGuildView = ({ guild }: { guild: GuildData }) => {
    const onlineCount = guild.members.filter(m => m.online).length;

    return (
      <div className="relative flex-1 flex flex-col overflow-hidden">
        {/* Guild accent ambient */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute" style={{
            width: "50%", height: "45%", top: "-5%", right: "-5%",
            background: `radial-gradient(ellipse, ${guild.banner}15 0%, transparent 70%)`,
          }} />
          <div className="absolute inset-0" style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.006) 3px, rgba(255,255,255,0.006) 4px)",
          }} />
        </div>

        {/* Guild identity bar */}
        <div className="relative flex-shrink-0 flex items-center gap-4 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)", zIndex: 5 }}>
          {/* Shield badge */}
          <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black"
            style={{ background: `${guild.banner}20`, border: `1px solid ${guild.banner}50`, fontFamily: "'Rajdhani', sans-serif", fontSize: 11, color: guild.banner }}>
            {guild.tag}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black tracking-wide" style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 16, color: "#e2e8f0" }}>
                {guild.name}
              </span>
              <span className="px-1.5 py-0.5 rounded font-mono tracking-widest"
                style={{ fontSize: 8, background: "rgba(255,214,10,0.1)", border: "1px solid rgba(255,214,10,0.25)", color: "#ffd60a" }}>
                Lv.{guild.level}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
                {guild.power.toLocaleString()} PWR
              </span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>·</span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>
                {guild.wins}W
              </span>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>·</span>
              <span style={{ fontSize: 10, fontFamily: "monospace" }}>
                <span style={{ color: "#06d6a0" }}>●</span>
                <span style={{ color: "rgba(255,255,255,0.35)" }}> {onlineCount} online</span>
              </span>
            </div>
          </div>
          {/* Leave button */}
          <button
            className="flex-shrink-0 px-3 py-1.5 rounded-lg font-mono tracking-widest transition-all"
            style={{ fontSize: 9, background: "rgba(230,57,70,0.06)", border: "1px solid rgba(230,57,70,0.2)", color: "rgba(230,57,70,0.6)" }}
          >
            Leave
          </button>
        </div>

        {/* Tabs */}
        <div className="relative flex-shrink-0 flex border-b" style={{ borderColor: "rgba(255,255,255,0.06)", zIndex: 5 }}>
          {(["overview", "members", "activity"] as GuildTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2.5 font-black tracking-widest uppercase transition-all"
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 11,
                color: tab === t ? guild.banner : "rgba(255,255,255,0.25)",
                borderBottom: tab === t ? `2px solid ${guild.banner}` : "2px solid transparent",
                background: tab === t ? `${guild.banner}08` : "transparent",
              }}
            >
              {t === "overview" ? "⚔️ Overview" : t === "members" ? "👥 Members" : "📜 Activity"}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="relative flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: "none", zIndex: 4 }}>

          {/* ── Overview tab ── */}
          {tab === "overview" && (
            <div className="flex flex-col gap-4 h-full">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "POWER",   value: guild.power.toLocaleString(), color: guild.banner },
                  { label: "WINS",    value: String(guild.wins),            color: "#ffd60a" },
                  { label: "MEMBERS", value: String(guild.members.length),  color: "#4cc9f0" },
                ].map(stat => (
                  <div key={stat.label} className="rounded-xl p-3 text-center"
                    style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="font-black text-xl" style={{ fontFamily: "'Rajdhani', sans-serif", color: stat.color }}>
                      {stat.value}
                    </div>
                    <div className="font-mono tracking-widest" style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="font-mono tracking-widest mb-2" style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>DESCRIPTION</div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>{guild.description}</p>
              </div>

              {/* Top members preview */}
              <div className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <span className="font-mono tracking-widest" style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>TOP MEMBERS</span>
                </div>
                {guild.members.slice(0, 3).map((m, i) => (
                  <div key={m.username} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0"
                    style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <span className="font-mono" style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", width: 16 }}>#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-sm" style={{ color: "#e2e8f0" }}>{m.username}</span>
                    </div>
                    <span className="font-mono" style={{ fontSize: 10, color: ROLE_COLOR[m.role] }}>{m.role}</span>
                    <span className="font-black text-sm" style={{ fontFamily: "'Rajdhani', sans-serif", color: guild.banner }}>
                      {m.power.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              {/* Guild war placeholder */}
              <div className="rounded-xl p-4 flex flex-col items-center justify-center gap-2 flex-1"
                style={{ background: "rgba(255,255,255,0.015)", border: "1px dashed rgba(255,255,255,0.08)", minHeight: 80 }}>
                <span style={{ fontSize: 22, opacity: 0.4 }}>⚔️</span>
                <span className="font-mono tracking-widest" style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>GUILD WARS — COMING SOON</span>
              </div>
            </div>
          )}

          {/* ── Members tab ── */}
          {tab === "members" && (
            <div className="flex flex-col gap-1.5">
              {/* Header */}
              <div className="grid px-3 pb-1.5" style={{ gridTemplateColumns: "1fr 60px 70px 24px", gap: 8 }}>
                {["MEMBER", "ROLE", "POWER", ""].map(h => (
                  <span key={h} className="font-mono tracking-widest" style={{ fontSize: 8, color: "rgba(255,255,255,0.25)" }}>{h}</span>
                ))}
              </div>
              {guild.members.map(m => (
                <div key={m.username} className="grid items-center px-3 py-2.5 rounded-xl"
                  style={{ gridTemplateColumns: "1fr 60px 70px 24px", gap: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.online ? "#06d6a0" : "rgba(255,255,255,0.15)" }} />
                    <span className="font-semibold text-sm truncate" style={{ color: "#e2e8f0" }}>{m.username}</span>
                    <span className="flex-shrink-0 text-xs" style={{ color: RANK_COLOR[m.rank] ?? "#e2e8f0", fontSize: 9 }}>{m.rank}</span>
                  </div>
                  <span className="font-mono" style={{ fontSize: 9, color: ROLE_COLOR[m.role] }}>{m.role}</span>
                  <span className="font-black" style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, color: guild.banner }}>
                    {m.power.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 12, opacity: 0.25 }}>···</span>
                </div>
              ))}
              {/* Invite slot */}
              <div className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl mt-1 cursor-pointer transition-all"
                style={{ background: "rgba(255,255,255,0.015)", border: "1px dashed rgba(255,255,255,0.08)" }}>
                <span style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>＋</span>
                <span className="font-mono tracking-widest" style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>INVITE BINDER</span>
              </div>
            </div>
          )}

          {/* ── Activity tab ── */}
          {tab === "activity" && (
            <div className="flex flex-col gap-2">
              {[
                { time: "2m ago",   icon: "⚔️", text: "Kaelith won a ranked battle",          color: "#ffd60a" },
                { time: "14m ago",  icon: "🏆", text: "Void Walkers climbed to rank #3",       color: guild.banner },
                { time: "1h ago",   icon: "👋", text: "Solvein joined the guild",              color: "#4cc9f0" },
                { time: "3h ago",   icon: "⚔️", text: "Nyxara won a ranked battle",            color: "#ffd60a" },
                { time: "5h ago",   icon: "⬆️", text: "Guild leveled up to Lv.7",             color: "#06d6a0" },
                { time: "1d ago",   icon: "⚔️", text: "Adrián won a ranked battle",            color: "#ffd60a" },
                { time: "2d ago",   icon: "👋", text: "Torrath joined the guild",              color: "#4cc9f0" },
              ].map((evt, i) => (
                <div key={i} className="flex items-start gap-3 px-3 py-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ fontSize: 14, lineHeight: 1.4 }}>{evt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 12, color: evt.color, lineHeight: 1.4 }}>{evt.text}</p>
                  </div>
                  <span className="flex-shrink-0 font-mono" style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{evt.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 flex flex-col"
      style={{ background: "#070b14", fontFamily: "'Exo 2', sans-serif" }}
    >
      {/* ── Ambient background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute" style={{
          width: "55%", height: "50%", top: "-10%", right: "-10%",
          background: "radial-gradient(ellipse, rgba(80,20,120,0.1) 0%, transparent 70%)",
        }} />
        <div className="absolute" style={{
          width: "45%", height: "40%", bottom: "-5%", left: "-5%",
          background: "radial-gradient(ellipse, rgba(20,60,100,0.09) 0%, transparent 70%)",
        }} />
        <div className="absolute inset-0" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.007) 3px, rgba(255,255,255,0.007) 4px)",
        }} />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute rounded-full" style={{
            width: i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 3 : 2,
            background: i % 2 === 0 ? "#7b2fff" : "#4cc9f0",
            boxShadow: `0 0 8px ${i % 2 === 0 ? "#7b2fff" : "#4cc9f0"}`,
            left: `${10 + i * 15}%`,
            top: `${15 + (i % 3) * 25}%`,
            animation: `nurseryXP ${3.5 + i * 0.4}s ease-in-out infinite ${i * 0.6}s`,
            opacity: 0.4,
          }} />
        ))}
      </div>

      {/* ── Top bar ── */}
      <div
        className="relative flex-shrink-0 flex items-center justify-between px-4 md:px-6"
        style={{
          height: 48,
          background: "rgba(4,8,15,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          zIndex: 10,
        }}
      >
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 transition-opacity hover:opacity-70 active:scale-95"
          style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, fontFamily: "monospace" }}
        >
          <span style={{ fontSize: 9 }}>◀</span>
          <span className="tracking-widest uppercase hidden sm:inline">City</span>
        </button>

        <div className="flex flex-col items-center">
          <span className="tracking-[0.22em] uppercase font-black"
            style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 15, color: "#e2e8f0" }}>
            Guild
          </span>
          <span className="tracking-widest uppercase"
            style={{ fontSize: 8, color: "rgba(255,255,255,0.22)", fontFamily: "monospace" }}>
            {myGuild ? myGuild.name : "No Guild"}
          </span>
        </div>

        {/* Guild tag or status */}
        {myGuild ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{ background: `${myGuild.banner}12`, border: `1px solid ${myGuild.banner}35` }}>
            <span className="font-mono font-bold tabular-nums tracking-widest"
              style={{ fontSize: 11, color: myGuild.banner }}>
              [{myGuild.tag}]
            </span>
          </div>
        ) : (
          <div style={{ width: 60 }} />
        )}
      </div>

      {/* ── Main content ── */}
      {myGuild ? <HasGuildView guild={myGuild} /> : <NoGuildView />}
    </div>
  );
}
