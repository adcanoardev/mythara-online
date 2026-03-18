// apps/client/src/pages/OnboardingPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

type Step = "gender" | "avatar" | "starter";
const STEPS: Step[] = ["gender", "avatar", "starter"];

const AVATAR_CDN = "https://cdn.jsdelivr.net/gh/adcanoardev/mythara-assets@8788a27ffc7fdfbb47b3379de8219f24117be8aa/avatars";
const AVATARS_DATA = [
  { id: "avatar_male_1",   gender: "male",   name: "Kael",  url: `${AVATAR_CDN}/avatar_male_1.webp`   },
  { id: "avatar_male_2",   gender: "male",   name: "Ryn",   url: `${AVATAR_CDN}/avatar_male_2.webp`   },
  { id: "avatar_male_3",   gender: "male",   name: "Zeph",  url: `${AVATAR_CDN}/avatar_male_3.webp`   },
  { id: "avatar_male_4",   gender: "male",   name: "Voss",  url: `${AVATAR_CDN}/avatar_male_4.webp`   },
  { id: "avatar_female_1", gender: "female", name: "Lyra",  url: `${AVATAR_CDN}/avatar_female_1.webp` },
  { id: "avatar_female_2", gender: "female", name: "Mira",  url: `${AVATAR_CDN}/avatar_female_2.webp` },
  { id: "avatar_female_3", gender: "female", name: "Sable", url: `${AVATAR_CDN}/avatar_female_3.webp` },
  { id: "avatar_female_4", gender: "female", name: "Nyx",   url: `${AVATAR_CDN}/avatar_female_4.webp` },
];

const AFFINITY_COLORS: Record<string, string> = {
  EMBER:  "#ff6b35",
  TIDE:   "#4cc9f0",
  GROVE:  "#06d6a0",
  VOLT:   "#ffd60a",
  STONE:  "#adb5bd",
  FROST:  "#a8dadc",
  VENOM:  "#a78bfa",
  ASTRAL: "#e040fb",
  IRON:   "#90a4ae",
  SHADE:  "#f87171",
};

