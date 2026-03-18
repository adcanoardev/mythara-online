// apps/client/src/hooks/useSocket.ts

import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";
import { getToken } from "../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type { ChatMessage } from "../types/chat";
import type { ChatMessage } from "../types/chat";

type Channel = "global" | "guild";

interface UseSocketReturn {
  connected:        boolean;
  globalMessages:   ChatMessage[];
  guildMessages:    ChatMessage[];
  sendMessage:      (channel: Channel, content: string) => void;
}

// ─── Singleton socket ─────────────────────────────────────────────────────────

let _socket: Socket | null = null;

function getSocket(): Socket {
  if (!_socket) {
    _socket = io(window.location.origin, {
      auth: { token: getToken() },
      transports: ["websocket"],
      autoConnect: false,
    });
  }
  return _socket;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSocket(): UseSocketReturn {
  const socket = useRef<Socket>(getSocket());
  const [connected, setConnected]       = useState(false);
  const [globalMessages, setGlobal]     = useState<ChatMessage[]>([]);
  const [guildMessages,  setGuild]      = useState<ChatMessage[]>([]);

  useEffect(() => {
    const s = socket.current;
    if (!s.connected) s.connect();

    function onConnect()    { setConnected(true); }
    function onDisconnect() { setConnected(false); }

    function onHistory({ channel, messages }: { channel: Channel; messages: ChatMessage[] }) {
      if (channel === "global") setGlobal(messages);
      else setGuild(messages);
    }

    function onMessage({ channel, message }: { channel: Channel; message: ChatMessage }) {
      if (channel === "global") {
        setGlobal(prev => [...prev.slice(-99), message]);
      } else {
        setGuild(prev => [...prev.slice(-99), message]);
      }
    }

    s.on("connect",       onConnect);
    s.on("disconnect",    onDisconnect);
    s.on("chat:history",  onHistory);
    s.on("chat:message",  onMessage);

    return () => {
      s.off("connect",      onConnect);
      s.off("disconnect",   onDisconnect);
      s.off("chat:history", onHistory);
      s.off("chat:message", onMessage);
    };
  }, []);

  const sendMessage = useCallback((channel: Channel, content: string) => {
    socket.current.emit("chat:send", { channel, content });
  }, []);

  return { connected, globalMessages, guildMessages, sendMessage };
}
