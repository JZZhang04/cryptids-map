import type { Creature } from "./types";

interface Props {
  creature: Creature | null;
  onClose: () => void;
  onEdit: (creature: Creature) => void;
  onDelete: (creature: Creature) => void;
  currentUserId?: string | null;
}

const categoryColors: Record<string, string> = {
  Humanoid: "violet",
  Aquatic: "#3b82f6",
  Flying: "orange",
  "Beast / Monster": "#ef4444",
};

type TraitAxis = {
  label: string;
  value: number;
};

const traitKeywords = {
  habitat: [
    "lake",
    "river",
    "sea",
    "ocean",
    "water",
    "forest",
    "woods",
    "mountain",
    "cave",
    "swamp",
    "marsh",
    "desert",
    "barrens",
  ],
  mobility: ["wing", "flying", "fly", "flight", "bird", "leap", "swift", "horse", "serpent"],
  humanlike: ["human", "humanoid", "man", "woman", "ape", "hairy", "biped", "people", "person"],
  threat: ["devil", "monster", "beast", "attack", "terror", "fear", "danger", "claw", "fang", "horn", "blood"],
  mystery: ["legend", "legendary", "myth", "folklore", "mysterious", "said", "reported", "sighting", "haunt", "unknown"],
};

const categoryTraitBoosts: Record<string, Partial<Record<keyof typeof traitKeywords, number>>> = {
  Humanoid: { humanlike: 42, mystery: 18 },
  Aquatic: { habitat: 44, mystery: 16 },
  Flying: { mobility: 44, mystery: 12 },
  "Beast / Monster": { threat: 42, habitat: 10 },
};

function countKeywordMatches(text: string, keywords: string[]) {
  return keywords.reduce((total, keyword) => {
    const pattern = new RegExp(`\\b${keyword}\\w*\\b`, "gi");
    return total + (text.match(pattern)?.length ?? 0);
  }, 0);
}

function buildTraitAxes(creature: Creature): TraitAxis[] {
  const text = `${creature.name} ${creature.category} ${creature.location} ${creature.description}`.toLowerCase();
  const boosts = categoryTraitBoosts[creature.category] ?? {};

  return ([
    { key: "habitat", label: "Habitat" },
    { key: "mobility", label: "Mobility" },
    { key: "humanlike", label: "Humanlike" },
    { key: "threat", label: "Threat" },
    { key: "mystery", label: "Mystery" },
  ] as const).map(({ key, label }) => {
    const matchScore = countKeywordMatches(text, traitKeywords[key]) * 14;
    const descriptionWeight = Math.min(creature.description.length / 24, 18);
    const baseline = 22 + (boosts[key] ?? 0);
    return {
      label,
      value: Math.min(Math.round(baseline + matchScore + descriptionWeight), 100),
    };
  });
}

function buildRadarPoints(axes: TraitAxis[], radius: number, center: number) {
  return axes
    .map((axis, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / axes.length;
      const scaledRadius = (axis.value / 100) * radius;
      return `${center + Math.cos(angle) * scaledRadius},${center + Math.sin(angle) * scaledRadius}`;
    })
    .join(" ");
}

function buildRadarGuidePoints(count: number, radius: number, center: number) {
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    return `${center + Math.cos(angle) * radius},${center + Math.sin(angle) * radius}`;
  }).join(" ");
}

export default function CreatureDrawer({ creature, onClose, onEdit, onDelete, currentUserId = null }: Props) {
  const isOpen = creature !== null;
  const isOwnEntry =
    creature?.source === "user" &&
    (!creature.ownerId || (currentUserId !== null && creature.ownerId === currentUserId));
  const visibilityLabel =
    creature?.visibility === "public" ? "Public Submission" : creature?.source === "user" ? "Private Entry" : null;
  const reviewStatusLabel =
    creature?.reviewStatus === "pending_review"
      ? "Pending Review"
      : creature?.reviewStatus === "approved"
        ? "Approved"
        : creature?.reviewStatus === "rejected"
          ? "Rejected"
          : creature?.source === "user"
            ? "Draft"
            : null;
  const traitAxes = creature ? buildTraitAxes(creature) : [];

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
              <div className="detail-drawer-meta">
                <span
                  className="detail-drawer-category"
                  style={{ background: categoryColors[creature.category] ?? "#555" }}
                >
                  {creature.category}
                </span>
                {isOwnEntry && <span className="detail-drawer-origin">Your Entry</span>}
                {visibilityLabel && <span className="detail-drawer-origin detail-drawer-origin-secondary">{visibilityLabel}</span>}
                {reviewStatusLabel && <span className="detail-drawer-origin detail-drawer-origin-secondary">{reviewStatusLabel}</span>}
              </div>
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
              <p className="detail-drawer-label">Trait Signal</p>
              <div className="trait-chart" aria-label={`${creature.name} trait signal chart`}>
                <svg className="trait-chart-radar" viewBox="0 0 180 180" role="img" aria-hidden="true">
                  {[66, 44, 22].map((radius) => (
                    <polygon
                      key={radius}
                      points={buildRadarGuidePoints(5, radius, 90)}
                      className="trait-chart-guide"
                    />
                  ))}
                  {traitAxes.map((axis, index, axes) => {
                    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / axes.length;
                    return (
                      <line
                        key={axis.label}
                        x1="90"
                        y1="90"
                        x2={90 + Math.cos(angle) * 66}
                        y2={90 + Math.sin(angle) * 66}
                        className="trait-chart-spoke"
                      />
                    );
                  })}
                  <polygon
                    points={buildRadarPoints(traitAxes, 66, 90)}
                    className="trait-chart-shape"
                  />
                </svg>
                <div className="trait-chart-list">
                  {traitAxes.map((axis) => (
                    <div className="trait-chart-row" key={axis.label}>
                      <span>{axis.label}</span>
                      <div className="trait-chart-track" aria-hidden="true">
                        <span style={{ width: `${axis.value}%` }} />
                      </div>
                      <strong>{axis.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="detail-drawer-section">
              <p className="detail-drawer-label">Description</p>
              <p className="detail-drawer-description">{creature.description}</p>
            </section>

            {creature.reviewNotes && (
              <section className="detail-drawer-section">
                <p className="detail-drawer-label">Moderator Notes</p>
                <p className="detail-drawer-description">{creature.reviewNotes}</p>
              </section>
            )}

            {isOwnEntry && (
              <section className="detail-drawer-section detail-drawer-actions">
                <button
                  type="button"
                  className="detail-drawer-button"
                  onClick={() => onEdit(creature)}
                >
                  Edit Entry
                </button>
                <button
                  type="button"
                  className="detail-drawer-button detail-drawer-button-danger"
                  onClick={() => onDelete(creature)}
                >
                  Delete Entry
                </button>
              </section>
            )}
          </div>
        )}
      </div>
    </>
  );
}
