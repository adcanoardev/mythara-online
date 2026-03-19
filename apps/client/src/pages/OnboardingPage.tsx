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
        className="relative flex-shrink-0 flex flex-col"
        style={{
          width: 220,
          borderRight: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(4,8,15,0.6)",
        }}
      >
        {/* Logo — arriba, padding propio */}
        <div className="flex items-center justify-center flex-shrink-0" style={{ padding: "20px 16px 16px" }}>
          <img
            src="https://cdn.jsdelivr.net/gh/adcanoardev/mythara-assets@20c2494c976794775042d559db3df66687914944/logo/mythara_logo.webp"
            alt="Mythara"
            style={{ width: "100%", maxWidth: 150, objectFit: "contain" }}
          />
        </div>

        {/* Steps — justo debajo del logo */}
        <div className="flex flex-col gap-2 px-1">
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
                      fontSize: 14,
                      fontWeight: 700,
                      fontFamily: "'Rajdhani', sans-serif",
                      letterSpacing: "0.06em",
                      color: current ? "#e2e8f0" : done ? "#a78bfa" : "#5a6a80",
                    }}>{meta.label}</div>
                    <div style={{
                      fontSize: 12,
                      color: current ? "#8892a4" : "#3a4a5a",
                    }}>{meta.hint}</div>
                  </div>
                </div>
              );
            })}
          </div>
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
          className="flex-shrink-0 flex items-center justify-between px-6"
          style={{
            height: 52,
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            background: "rgba(4,8,15,0.5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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

          {/* Progress dots — derecha */}
          <div style={{ display: "flex", gap: 6 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{
                width: i <= stepIdx ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i <= stepIdx
                  ? "linear-gradient(90deg,#7b2fff,#4cc9f0)"
                  : "rgba(255,255,255,0.1)",
                transition: "all 0.3s",
              }} />
            ))}
          </div>
        </div>

        {/* Step content area */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-8 py-4">

          {/* ── STEP 1: Gender ── */}
          {step === "gender" && (
            <div className="flex-1 flex flex-col justify-center w-full" style={{ maxWidth: 480, margin: "0 auto" }}>
              <h2 style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#e2e8f0",
                marginBottom: 6,
              }}>Who will you be?</h2>
              <p style={{ fontSize: 13, color: "#8892a4", marginBottom: 14 }}>
                Choose the identity of your Binder.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {(["male", "female"] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    style={{
                      padding: 0,
                      borderRadius: 14,
                      border: gender === g
                        ? "2px solid #fbbf24"
                        : "2px solid rgba(255,255,255,0.07)",
                      background: gender === g
                        ? "rgba(251,191,36,0.08)"
                        : "rgba(255,255,255,0.02)",
                      boxShadow: gender === g
                        ? "0 0 24px rgba(251,191,36,0.2)"
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
                    {/* Imagen — se adapta al espacio disponible */}
                    <div style={{
                      width: "100%",
                      /* móvil landscape ~380-430px alto:
                         - header 54px, accent 2px, py-6 (top 24px), título ~28px, subtítulo ~20px, gap 14px, label 34px, footer ~56px, gap 12px
                         = ~244px fijos → sobran ~136-186px para imagen
                         En desktop máximo 200px */
                      height: "clamp(80px, calc(100dvh - 280px), 200px)",
                      overflow: "hidden",
                      borderRadius: "12px 12px 0 0",
                      background: "linear-gradient(160deg,#1a1a2e,#0d1025)",
                      position: "relative",
                    }}>
                      <img
                        src={`${AVATAR_CDN}/avatar_${g}_1.webp`}
                        alt={g}
                        style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
                      />
                      <div style={{
                        position: "absolute", bottom: 0, left: 0, right: 0, height: "35%",
                        background: "linear-gradient(to top, rgba(7,11,20,0.8), transparent)",
                      }} />
                    </div>
                    <span style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 700,
                      fontSize: 13,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: gender === g ? "#fbbf24" : "#8892a4",
                      padding: "8px 0 10px",
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
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#e2e8f0",
                marginBottom: 8,
                flexShrink: 0,
              }}>Choose your appearance</h2>
              <p style={{ fontSize: 15, color: "#8892a4", marginBottom: 20, flexShrink: 0 }}>
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
                      color: avatar === av.id ? "#67e8f9" : "#8892a4",
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
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#e2e8f0",
                marginBottom: 4,
                flexShrink: 0,
              }}>Choose your first Myth</h2>
              <p style={{ fontSize: 15, color: "#8892a4", marginBottom: 12, flexShrink: 0 }}>
                Your starter will be your companion from the very beginning.
              </p>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  scrollbarWidth: "none",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
                  gap: 10,
                  alignContent: "start",
                }}
              >
                {(data?.starters ?? []).map((s: any) => {
                  const aff = s.affinities?.[0];
                  const color = aff ? (AFFINITY_COLORS[aff] ?? "#e2e8f0") : "#e2e8f0";
                  const sel = starter === s.id;
                  const mythId = String(s.id).padStart(3, "0");
                  const mythSlug = s.name?.toLowerCase().replace(/\s+/g, "_") ?? "unknown";
                  const portraitUrl = `https://cdn.jsdelivr.net/gh/adcanoardev/mythara-assets@7613486785dc2b2089f6d345e1281e9316c1d982/myths/${mythId}/${mythSlug}_portrait.png`;
                  const affinityIconUrl = aff
                    ? `https://cdn.jsdelivr.net/gh/adcanoardev/mythara-assets@7613486785dc2b2089f6d345e1281e9316c1d982/affinity/${aff.toLowerCase()}_affinity_icon.webp`
                    : null;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setStarter(s.id)}
                      style={{
                        padding: 0,
                        borderRadius: 14,
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
                        gap: 0,
                        textAlign: "center",
                        overflow: "hidden",
                      }}
                    >
                      {/* Portrait — altura fija para que el badge siempre sea visible */}
                      <div style={{
                        width: "100%",
                        height: "clamp(70px, 12vw, 110px)",
                        overflow: "hidden",
                        borderRadius: "12px 12px 0 0",
                        background: "linear-gradient(160deg,#1a1a2e,#0d1025)",
                        position: "relative",
                        flexShrink: 0,
                      }}>
                        <img
                          src={portraitUrl}
                          alt={s.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", display: "block" }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        {sel && (
                          <div style={{
                            position: "absolute",
                            inset: 0,
                            background: `radial-gradient(circle at 50% 80%, ${color}22 0%, transparent 70%)`,
                          }} />
                        )}
                      </div>

                      {/* Name + affinity badge — siempre visible */}
                      <div style={{
                        padding: "6px 6px 8px",
                        width: "100%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: 4,
                        flexShrink: 0,
                      }}>
                        <span style={{
                          fontFamily: "'Rajdhani', sans-serif",
                          fontWeight: 700,
                          fontSize: 12,
                          letterSpacing: "0.06em",
                          color: sel ? "#e2e8f0" : "#8892a4",
                          lineHeight: 1.2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "100%",
                        }}>{s.name}</span>

                        {aff && (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color,
                            background: `${color}18`,
                            padding: "2px 6px 2px 3px",
                            borderRadius: 4,
                            border: `1px solid ${color}30`,
                            whiteSpace: "nowrap",
                          }}>
                            {affinityIconUrl && (
                              <img
                                src={affinityIconUrl}
                                alt={aff}
                                style={{ width: 12, height: 12, objectFit: "contain", flexShrink: 0 }}
                              />
                            )}
                            {aff}
                          </span>
                        )}
                      </div>
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
