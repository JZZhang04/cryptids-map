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
      <div
        onClick={onClose}
        className={isOpen ? "panel-scrim is-open" : "panel-scrim"}
      />

      <div className={isOpen ? "detail-drawer is-open" : "detail-drawer"}>
        <div className="side-panel-header">
          <div>
            <p className="side-panel-eyebrow">Field Notes</p>
            <h2 className="side-panel-title">Creature Profile</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close detail panel"
            className="side-panel-close"
          >
            ✕
          </button>
        </div>

        {creature && (
          <div className="detail-drawer-body">
            <div className="detail-drawer-hero">
              <h3 className="detail-drawer-name">{creature.name}</h3>
              <span
                className="detail-drawer-category"
                style={{ background: categoryColors[creature.category] ?? "#555" }}
              >
                {creature.category}
              </span>
            </div>

            <section className="detail-drawer-section">
              <p className="detail-drawer-label">Location</p>
              <p className="detail-drawer-value">{creature.location}</p>
            </section>

            <section className="detail-drawer-section">
              <p className="detail-drawer-label">Coordinates</p>
              <p className="detail-drawer-coords">
                {creature.coords[0].toFixed(4)}, {creature.coords[1].toFixed(4)}
              </p>
            </section>

            <section className="detail-drawer-section">
              <p className="detail-drawer-label">Description</p>
              <p className="detail-drawer-description">{creature.description}</p>
            </section>
          </div>
        )}
      </div>
    </>
  );
}
