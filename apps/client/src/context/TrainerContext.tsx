// apps/client/src/context/TrainerContext.tsx
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken } from "../lib/api";

interface TrainerContextValue {
    trainer: any;
    tokens: any;
    fragments: number;
    guildTag: string | null;
    guildRole: string | null;
    trainerReady: boolean;   // true tras el primer load exitoso
    reload: () => void;
    reset: () => void;
}

const TrainerContext = createContext<TrainerContextValue>({
    trainer: null,
    tokens: null,
    fragments: 0,
    guildTag: null,
    guildRole: null,
    trainerReady: false,
    reload: () => {},
    reset: () => {},
});

export function TrainerProvider({ children }: { children: React.ReactNode }) {
    const [trainer, setTrainer] = useState<any>(null);
    const [tokens, setTokens] = useState<any>(null);
    const [fragments, setFragments] = useState<number>(0);
    const [guildTag, setGuildTag] = useState<string | null>(null);
    const [guildRole, setGuildRole] = useState<string | null>(null);
    const [trainerReady, setTrainerReady] = useState(false);

    const load = useCallback(async () => {
        if (!getToken()) {
            setTrainerReady(true); // sin token → no hay datos que esperar
            return;
        }
        try {
            const [t, tk, inv] = await Promise.all([api.trainer(), api.tokens(), api.inventory()]);
            setTrainer(t);
            setTokens(tk);
            const frag = (inv as any[]).find((i: any) => i.item === "FRAGMENT");
            setFragments(frag?.quantity ?? 0);
            setGuildTag((t as any).guildTag ?? null);
            setGuildRole((t as any).guildRole ?? null);
        } catch {}
        finally {
            setTrainerReady(true); // siempre marca como listo, incluso si falla
        }
    }, []);

    const reset = useCallback(() => {
        setTrainer(null);
        setTokens(null);
        setFragments(0);
        setGuildTag(null);
        setGuildRole(null);
        setTrainerReady(false);
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(load, 30_000);
        window.addEventListener("sidebar:reload", load);

        // Cuando cambia el usuario (login/register/logout) → reset + reload
        const onAuthChanged = (e: Event) => {
            const { type } = (e as CustomEvent).detail;
            if (type === "logout") {
                // Logout: limpiar todo y marcar ready (no hay datos que esperar)
                setTrainer(null);
                setTokens(null);
                setFragments(0);
                setGuildTag(null);
                setGuildRole(null);
                setTrainerReady(true);
            } else {
                // Login/register: resetear ready y recargar con el nuevo token
                setTrainerReady(false);
                load();
            }
        };
        window.addEventListener("auth:changed", onAuthChanged);

        return () => {
            clearInterval(interval);
            window.removeEventListener("sidebar:reload", load);
            window.removeEventListener("auth:changed", onAuthChanged);
        };
    }, [load]);

    return (
        <TrainerContext.Provider value={{ trainer, tokens, fragments, guildTag, guildRole, trainerReady, reload: load, reset }}>
            {children}
        </TrainerContext.Provider>
    );
}

export function useTrainer() {
    return useContext(TrainerContext);
}
