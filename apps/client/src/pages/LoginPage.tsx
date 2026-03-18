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
    <div
      className="fixed inset-0 flex overflow-hidden"
      style={{ background: "#070b14", fontFamily: "'Exo 2', sans-serif" }}
    >
      {/* ── LEFT PANEL — world map ── */}
      <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden">
        {/* Map image */}
        <img
          src="https://raw.githubusercontent.com/adcanoardev/mythara-assets/refs/heads/main/maps/mythara_map.avif"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.45, transform: "scale(1.05)" }}
        />

        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 80% at 45% 50%, rgba(7,11,20,0.15) 0%, rgba(7,11,20,0.7) 100%)",
          }}
        />

        {/* Right edge fade into panel */}
        <div
          className="absolute inset-y-0 right-0 w-32"
          style={{
            background: "linear-gradient(to right, transparent, rgba(7,11,20,0.95))",
          }}
        />

        {/* Ambient glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(123,47,255,0.18) 0%, transparent 70%)",
            top: "50%",
            left: "45%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Branding — centered in left panel */}
        <div className="relative z-10 flex flex-col items-center select-none">
          {/* Logo real */}
          <img
            src="https://cdn.jsdelivr.net/gh/adcanoardev/mythara-assets@20c2494c976794775042d559db3df66687914944/logo/mythara_logo.webp"
            alt="Mythara"
            style={{ width: 96, height: 96, objectFit: "contain", marginBottom: 12 }}
          />

          <h1
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 52,
              fontWeight: 700,
              letterSpacing: "0.18em",
              background: "linear-gradient(135deg, #a78bfa 0%, #67e8f9 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1,
              textShadow: "none",
            }}
          >
            MYTHARA
          </h1>
          <p
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontSize: 13,
              letterSpacing: "0.55em",
              color: "var(--text-muted, #8892a4)",
              marginTop: 6,
              textTransform: "uppercase",
            }}
          >
            Online
          </p>

          {/* Decorative separator */}
          <div
            className="mt-8 flex items-center gap-3"
            style={{ opacity: 0.5 }}
          >
            <div style={{ width: 40, height: 1, background: "linear-gradient(to right, transparent, #7b2fff)" }} />
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#7b2fff" }} />
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4cc9f0" }} />
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#7b2fff" }} />
            <div style={{ width: 40, height: 1, background: "linear-gradient(to left, transparent, #4cc9f0)" }} />
          </div>

          <p
            className="mt-6 text-center max-w-xs"
            style={{ color: "var(--text-muted, #8892a4)", fontSize: 13, lineHeight: 1.6 }}
          >
            Explore a world of myths.<br />Collect. Battle. Conquer.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — form ── */}
      <div
        className="relative flex flex-col justify-center overflow-y-auto"
        style={{
          width: "min(420px, 42vw)",
          minWidth: 340,
          background: "rgba(9,14,26,0.95)",
          borderLeft: "1px solid rgba(123,47,255,0.2)",
          boxShadow: "-24px 0 60px rgba(7,11,20,0.8)",
          padding: "0 40px",
        }}
      >
        {/* Top accent bar */}
        <div
          className="absolute top-0 left-0 right-0"
          style={{
            height: 2,
            background: "linear-gradient(to right, #7b2fff, #4cc9f0)",
          }}
        />

        {/* Mode toggle pills */}
        <div
          className="flex mb-8 relative"
          style={{
            background: "rgba(255,255,255,0.04)",
            borderRadius: 10,
            padding: 3,
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 8,
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                background: mode === m
                  ? "linear-gradient(135deg, #7b2fff, #4cc9f0)"
                  : "transparent",
                color: mode === m ? "#fff" : "var(--text-muted, #8892a4)",
                boxShadow: mode === m ? "0 2px 12px rgba(123,47,255,0.35)" : "none",
              }}
            >
              {m === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {/* Greeting */}
        <div className="mb-6">
          <h2
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 22,
              color: "var(--text-primary, #e2e8f0)",
              letterSpacing: "0.04em",
              marginBottom: 4,
            }}
          >
            {mode === "login" ? "Welcome back, Binder" : "Begin your journey"}
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-muted, #8892a4)" }}>
            {mode === "login"
              ? "Your myths are waiting for you."
              : "Create your account to enter the world."}
          </p>
        </div>

        {/* Fields */}
        <div className="flex flex-col gap-4">
          {mode === "register" && (
            <div>
              <label style={labelStyle}>Username</label>
              <input
                style={inputStyle}
                placeholder="Your Binder name"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
          )}
          <div>
            <label style={labelStyle}>Email</label>
            <input
              style={inputStyle}
              type="email"
              placeholder="binder@mythara.world"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              style={inputStyle}
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p
            className="mt-4 text-center"
            style={{ color: "#f87171", fontSize: 13 }}
          >
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-6"
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: 10,
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            background: "linear-gradient(135deg, #7b2fff, #4cc9f0)",
            color: "#fff",
            boxShadow: "0 0 28px rgba(123,47,255,0.45)",
            opacity: loading ? 0.5 : 1,
            transition: "opacity 0.2s, box-shadow 0.2s",
          }}
        >
          {loading ? "Entering..." : mode === "login" ? "Enter Mythara" : "Create Binder"}
        </button>

        {/* Footer note */}
        <p
          className="mt-6 text-center"
          style={{ fontSize: 12, color: "var(--text-muted, #8892a4)" }}
        >
          {mode === "login" ? "No account yet? " : "Already a Binder? "}
          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#a78bfa",
              fontSize: 12,
              fontWeight: 600,
              padding: 0,
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            {mode === "login" ? "Register here" : "Sign in"}
          </button>
        </p>

        {/* Bottom accent */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: 1,
            background: "linear-gradient(to right, transparent, rgba(76,201,240,0.3), transparent)",
          }}
        />
      </div>
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--text-muted, #8892a4)",
  marginBottom: 7,
  fontFamily: "'Rajdhani', sans-serif",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 8,
  padding: "11px 14px",
  fontSize: 14,
  color: "var(--text-primary, #e2e8f0)",
  outline: "none",
  fontFamily: "'Exo 2', sans-serif",
  transition: "border-color 0.2s",
};
