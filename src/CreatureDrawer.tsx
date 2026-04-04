import type { Creature } from "./types";

interface Props {
  creature: Creature | null;
  onClose: () => void;
}

const categoryColors: Record<string, string> = {
  Humanoid: "violet",
  Aquatic: "#3b82f6",
  Flying: "orange",
  "Beast / Monster": "#ef4444",
};

export default function CreatureDrawer({ creature, onClose }: Props) {
  const isOpen = creature !== null;

  return (
    <>
      {/* Scrim */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1199,
          background: "rgba(0,0,0,0.4)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: "340px",
          maxWidth: "90vw",
          zIndex: 1200,
          background: "#1a1a2e",
          color: "#eee",
          boxShadow: "-4px 0 24px rgba(0,0,0,0.6)",
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        <button
          onClick={onClose}
          aria-label="Close detail panel"
          style={{
            alignSelf: "flex-end",
            background: "transparent",
            border: "1px solid #555",
            color: "#eee",
            borderRadius: "4px",
            padding: "4px 10px",
            cursor: "pointer",
            marginBottom: "16px",
            fontSize: "16px",
          }}
        >
          ✕
        </button>

        {creature && (
          <>
            <h2 style={{ margin: "0 0 10px", fontSize: "22px", lineHeight: 1.3 }}>
              {creature.name}
            </h2>

            <span
              style={{
                display: "inline-block",
                background: categoryColors[creature.category] ?? "#555",
                borderRadius: "4px",
                padding: "3px 10px",
                fontSize: "12px",
                fontWeight: 600,
                marginBottom: "20px",
                color: "#fff",
                alignSelf: "flex-start",
              }}
            >
              {creature.category}
            </span>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Location
              </p>
              <p style={{ margin: 0, fontSize: "15px", color: "#ccc" }}>
                {creature.location}
              </p>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Coordinates
              </p>
              <p style={{ margin: 0, fontSize: "13px", color: "#aaa", fontFamily: "monospace" }}>
                {creature.coords[0].toFixed(4)}, {creature.coords[1].toFixed(4)}
              </p>
            </div>

            <div>
              <p style={{ margin: "0 0 8px", fontSize: "12px", color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Description
              </p>
              <p style={{ margin: 0, fontSize: "14px", lineHeight: 1.7, color: "#ddd" }}>
                {creature.description}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
