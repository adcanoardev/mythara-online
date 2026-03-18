// apps/client/src/components/ConfirmModal.tsx
// ─── Mythara standard modal — style A ────────────────────────
// Usage:
//   <ConfirmModal
//     open={showModal}
//     onClose={() => setShowModal(false)}
//     onConfirm={handleAction}
//     title="Leave Guild"
//     description="You are the leader of [VOID] Void Walkers. Leaving will transfer leadership."
//     warning="This action cannot be undone. The new leader will be selected by prestige."
//     confirmLabel="Leave Guild"
//     accent="#e63946"
//     icon="⚠️"
//     loading={actionLoading}
//   />

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  warning?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  accent?: string;
  icon?: string;
  loading?: boolean;
}

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  warning,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  accent = "#e63946",
  icon = "⚠️",
  loading = false,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    // Overlay
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
      }}
    >
      {/* Modal card — stops propagation so clicking inside no cierra */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 360,
          background: "rgba(10,14,28,0.98)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 16,
          overflow: "hidden",
          fontFamily: "'Exo 2', sans-serif",
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: 3, background: `linear-gradient(90deg, ${accent}, ${accent}99)` }} />

        {/* Body */}
        <div style={{ padding: "20px 20px 18px" }}>

          {/* Icon */}
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `${accent}18`,
            border: `1px solid ${accent}35`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            marginBottom: 12,
            flexShrink: 0,
          }}>
            {icon}
          </div>

          {/* Title */}
          <div style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontWeight: 900,
            fontSize: "clamp(16px, 4vw, 18px)",
            letterSpacing: "0.04em",
            color: "var(--text-primary)",
            marginBottom: 6,
          }}>
            {title}
          </div>

          {/* Description */}
          <div style={{
            fontSize: "clamp(11px, 3vw, 12px)",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            marginBottom: warning ? 12 : 18,
          }}>
            {description}
          </div>

          {/* Warning box — opcional */}
          {warning && (
            <div style={{
              background: `${accent}0d`,
              border: `1px solid ${accent}30`,
              borderRadius: 8,
              padding: "9px 11px",
              marginBottom: 18,
              fontSize: "clamp(10px, 3vw, 11px)",
              color: `${accent}cc`,
              lineHeight: 1.5,
            }}>
              ⚔️ {warning}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 8px",
                borderRadius: 10,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "transparent",
                color: "var(--text-secondary)",
                fontFamily: "monospace",
                fontSize: "clamp(10px, 3vw, 11px)",
                letterSpacing: "0.1em",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{
                flex: 1,
                padding: "10px 8px",
                borderRadius: 10,
                border: "none",
                background: `linear-gradient(135deg, ${accent}, ${accent}bb)`,
                color: "#fff",
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 900,
                fontSize: "clamp(11px, 3vw, 12px)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "all 0.15s",
              }}
            >
              {loading ? "..." : confirmLabel}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
