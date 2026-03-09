import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { api } from "../lib/api";

interface TrainerContextValue {
    trainer: any;
    tokens: any;
    reload: () => void;
}

const TrainerContext = createContext<TrainerContextValue>({
    trainer: null,
    tokens: null,
    reload: () => {},
});

export function TrainerProvider({ children }: { children: React.ReactNode }) {
    const [trainer, setTrainer] = useState<any>(null);
    const [tokens, setTokens] = useState<any>(null);

    const load = useCallback(async () => {
        try {
            const [t, tk] = await Promise.all([api.trainer(), api.tokens()]);
            setTrainer(t);
            setTokens(tk);
        } catch {}
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(load, 30_000);
        window.addEventListener("sidebar:reload", load);
        return () => {
            clearInterval(interval);
            window.removeEventListener("sidebar:reload", load);
        };
    }, [load]);

    return <TrainerContext.Provider value={{ trainer, tokens, reload: load }}>{children}</TrainerContext.Provider>;
}

export function useTrainer() {
    return useContext(TrainerContext);
}
