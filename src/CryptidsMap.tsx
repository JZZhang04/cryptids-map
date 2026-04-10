import React, { useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import L, { type LatLngExpression, Icon } from "leaflet";
import { useQuery } from "@apollo/client/react";
import { GET_CREATURES } from "./graphql/queries";
import CreatureDrawer from "./CreatureDrawer";
import AddCreatureModal from "./AddCreatureModal";
import CryptidListPanel from "./CryptidListPanel";
import type { Creature } from "./types";

// Map theme options
type ThemeType = "light" | "dark" | "gray";

// Category colors
const categoryColors: Record<string, string> = {
    Humanoid: "violet",
    Aquatic: "blue",
    Flying: "orange",
    "Beast / Monster": "red",
};

// Create colored marker icon
function createIcon(color: string) {
    return new Icon({
        iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
        shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    });
}

// Legend component
const Legend = () => {
    const [collapsed, setCollapsed] = useState(false);

    return (
        <div className="map-legend header-panel">
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="map-legend-toggle"
            >
                {collapsed ? "▶ Legend" : "▼ Legend"}
            </button>

            {!collapsed && (
                <ul className="map-legend-list">
                    {Object.entries(categoryColors).map(([cat, color]) => (
                        <li key={cat} className="map-legend-item">
                            <span
                                style={{
                                    display: "inline-block",
                                    width: "12px",
                                    height: "12px",
                                    backgroundColor: color,
                                    borderRadius: "50%",
                                    marginRight: "8px",
                                    boxShadow: "0 0 0 2px rgba(255, 248, 232, 0.08)",
                                }}
                            ></span>
                            {cat}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// Search & filter controls
const Controls = ({
    selected,
    setSelected,
    onSearch,
    allCreatures,
}: {
    selected: string;
    setSelected: (val: string) => void;
    onSearch: (query: string) => void;
    allCreatures: Creature[];
}) => {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<Creature[]>([]);

    const handleChange = (val: string) => {
        setQuery(val);
        if (val.length > 0) {
            const matches = allCreatures.filter((c) =>
                c.name.toLowerCase().includes(val.toLowerCase())
            );
            setSuggestions(matches.slice(0, 6));
        } else {
            setSuggestions([]);
        }
    };

    const handleSelect = (name: string) => {
        setQuery(name);
        setSuggestions([]);
        onSearch(name);
    };

    const handleSubmit = () => {
        if (query.trim()) {
            handleSelect(query);
        }
    };

    return (
        <div className="map-controls header-panel">
            {/* Category filter */}
            <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="map-control-select"
            >
                <option value="All">All Categories</option>
                {Object.keys(categoryColors).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>

            {/* Search input */}
            <div className="map-control-search">
                <input
                    type="text"
                    placeholder="Search creature name..."
                    value={query}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    className="map-control-input"
                />
                <button
                    onClick={handleSubmit}
                    className="map-control-search-button"
                >
                    🔍
                </button>

                {suggestions.length > 0 && (
                    <ul className="map-control-suggestions">
                        {suggestions.map((c) => (
                            <li
                                key={c.name}
                                onClick={() => handleSelect(c.name)}
                                className="map-control-suggestion"
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.backgroundColor = "rgba(240, 193, 95, 0.12)")
                                }
                                onMouseLeave={(e) =>
                                    (e.currentTarget.style.backgroundColor = "transparent")
                                }
                            >
                                {c.name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

// Hook: capture map click when picking coordinates
function MapClickHandler({
    enabled,
    onPick,
}: {
    enabled: boolean;
    onPick: (coords: [number, number]) => void;
}) {
    useMapEvents({
        click(e) {
            if (enabled) {
                onPick([parseFloat(e.latlng.lat.toFixed(4)), parseFloat(e.latlng.lng.toFixed(4))]);
            }
        },
    });
    return null;
}

// Hook: fly to target and open popup
function FlyToAndOpen({
    coords,
    markerRef,
}: {
    coords: LatLngExpression | null;
    markerRef: React.RefObject<L.Marker | null> | null;
}) {
    const map = useMap();
    if (coords) {
        map.flyTo(coords, 8, { duration: 2 });
        if (markerRef?.current) {
            markerRef.current.openPopup();
        }
    }
    return null;
}

function LeftToolGroup({
    theme,
    setTheme,
}: {
    theme: ThemeType;
    setTheme: (theme: ThemeType) => void;
}) {
    const map = useMap();

    return (
        <div className="left-tool-group header-panel">
            <div className="left-tool-section">
                <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as ThemeType)}
                    className="theme-switcher-select"
                    aria-label="Map theme"
                >
                    <option value="light">🌍 Light</option>
                    <option value="gray">🌫️ Gray</option>
                    <option value="dark">🌙 Dark</option>
                </select>
            </div>

            <div className="left-tool-divider" />

            <div className="left-tool-section left-tool-zoom">
                <button
                    type="button"
                    className="left-tool-button"
                    onClick={() => map.zoomIn()}
                    aria-label="Zoom in"
                >
                    +
                </button>
                <button
                    type="button"
                    className="left-tool-button"
                    onClick={() => map.zoomOut()}
                    aria-label="Zoom out"
                >
                    −
                </button>
            </div>
        </div>
    );
}

export default function CryptidsMap() {
    const usaCenter: LatLngExpression = [39.8283, -98.5795];
    const worldBounds = L.latLngBounds(
        L.latLng(-85, -180),
        L.latLng(85, 180)
    );
    const [filter, setFilter] = useState("All");
    const [flyCoords, setFlyCoords] = useState<LatLngExpression | null>(null);
    const [activeMarker, setActiveMarker] =
        useState<React.RefObject<L.Marker | null> | null>(null);
    const [theme, setTheme] = useState<ThemeType>("light");
    const [drawerCreature, setDrawerCreature] = useState<Creature | null>(null);
    const [userCreatures, setUserCreatures] = useState<Creature[]>(() => {
        try {
            const saved = localStorage.getItem("userCreatures");
            return saved ? (JSON.parse(saved) as Creature[]) : [];
        } catch {
            return [];
        }
    });
    const [showAddModal, setShowAddModal] = useState(false);
    const [showListPanel, setShowListPanel] = useState(false);
    const [isPicking, setIsPicking] = useState(false);
    const [pickedCoords, setPickedCoords] = useState<[number, number] | null>(null);

    // 🟢 GraphQL query — fetch all creatures
    const { data, loading, error } = useQuery<{ creatures: Creature[] }>(GET_CREATURES);
    const allCreatures: Creature[] = data?.creatures ?? [];

    // Marker refs
    const markerRefs = useRef<Record<string, React.RefObject<L.Marker | null>>>({});
    allCreatures.forEach((c) => {
        if (!markerRefs.current[c.name]) {
            markerRefs.current[c.name] = React.createRef<L.Marker | null>();
        }
    });

    // Filter creatures by category
    const filteredCreatures =
        filter === "All"
            ? allCreatures
            : allCreatures.filter((c) => c.category === filter);

    // Search handler
    const handleSearch = (query: string) => {
        const match = allCreatures.find(
            (c) => c.name.toLowerCase() === query.toLowerCase()
        );
        if (match) {
            setFlyCoords(match.coords as LatLngExpression);
            setActiveMarker(markerRefs.current[match.name]);
        } else {
            alert("Creature not found.");
        }
    };

    // Theme tile config
    const themes: Record<ThemeType, {
        url: string;
        attribution: string;
        subdomains?: string[];
    }> = {
        light: {
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution: "&copy; OpenStreetMap contributors",
        },
        dark: {
            url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.carto.com/">CARTO</a>',
            subdomains: ["a", "b", "c", "d"],
        },
        gray: {
            url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.carto.com/">CARTO</a>',
            subdomains: ["a", "b", "c", "d"],
        },
    };

    const handleSelectFromList = (creature: Creature) => {
        setFlyCoords(creature.coords as LatLngExpression);
        setActiveMarker(markerRefs.current[creature.name] ?? null);
        setDrawerCreature(creature);
    };

    const handleAddCreature = (creature: Creature) => {
        setUserCreatures((prev) => {
            const updated = [...prev, creature];
            localStorage.setItem("userCreatures", JSON.stringify(updated));
            return updated;
        });
    };

    const handlePickStart = () => {
        setShowAddModal(false);
        setIsPicking(true);
    };

    const handleMapPick = (coords: [number, number]) => {
        setPickedCoords(coords);
        setIsPicking(false);
        setShowAddModal(true);
    };

    if (loading) return <div style={{ padding: 40, color: "#fff", background: "#111", height: "100vh" }}>Loading creatures...</div>;
    if (error) return <div style={{ padding: 40, color: "red" }}>Error: {error.message}</div>;

    return (
        <div className={isPicking ? "picking-mode" : ""} style={{ height: "100vh", width: "100%" }}>
            <MapContainer
                center={usaCenter}
                zoom={4}
                zoomControl={false}
                maxBounds={worldBounds}
                maxBoundsViscosity={1.0}
                worldCopyJump={false}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    url={themes[theme].url}
                    attribution={themes[theme].attribution}
                    noWrap
                    {...(themes[theme].subdomains ? { subdomains: themes[theme].subdomains } : {})}
                />

                {/* Render markers */}
                <MarkerClusterGroup chunkedLoading>
                    {filteredCreatures.map((c) => {
                        const color = categoryColors[c.category] || "grey";
                        return (
                            <Marker
                                key={c.name}
                                position={c.coords as LatLngExpression}
                                icon={createIcon(color)}
                                ref={markerRefs.current[c.name]}
                                eventHandlers={{
                                    click: () => setDrawerCreature(c),
                                }}
                            >
                                <Popup>
                                    <b>{c.name}</b><br />
                                    {c.location}
                                </Popup>
                            </Marker>
                        );
                    })}
                </MarkerClusterGroup>

                {/* Fly to searched creature */}
                <FlyToAndOpen coords={flyCoords} markerRef={activeMarker} />
                <LeftToolGroup theme={theme} setTheme={setTheme} />

                {/* Map click handler for coordinate picking */}
                <MapClickHandler enabled={isPicking} onPick={handleMapPick} />

                {/* User-added creature markers */}
                <MarkerClusterGroup chunkedLoading>
                    {userCreatures.map((c, i) => {
                        const color = categoryColors[c.category] || "grey";
                        return (
                            <Marker
                                key={`user-${i}-${c.name}`}
                                position={c.coords as LatLngExpression}
                                icon={createIcon(color)}
                                eventHandlers={{ click: () => setDrawerCreature(c) }}
                            >
                                <Popup><b>{c.name}</b><br />{c.location}</Popup>
                            </Marker>
                        );
                    })}
                </MarkerClusterGroup>
            </MapContainer>

            {/* Logo */}
            <div className="map-brand header-panel">
                <div className="map-brand-title">
                    <span className="map-brand-title-primary">Cryptids</span>
                    <span className="map-brand-title-secondary">Field Guide</span>
                </div>
                <span className="map-brand-subtitle">
                    Sightings, Legends, and Lore
                </span>
            </div>

            {/* Controls & legend */}
            <Controls
                selected={filter}
                setSelected={setFilter}
                onSearch={handleSearch}
                allCreatures={allCreatures}
            />
            <Legend />
            <CreatureDrawer
                creature={drawerCreature}
                onClose={() => setDrawerCreature(null)}
            />
            {/* Bottom-right action buttons */}
            <div className="map-actions header-panel">
                <button
                    onClick={() => setShowListPanel(true)}
                    className="map-actions-button"
                >
                    All Cryptids
                </button>
                <button
                    onClick={() => { setPickedCoords(null); setShowAddModal(true); }}
                    title="Add a new creature"
                    className="map-actions-add"
                >
                    +
                </button>
            </div>

            {/* All Cryptids list panel */}
            <CryptidListPanel
                isOpen={showListPanel}
                allCreatures={allCreatures}
                userCreatures={userCreatures}
                onSelect={handleSelectFromList}
                onClose={() => setShowListPanel(false)}
            />

            {/* Add creature modal */}
            {showAddModal && (
                <AddCreatureModal
                    onAdd={handleAddCreature}
                    onClose={() => { setShowAddModal(false); setIsPicking(false); }}
                    pickedCoords={pickedCoords}
                    onStartPicking={handlePickStart}
                    isPicking={isPicking}
                />
            )}
        </div>
    );
}
