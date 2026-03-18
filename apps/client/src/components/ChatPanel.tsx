// apps/client/src/components/ChatPanel.tsx

import { useState, useRef, useEffect } from "react";
import { useSocket } from "../hooks/useSocket";
import type { ChatMessage } from "../types/chat";
import { useTrainer } from "../context/TrainerContext";
import { useAuth } from "../hooks/useAuth";

type Channel = "global" | "guild";

// ─── Single message row ───────────────────────────────────────────────────────

function MessageRow({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) {
  const time = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: isMe ? "flex-end" : "flex-start",
      marginBottom: 8,
    }}>
      {/* Username + tag + time */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
        {msg.guildTag && (
          <span style={{
            fontFamily: "'Rajdhani',sans-serif", fontWeight: 900, fontSize: "var(--font-xs)",
            color: "#7b2fff", letterSpacing: "0.12em",
          }}>
            [{msg.guildTag}]
          </span>
        )}
        <span style={{ fontSize: "var(--font-xs)", color: isMe ? "#4cc9f0" : "rgba(255,255,255,0.5)", fontWeight: 600 }}>
          {msg.username}
        </span>
        <span style={{ fontSize: "var(--font-xs)", color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
          {time}
        </span>
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: "80%",
        padding: "7px 10px",
        borderRadius: isMe ? "12px 12px 3px 12px" : "12px 12px 12px 3px",
        background: isMe ? "rgba(76,201,240,0.12)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${isMe ? "rgba(76,201,240,0.2)" : "rgba(255,255,255,0.07)"}`,
        fontSize: "var(--font-base)",
        color: "#e2e8f0",
        lineHeight: 1.45,
        wordBreak: "break-word",
      }}>
        {msg.content}
      </div>
    </div>
  );
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  onClose: () => void;
  defaultChannel?: Channel;
}

export default function ChatPanel({ onClose, defaultChannel = "global" }: ChatPanelProps) {
  const { user } = useAuth();
  const { guildTag, guildRole } = useTrainer();
  const { connected, globalMessages, guildMessages, sendMessage } = useSocket();

  const [channel, setChannel] = useState<Channel>(
    defaultChannel === "guild" && guildTag ? "guild" : "global"
  );
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  const messages = channel === "global" ? globalMessages : guildMessages;
  const hasGuild = !!guildTag;

  // Auto-scroll al fondo
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, channel]);

  // Focus input al abrir
  useEffect(() => { inputRef.current?.focus(); }, []);

  function handleSend() {
    const text = input.trim();
    if (!text || !connected) return;
    if (channel === "guild" && !hasGuild) return;
    sendMessage(channel, text);
    setInput("");
  }

  return (
    // Overlay
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 990,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
        padding: 16,
      }}
    >
      {/* Panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 380,
          height: "min(520px, 80dvh)",
          background: "rgba(7,11,20,0.98)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          display: "flex", flexDirection: "column",
          fontFamily: "'Exo 2', sans-serif",
          overflow: "hidden",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          flexShrink: 0,
          display: "flex", alignItems: "center", gap: 8,
          padding: "12px 14px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(4,8,15,0.95)",
        }}>
          {/* Channel tabs */}
          <div style={{ flex: 1, display: "flex", gap: 6 }}>
            {(["global", "guild"] as Channel[]).map(ch => {
              const disabled = ch === "guild" && !hasGuild;
              const active   = channel === ch;
              return (
                <button
                  key={ch}
                  onClick={() => !disabled && setChannel(ch)}
                  disabled={disabled}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 8,
                    border: `1px solid ${active ? "rgba(76,201,240,0.35)" : "rgba(255,255,255,0.08)"}`,
                    background: active ? "rgba(76,201,240,0.1)" : "transparent",
                    color: disabled ? "rgba(255,255,255,0.15)" : active ? "#4cc9f0" : "rgba(255,255,255,0.35)",
                    fontFamily: "'Rajdhani',sans-serif", fontWeight: 900,
                    fontSize: "var(--font-sm)", letterSpacing: "0.1em", textTransform: "uppercase",
                    cursor: disabled ? "not-allowed" : "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {ch === "global" ? "🌍 Global" : "⚔️ Guild"}
                </button>
              );
            })}
          </div>

          {/* Connection dot */}
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: connected ? "#06d6a0" : "#e63946",
            flexShrink: 0,
          }} title={connected ? "Connected" : "Disconnected"} />

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              width: 26, height: 26, borderRadius: 8,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.4)", fontSize: "var(--font-base)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        </div>

        {/* ── Messages ── */}
        <div style={{
          flex: 1, overflowY: "auto", padding: "12px 14px",
          scrollbarWidth: "none",
        }}>
          {messages.length === 0 && (
            <div style={{
              height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 8,
            }}>
              <span style={{ fontSize: 28, opacity: 0.3 }}>{channel === "global" ? "🌍" : "⚔️"}</span>
              <span style={{ fontSize: "var(--font-sm)", color: "rgba(255,255,255,0.2)", fontFamily: "monospace", letterSpacing: "0.1em" }}>
                {channel === "guild" && !hasGuild ? "JOIN A GUILD TO CHAT" : "NO MESSAGES YET"}
              </span>
            </div>
          )}
          {messages.map(msg => (
            <MessageRow
              key={msg.id}
              msg={msg}
              isMe={msg.userId === (user as any)?.id}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div style={{
          flexShrink: 0,
          padding: "10px 12px",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          display: "flex", gap: 8,
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            disabled={!connected || (channel === "guild" && !hasGuild)}
            placeholder={
              !connected ? "Connecting..." :
              channel === "guild" && !hasGuild ? "Join a guild to chat" :
              `Message ${channel}...`
            }
            maxLength={200}
            style={{
              flex: 1, padding: "9px 12px",
              borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#e2e8f0", fontSize: "var(--font-base)",
              fontFamily: "'Exo 2', sans-serif",
              outline: "none",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || !connected || (channel === "guild" && !hasGuild)}
            style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: input.trim() && connected ? "rgba(76,201,240,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${input.trim() && connected ? "rgba(76,201,240,0.3)" : "rgba(255,255,255,0.08)"}`,
              color: input.trim() && connected ? "#4cc9f0" : "rgba(255,255,255,0.2)",
              fontSize: "var(--font-lg)", cursor: "pointer", transition: "all 0.15s",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ▶
          </button>
        </div>
      </div>
    </div>
  );
}
