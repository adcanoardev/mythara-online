/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                // ── Fondos ─────────────────────────────────────────
                bg:    "#070b14",
                bg2:   "#0d1525",
                bg3:   "#111d35",
                card:  "#0f1923",
                card2: "#162030",

                // ── Bordes ─────────────────────────────────────────
                border: "#1e2d45",

                // ── Texto — LEGIBLES sobre fondo oscuro ────────────
                // Usar estas clases en vez de opacity directo
                primary:   "#e2e8f0",  // text-primary   — títulos, valores
                secondary: "#94a3b8",  // text-secondary — labels, subtítulos
                muted:     "#64748b",  // text-muted     — hints, timestamps
                disabled:  "#334155",  // text-disabled  — inactivo

                // ── Acentos legibles sobre #070b14 ─────────────────
                // Versiones más claras que los colores de branding
                purple: "#a78bfa",    // legible (brand: #7b2fff)
                blue:   "#67e8f9",    // legible (brand: #4cc9f0)
                gold:   "#fbbf24",    // dorado
                green:  "#34d399",    // éxito
                red:    "#f87171",    // error
                orange: "#fb923c",    // ember

                // ── Colores de branding (solo para borders/glows) ──
                // NO usar como color de texto — baja legibilidad
                "brand-purple": "#7b2fff",
                "brand-blue":   "#4cc9f0",

                // ── Legados (alias para compatibilidad) ────────────
                yellow: "#fbbf24",    // → gold

                // ── Rareza — alias → CSS variables ─────────────────
                // Usar: text-rarity-elite, bg-rarity-epic, border-rarity-legendary, etc.
                // El valor real vive en style.css (:root --rarity-*)
                // Cambiar style.css propaga a Tailwind + inline styles
                "rarity-common-color":   "var(--rarity-common-color)",
                "rarity-common-border":  "var(--rarity-common-border)",
                "rarity-common-bg":      "var(--rarity-common-bg)",
                "rarity-common-glow":    "var(--rarity-common-glow)",

                "rarity-rare-color":     "var(--rarity-rare-color)",
                "rarity-rare-border":    "var(--rarity-rare-border)",
                "rarity-rare-bg":        "var(--rarity-rare-bg)",
                "rarity-rare-glow":      "var(--rarity-rare-glow)",

                "rarity-epic-color":     "var(--rarity-epic-color)",
                "rarity-epic-border":    "var(--rarity-epic-border)",
                "rarity-epic-bg":        "var(--rarity-epic-bg)",
                "rarity-epic-glow":      "var(--rarity-epic-glow)",

                "rarity-elite-color":    "var(--rarity-elite-color)",
                "rarity-elite-border":   "var(--rarity-elite-border)",
                "rarity-elite-bg":       "var(--rarity-elite-bg)",
                "rarity-elite-glow":     "var(--rarity-elite-glow)",

                "rarity-legendary-color":  "var(--rarity-legendary-color)",
                "rarity-legendary-border": "var(--rarity-legendary-border)",
                "rarity-legendary-bg":     "var(--rarity-legendary-bg)",
                "rarity-legendary-glow":   "var(--rarity-legendary-glow)",

                "rarity-mythic-color":   "var(--rarity-mythic-color)",
                "rarity-mythic-border":  "var(--rarity-mythic-border)",
                "rarity-mythic-bg":      "var(--rarity-mythic-bg)",
                "rarity-mythic-glow":    "var(--rarity-mythic-glow)",
            },
            fontFamily: {
                display: ["Rajdhani", "sans-serif"],
                body: ["Exo 2", "sans-serif"],
            },
            fontSize: {
                // ── Escala tipográfica Mythara ─────────────────────
                // Base mínima: 13px. Labels: 11px. Nunca menos.
                "2xs":  ["11px", { lineHeight: "1.4" }],  // labels mono mínimos
                "xs":   ["12px", { lineHeight: "1.5" }],  // antes: 9-10px → ahora 12px
                "sm":   ["13px", { lineHeight: "1.55" }], // antes: 11px   → ahora 13px
                "base": ["14px", { lineHeight: "1.6" }],  // antes: 12px   → ahora 14px
                "md":   ["15px", { lineHeight: "1.6" }],  // nuevo intermedio
                "lg":   ["16px", { lineHeight: "1.5" }],  // subtítulos
                "xl":   ["18px", { lineHeight: "1.4" }],  // títulos secundarios
                "2xl":  ["20px", { lineHeight: "1.3" }],  // títulos de sección
                "3xl":  ["24px", { lineHeight: "1.2" }],  // títulos principales
                "4xl":  ["30px", { lineHeight: "1.1" }],  // display grande
            },
        },
    },
    plugins: [],
};