const STEP_META = {
  gender:  { label: "Identity",     icon: "⚡", hint: "Who will you be?" },
  avatar:  { label: "Appearance",   icon: "🎭", hint: "Choose your look" },
  starter: { label: "Starter Myth", icon: "🐉", hint: "Your first companion" },
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep]       = useState<Step>("gender");
  const [data, setData]       = useState<any>(null);
  const [gender, setGender]   = useState<"male" | "female" | null>(null);
  const [avatar, setAvatar]   = useState<string | null>(null);
  const [starter, setStarter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => { api.onboardingData().then(setData); }, []);

  const stepIdx          = STEPS.indexOf(step);
  const avatarsFiltered  = AVATARS_DATA.filter(a => a.gender === gender);

  const canAdvance =
    (step === "gender"  && gender  !== null) ||
    (step === "avatar"  && avatar  !== null) ||
    (step === "starter" && starter !== null);

  async function handleFinish() {
    if (!avatar || !gender || !starter) return;
    setLoading(true);
    setError("");
    try {
      await api.onboardingComplete(avatar, gender, starter);
      navigate("/");
      window.location.reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 flex overflow-hidden"
      style={{ background: "#070b14", fontFamily: "'Exo 2', sans-serif" }}
    >
      {/* ── Ambient BG ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 60% 70% at 20% 50%, rgba(123,47,255,0.1) 0%, transparent 60%)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 50% 60% at 80% 50%, rgba(76,201,240,0.06) 0%, transparent 60%)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.012) 1px,transparent 1px)," +
            "linear-gradient(90deg,rgba(255,255,255,0.012) 1px,transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
      </div>

      {/* ── LEFT SIDEBAR — nav & branding ── */}
      <div
        className="relative flex-shrink-0 flex flex-col justify-between py-8 px-6"
        style={{
          width: 220,
          borderRight: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(4,8,15,0.6)",
        }}
      >
        {/* Logo */}
        <div>
          <div className="flex items-center gap-2 mb-10">
            <img
              src="https://cdn.jsdelivr.net/gh/adcanoardev/mythara-assets@20c2494c976794775042d559db3df66687914944/logo/mythara_logo.webp"
              alt="Mythara"
              style={{ width: 36, height: 36, objectFit: "contain" }}
            />
            <span style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: "0.18em",
              background: "linear-gradient(135deg, #a78bfa, #67e8f9)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>MYTHARA</span>
          </div>

          {/* Step nav */}
          <div className="flex flex-col gap-2">
            {STEPS.map((s, i) => {
              const meta    = STEP_META[s];
              const done    = i < stepIdx;
              const current = i === stepIdx;
              return (
                <div
                  key={s}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: current
                      ? "rgba(123,47,255,0.12)"
                      : "transparent",
                    border: current
                      ? "1px solid rgba(123,47,255,0.25)"
                      : "1px solid transparent",
                    transition: "all 0.2s",
                  }}
                >
                  {/* Step circle */}
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "'Rajdhani', sans-serif",
                    background: done
                      ? "linear-gradient(135deg,#7b2fff,#4cc9f0)"
                      : current
                        ? "rgba(123,47,255,0.2)"
                        : "rgba(255,255,255,0.04)",
                    border: done
                      ? "none"
                      : current
                        ? "1px solid rgba(123,47,255,0.5)"
                        : "1px solid rgba(255,255,255,0.1)",
                    color: done ? "#fff" : current ? "#a78bfa" : "#5a6a80",
                  }}>
                    {done ? "✓" : i + 1}
                  </div>

                  <div>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 700,
                      fontFamily: "'Rajdhani', sans-serif",
                      letterSpacing: "0.06em",
                      color: current ? "#e2e8f0" : done ? "#a78bfa" : "#5a6a80",
                    }}>{meta.label}</div>
                    <div style={{
                      fontSize: 11,
                      color: current ? "#8892a4" : "#3a4a5a",
                    }}>{meta.hint}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom copy */}
        <p style={{ fontSize: 11, color: "#3a4a5a", lineHeight: 1.6 }}>
          Your choices shape your journey.<br />Choose wisely, Binder.
        </p>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="relative flex-1 flex flex-col min-w-0">

        {/* Top accent */}
        <div style={{
          height: 2,
          background: "linear-gradient(to right, #7b2fff, #4cc9f0)",
          flexShrink: 0,
        }} />

        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-8"
          style={{
            height: 52,
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(4,8,15,0.5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>{STEP_META[step].icon}</span>
            <span style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#e2e8f0",
            }}>{STEP_META[step].label}</span>
          </div>

          {/* Progress dots */}
          <div style={{ display: "flex", gap: 6 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i <= stepIdx ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i < stepIdx
                  ? "linear-gradient(90deg,#7b2fff,#4cc9f0)"
                  : i === stepIdx
                    ? "linear-gradient(90deg,#7b2fff,#4cc9f0)"
                    : "rgba(255,255,255,0.1)",
                transition: "all 0.3s",
              }} />
            ))}
          </div>
        </div>

        {/* Step content area */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-8 py-6">

          {/* ── STEP 1: Gender ── */}
          {step === "gender" && (
            <div className="flex-1 flex flex-col justify-center max-w-lg mx-auto w-full">
              <h2 style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#e2e8f0",
                marginBottom: 6,
              }}>Who will you be?</h2>
              <p style={{ fontSize: 13, color: "#8892a4", marginBottom: 28 }}>
                Choose the identity of your Binder.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {(["male", "female"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    style={{
                      padding: "32px 24px",
                      borderRadius: 16,
                      border: gender === g
                        ? "2px solid #4cc9f0"
                        : "2px solid rgba(255,255,255,0.07)",
                      background: gender === g
                        ? "rgba(76,201,240,0.08)"
                        : "rgba(255,255,255,0.02)",
                      boxShadow: gender === g
                        ? "0 0 24px rgba(76,201,240,0.15)"
                        : "none",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <span style={{ fontSize: 48 }}>{g === "male" ? "👦" : "👧"}</span>
                    <span style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 700,
                      fontSize: 15,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: gender === g ? "#67e8f9" : "#8892a4",
                    }}>{g === "male" ? "Male" : "Female"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: Avatar ── */}
          {step === "avatar" && (
            <div className="flex-1 flex flex-col min-h-0">
              <h2 style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#e2e8f0",
                marginBottom: 6,
                flexShrink: 0,
              }}>Choose your appearance</h2>
              <p style={{ fontSize: 13, color: "#8892a4", marginBottom: 20, flexShrink: 0 }}>
                This is how the world will see you.
              </p>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  scrollbarWidth: "none",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                  gap: 12,
                  alignContent: "start",
                }}
              >
                {avatarsFiltered.map((av) => (
                  <button
                    key={av.id}
                    onClick={() => setAvatar(av.id)}
                    style={{
                      padding: 0,
                      borderRadius: 14,
                      border: avatar === av.id
                        ? "2px solid #fbbf24"
                        : "2px solid rgba(255,255,255,0.07)",
                      background: avatar === av.id
                        ? "rgba(251,191,36,0.08)"
                        : "rgba(255,255,255,0.02)",
                      boxShadow: avatar === av.id
                        ? "0 0 20px rgba(251,191,36,0.15)"
                        : "none",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      overflow: "hidden",
                      gap: 0,
                    }}
                  >
                    <div style={{ width: "100%", aspectRatio: "1", overflow: "hidden", borderRadius: "12px 12px 0 0", background: "linear-gradient(160deg,#1a1a2e,#0d1025)", position: "relative" }}>
                      <img
                        src={av.url}
                        alt={av.name}
                        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top", display: "block" }}
                      />
                    </div>
                    <span style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 700,
                      fontSize: 12,
                      letterSpacing: "0.08em",
                      color: avatar === av.id ? "#fbbf24" : "#8892a4",
                      padding: "6px 0 8px",
                    }}>{av.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 3: Starter Myth ── */}
          {step === "starter" && (
            <div className="flex-1 flex flex-col min-h-0">
              <h2 style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#e2e8f0",
                marginBottom: 6,
                flexShrink: 0,
              }}>Choose your first Myth</h2>
              <p style={{ fontSize: 13, color: "#8892a4", marginBottom: 20, flexShrink: 0 }}>
                Your starter will be your companion from the very beginning.
              </p>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  scrollbarWidth: "none",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                  gap: 12,
                  alignContent: "start",
                }}
              >
                {(data?.starters ?? []).map((s: any) => {
                  const color = s.affinities?.[0]
                    ? (AFFINITY_COLORS[s.affinities[0]] ?? "#e2e8f0")
                    : "#e2e8f0";
                  const sel = starter === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setStarter(s.id)}
                      style={{
                        padding: "20px 12px 16px",
                        borderRadius: 16,
                        border: sel
                          ? `2px solid ${color}`
                          : "2px solid rgba(255,255,255,0.07)",
                        background: sel
                          ? `${color}12`
                          : "rgba(255,255,255,0.02)",
                        boxShadow: sel
                          ? `0 0 24px ${color}28`
                          : "none",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 8,
                        textAlign: "center",
                      }}
                    >
                      <span style={{
                        fontSize: 44,
                        filter: sel ? `drop-shadow(0 0 10px ${color})` : "none",
                        transition: "filter 0.2s",
                      }}>
                        {s.art?.portrait ?? "❓"}
                      </span>
                      <span style={{
                        fontFamily: "'Rajdhani', sans-serif",
                        fontWeight: 700,
                        fontSize: 13,
                        letterSpacing: "0.06em",
                        color: sel ? "#e2e8f0" : "#8892a4",
                      }}>{s.name}</span>
                      {s.affinities?.[0] && (
                        <span style={{
                          fontSize: 11,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color,
                          background: `${color}18`,
                          padding: "2px 8px",
                          borderRadius: 4,
                          border: `1px solid ${color}30`,
                        }}>
                          {s.affinities[0]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer — navigation ── */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-8 py-4"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(4,8,15,0.5)",
          }}
        >
          {/* Back */}
          {stepIdx > 0 ? (
            <button
              onClick={() => setStep(STEPS[stepIdx - 1])}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "#8892a4",
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              ◀ Back
            </button>
          ) : (
            <div />
          )}

          {/* Error */}
          {error && (
            <span style={{ fontSize: 13, color: "#f87171" }}>❌ {error}</span>
          )}

          {/* Next / Finish */}
          {step !== "starter" ? (
            <button
              onClick={() => canAdvance && setStep(STEPS[stepIdx + 1])}
              disabled={!canAdvance}
              style={{
                padding: "10px 28px",
                borderRadius: 10,
                border: "none",
                background: canAdvance
                  ? "linear-gradient(135deg, #7b2fff, #4cc9f0)"
                  : "rgba(255,255,255,0.06)",
                color: canAdvance ? "#fff" : "#5a6a80",
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: canAdvance ? "pointer" : "not-allowed",
                boxShadow: canAdvance ? "0 0 20px rgba(123,47,255,0.35)" : "none",
                transition: "all 0.2s",
              }}
            >
              Continue ▶
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={!starter || loading}
              style={{
                padding: "10px 28px",
                borderRadius: 10,
                border: "none",
                background: starter && !loading
                  ? "linear-gradient(135deg, #7b2fff, #4cc9f0)"
                  : "rgba(255,255,255,0.06)",
                color: starter && !loading ? "#fff" : "#5a6a80",
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: starter && !loading ? "pointer" : "not-allowed",
                boxShadow: starter && !loading ? "0 0 24px rgba(123,47,255,0.4)" : "none",
                transition: "all 0.2s",
              }}
            >
              {loading ? "Starting..." : "🎮 Begin Adventure"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
