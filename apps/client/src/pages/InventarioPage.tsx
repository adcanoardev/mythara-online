import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import TrainerSidebar from "../components/TrainerSidebar";
import { api } from "../lib/api";

const ITEM_ICONS: Record<string, string> = {
    POKEBALL: "🔴",
    SUPERBALL: "🔵",
    ULTRABALL: "⚫",
    MASTERBALL: "🟣",
    POTION: "🧪",
    SUPER_POTION: "🧪",
    HYPER_POTION: "🧪",
    MAX_POTION: "🧪",
    FULL_RESTORE: "💊",
    FIRE_STONE: "🔥",
    WATER_STONE: "💧",
    THUNDER_STONE: "⚡",
    LEAF_STONE: "🍃",
    ICE_STONE: "❄️",
    LINK_CABLE: "🔗",
    DRAGON_SCALE: "🐉",
    METAL_COAT: "⚙️",
    KINGS_ROCK: "👑",
    UPGRADE: "⬆️",
    PROTECTOR: "🛡️",
};
const ITEM_COLORS: Record<string, string> = {
    POKEBALL: "#e63946",
    SUPERBALL: "#4cc9f0",
    ULTRABALL: "#adb5bd",
    MASTERBALL: "#7b2fff",
    POTION: "#06d6a0",
    FIRE_STONE: "#ff6b35",
    WATER_STONE: "#4cc9f0",
    THUNDER_STONE: "#ffd60a",
    LEAF_STONE: "#06d6a0",
    ICE_STONE: "#a8dadc",
    LINK_CABLE: "#adb5bd",
    DRAGON_SCALE: "#7b2fff",
    METAL_COAT: "#adb5bd",
    KINGS_ROCK: "#ffd60a",
};
const CATEGORIES: Record<string, string[]> = {
    Pokéballs: ["POKEBALL", "SUPERBALL", "ULTRABALL", "MASTERBALL"],
    Pociones: ["POTION", "SUPER_POTION", "HYPER_POTION", "MAX_POTION", "FULL_RESTORE"],
    Piedras: ["FIRE_STONE", "WATER_STONE", "THUNDER_STONE", "LEAF_STONE", "ICE_STONE"],
    Objetos: ["LINK_CABLE", "DRAGON_SCALE", "METAL_COAT", "KINGS_ROCK", "UPGRADE", "PROTECTOR"],
};

export default function InventarioPage() {
    const [inventory, setInventory] = useState<any[]>([]);
    const [filter, setFilter] = useState("Todos");

    useEffect(() => {
        api.inventory().then(setInventory);
    }, []);

    const filtered = filter === "Todos" ? inventory : inventory.filter((i) => CATEGORIES[filter]?.includes(i.item));

    return (
        <Layout sidebar={<TrainerSidebar />}>
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-border flex items-center justify-between">
                <h1 className="font-display font-bold text-2xl tracking-widest">
                    🎒 <span className="text-blue">Inventario</span>
                </h1>
                <div className="flex gap-2">
                    {["Todos", ...Object.keys(CATEGORIES)].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`px-3 py-1 rounded-lg font-display font-bold text-xs tracking-widest uppercase transition-all
                                ${filter === cat ? "text-bg" : "border border-border text-muted hover:border-blue hover:text-blue"}`}
                            style={filter === cat ? { background: "linear-gradient(135deg,#4cc9f0,#7b2fff)" } : {}}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 p-6 overflow-hidden">
                {filtered.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted">
                        <div className="text-5xl mb-4">📦</div>
                        <div className="font-display font-bold text-xl tracking-widest">
                            {filter === "Todos" ? "Inventario vacío" : `Sin ${filter.toLowerCase()}`}
                        </div>
                        <div className="text-sm mt-2">Combate y recoge la mina para conseguir objetos</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-3 h-full content-start overflow-y-auto">
                        {filtered.map((item: any) => {
                            const icon = ITEM_ICONS[item.item] ?? "📦";
                            const color = ITEM_COLORS[item.item] ?? "#5a6a85";
                            return (
                                <div
                                    key={item.item}
                                    className="bg-card border border-border rounded-2xl p-4 hover:border-blue/40 transition-all relative overflow-hidden group aspect-square flex flex-col justify-between"
                                >
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        style={{
                                            background: `radial-gradient(ellipse at top left, ${color}15, transparent 60%)`,
                                        }}
                                    />
                                    <span className="text-3xl relative">{icon}</span>
                                    <div className="relative">
                                        <div className="font-display font-bold text-lg" style={{ color }}>
                                            {item.quantity}
                                        </div>
                                        <div className="font-display text-xs text-muted truncate">
                                            {item.item.replace(/_/g, " ")}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Layout>
    );
}
