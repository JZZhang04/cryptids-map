import { useEffect, useMemo, useState } from "react";
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
    publicCreatures: Creature[];
    userCreatures: Creature[];
    onSelect: (creature: Creature) => void;
    onClose: () => void;
}

function getInitialLetter(name: string) {
    const firstChar = name.trim().charAt(0).toUpperCase();
    return /^[A-Z]$/.test(firstChar) ? firstChar : "#";
}

function getReviewBadge(creature: Creature) {
    if (creature.source !== "user") {
        return undefined;
    }

    switch (creature.reviewStatus) {
        case "pending_review":
            return "Pending Review";
        case "approved":
            return "Approved";
        case "rejected":
            return "Rejected";
        default:
            return "Draft";
    }
}

export default function CryptidListPanel({
    isOpen,
    allCreatures,
    publicCreatures,
    userCreatures,
    onSelect,
    onClose,
}: Props) {
    const [page, setPage] = useState(1);

    const sortedAllCreatures = useMemo(
        () => [...allCreatures].sort((a, b) => a.name.localeCompare(b.name)),
        [allCreatures]
    );
    const sortedPublicCreatures = useMemo(
        () => [...publicCreatures].sort((a, b) => a.name.localeCompare(b.name)),
        [publicCreatures]
    );
    const sortedUserCreatures = useMemo(
        () => [...userCreatures].sort((a, b) => a.name.localeCompare(b.name)),
        [userCreatures]
    );

    const availableLetters = useMemo(() => {
        const letters = new Set<string>();
        [...sortedAllCreatures, ...sortedPublicCreatures, ...sortedUserCreatures].forEach((creature) => {
            letters.add(getInitialLetter(creature.name));
        });

        const orderedLetters = Array.from(letters).sort((a, b) => {
            if (a === "#") return 1;
            if (b === "#") return -1;
            return a.localeCompare(b);
        });

        return orderedLetters.length > 0 ? orderedLetters : ["A"];
    }, [sortedAllCreatures, sortedPublicCreatures, sortedUserCreatures]);

    const totalPages = availableLetters.length;
    const alphabetIndex = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "#"];

    useEffect(() => {
        if (!isOpen) {
            setPage(1);
            return;
        }

        setPage((current) => Math.min(current, totalPages));
    }, [isOpen, totalPages]);

    const currentLetter = availableLetters[Math.max(0, page - 1)] ?? "A";
    const pagedAllCreatures = sortedAllCreatures.filter((creature) => getInitialLetter(creature.name) === currentLetter);
    const pagedPublicCreatures = sortedPublicCreatures.filter((creature) => getInitialLetter(creature.name) === currentLetter);
    const pagedUserCreatures = sortedUserCreatures.filter((creature) => getInitialLetter(creature.name) === currentLetter);

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
                            {allCreatures.length + publicCreatures.length + userCreatures.length} creatures total
                        </p>
                    </div>
                    <button onClick={onClose} className="side-panel-close" aria-label="Close list panel">
                        ✕
                    </button>
                </div>

                <div className="list-pagination-bar">
                    <button
                        type="button"
                        className="list-pagination-button"
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        disabled={page === 1}
                    >
                        Previous
                    </button>
                    <div className="list-pagination-copy">
                        <strong>{currentLetter === "#" ? "Symbols / Numbers" : `Letter ${currentLetter}`}</strong>
                        <span>
                            {currentLetter === "#"
                                ? "Showing all non-letter entries in each section"
                                : `Showing all ${currentLetter}-entries in each section`}
                        </span>
                    </div>
                    <button
                        type="button"
                        className="list-pagination-button"
                        onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                        disabled={page === totalPages}
                    >
                        Next
                    </button>
                </div>

                <div className="list-letter-index" aria-label="Alphabet index">
                    {alphabetIndex.map((letter) => {
                        const pageIndex = availableLetters.indexOf(letter);
                        const isAvailable = pageIndex !== -1;
                        const isActive = currentLetter === letter;

                        return (
                            <button
                                key={letter}
                                type="button"
                                className={isActive ? "list-letter-button is-active" : "list-letter-button"}
                                disabled={!isAvailable}
                                onClick={() => {
                                    if (isAvailable) {
                                        setPage(pageIndex + 1);
                                    }
                                }}
                                aria-label={letter === "#" ? "Jump to symbols and numbers" : `Jump to letter ${letter}`}
                            >
                                {letter}
                            </button>
                        );
                    })}
                </div>

                <div className="list-panel-body">
                    <SectionLabel label="Database" count={allCreatures.length} />
                    {pagedAllCreatures.map((c) => (
                        <CreatureRow key={c.name} creature={c} onClick={() => { onSelect(c); onClose(); }} />
                    ))}
                    {pagedAllCreatures.length === 0 && (
                        <div className="list-empty-state">
                            <p className="list-empty-title">No database entries for {currentLetter}</p>
                            <p className="list-empty-copy">Try another letter to continue browsing the archive.</p>
                        </div>
                    )}

                    <SectionLabel label="Community Sightings" count={publicCreatures.length} />
                    {pagedPublicCreatures.length > 0 ? (
                        pagedPublicCreatures.map((c, i) => (
                            <CreatureRow
                                key={c.id ?? `public-${i}-${c.name}`}
                                creature={c}
                                visibilityBadge="Approved"
                                onClick={() => { onSelect(c); onClose(); }}
                            />
                        ))
                    ) : (
                        <div className="list-empty-state">
                            <p className="list-empty-title">No public community entries yet</p>
                            <p className="list-empty-copy">
                                Public sightings shared by explorers will appear here for everyone to browse.
                            </p>
                        </div>
                    )}

                    <SectionLabel label="Added by You" count={userCreatures.length} />
                    {pagedUserCreatures.length > 0 ? (
                        pagedUserCreatures.map((c, i) => (
                            <CreatureRow
                                key={c.id ?? `user-${i}-${c.name}`}
                                creature={c}
                                userAdded
                                visibilityBadge={getReviewBadge(c)}
                                onClick={() => { onSelect(c); onClose(); }}
                            />
                        ))
                    ) : (
                        <div className="list-empty-state">
                            <p className="list-empty-title">No personal entries yet</p>
                            <p className="list-empty-copy">
                                Add your first creature to start building a personal field guide.
                            </p>
                        </div>
                    )}
                </div>

                <div className="list-pagination-footer">
                    <span>
                        Index {page} of {totalPages} · {currentLetter === "#" ? "Symbols / Numbers" : `${currentLetter}–${currentLetter}`}
                    </span>
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
    visibilityBadge,
    onClick,
}: {
    creature: Creature;
    userAdded?: boolean;
    visibilityBadge?: string;
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
                    {visibilityBadge && <span className="list-creature-badge list-creature-badge-secondary">{visibilityBadge}</span>}
                </div>
                <div className="list-creature-location">{creature.location}</div>
            </div>
            <span className="list-creature-arrow">›</span>
        </div>
    );
}
