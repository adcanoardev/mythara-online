/** @type {import('tailwindcss').Config} */
export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
        extend: {
            colors: {
                bg: "#070b14",
                bg2: "#0d1525",
                bg3: "#111d35",
                card: "#0f1923",
                card2: "#162030",
                red: "#e63946",
                yellow: "#ffd60a",
                blue: "#4cc9f0",
                green: "#06d6a0",
                purple: "#7b2fff",
                muted: "#5a6a85",
                border: "#1e2d45",
            },
            fontFamily: {
                display: ["Rajdhani", "sans-serif"],
                body: ["Exo 2", "sans-serif"],
            },
        },
    },
    plugins: [],
};
