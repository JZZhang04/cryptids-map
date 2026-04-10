import type { Creature } from "./types";

const categoryColors: Record<string, string> = {
    Humanoid: "violet",
    Aquatic: "#3b82f6",
    Flying: "orange",
    "Beast / Monster": "#ef4444",
};

interface Props {
    isOpen: boolean;
    allCreatures: Creature[];
    userCreatures: Creature[];
    onSelect: (creature: Creature) => void;
    onClose: () => void;
}

export default function CryptidListPanel({
    isOpen,
    allCreatures,
    userCreatures,
    onSelect,
    onClose,
}: Props) {
    return (
        <>
            <div
                onClick={onClose}
                className={isOpen ? "panel-scrim is-open" : "panel-scrim"}
            />

            <div className={isOpen ? "list-panel is-open" : "list-panel"}>
                <div className="side-panel-header">
                    <div>
                        <p className="side-panel-eyebrow">Field Guide Archive</p>
                        <h2 className="side-panel-title">All Cryptids</h2>
                        <p className="list-panel-count">
                            {allCreatures.length + userCreatures.length} creatures total
                        </p>
                    </div>
                    <button onClick={onClose} className="side-panel-close" aria-label="Close list panel">
                        ✕
                    </button>
                </div>

                <div className="list-panel-body">
                    <SectionLabel label="Database" count={allCreatures.length} />
                    {allCreatures.map((c) => (
                        <CreatureRow key={c.name} creature={c} onClick={() => { onSelect(c); onClose(); }} />
                    ))}

                    {userCreatures.length > 0 && (
                        <>
                            <SectionLabel label="Added by You" count={userCreatures.length} />
                            {userCreatures.map((c, i) => (
                                <CreatureRow
                                    key={`user-${i}-${c.name}`}
                                    creature={c}
                                    userAdded
                                    onClick={() => { onSelect(c); onClose(); }}
                                />
                            ))}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}

function SectionLabel({ label, count }: { label: string; count: number }) {
    return (
        <div className="list-section-label">
            <span>{label}</span>
            <span className="list-section-count">{count}</span>
        </div>
    );
}

function CreatureRow({
    creature,
    userAdded = false,
    onClick,
}: {
    creature: Creature;
    userAdded?: boolean;
    onClick: () => void;
}) {
    return (
        <div
            onClick={onClick}
            className="list-creature-row"
            onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(240, 193, 95, 0.08)")
            }
            onMouseLeave={(e) =>
                (e.currentTarget.style.background = "transparent")
            }
        >
            <span
                className="list-creature-dot"
                style={{ background: categoryColors[creature.category] ?? "#555" }}
            />
            <div className="list-creature-copy">
                <div className="list-creature-name">
                    {creature.name}
                    {userAdded && <span className="list-creature-badge">You</span>}
                </div>
                <div className="list-creature-location">{creature.location}</div>
            </div>
            <span className="list-creature-arrow">›</span>
        </div>
    );
}
