import React, { useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import L, { type LatLngExpression, Icon } from "leaflet";
import { useQuery } from "@apollo/client/react";
import { GET_CREATURES } from "./graphql/queries";
import CreatureDrawer from "./CreatureDrawer";
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
        <div
            style={{
                position: "fixed",
                bottom: "20px",
                left: "20px",
                background: "rgba(0,0,0,0.7)",
                color: "white",
                borderRadius: "8px",
                fontSize: "14px",
                zIndex: 1000,
                padding: "8px",
                minWidth: "160px",
            }}
        >
            <button
                onClick={() => setCollapsed(!collapsed)}
                style={{
                    background: "transparent",
                    border: "1px solid #aaa",
                    color: "white",
                    width: "100%",
                    padding: "4px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    marginBottom: collapsed ? "0" : "8px",
                }}
            >
                {collapsed ? "▶ Legend" : "▼ Legend"}
            </button>

            {!collapsed && (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {Object.entries(categoryColors).map(([cat, color]) => (
                        <li key={cat} style={{ marginBottom: "4px" }}>
                            <span
                                style={{
                                    display: "inline-block",
                                    width: "12px",
                                    height: "12px",
                                    backgroundColor: color,
                                    borderRadius: "50%",
                                    marginRight: "6px",
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
        <div
            style={{
                position: "fixed",
                top: "16px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 1000,
                background: "rgba(10,10,10,0.92)",
                padding: "10px 14px",
                borderRadius: "10px",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
                minWidth: "480px",
            }}
        >
            {/* Category filter */}
            <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                style={{
                    padding: "7px 10px",
                    borderRadius: "6px",
                    border: "1px solid #444",
                    backgroundColor: "#1e1e1e",
                    color: "#eee",
                    fontSize: "13px",
                    cursor: "pointer",
                    flexShrink: 0,
                }}
            >
                <option value="All">All Categories</option>
                {Object.keys(categoryColors).map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
            </select>

            {/* Search input */}
            <div style={{ position: "relative", flex: 1 }}>
                <input
                    type="text"
                    placeholder="Search creature name..."
                    value={query}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    style={{
                        padding: "7px 36px 7px 10px",
                        width: "100%",
                        boxSizing: "border-box",
                        borderRadius: "6px",
                        border: "1px solid #444",
                        backgroundColor: "#1e1e1e",
                        color: "#eee",
                        fontSize: "13px",
                        outline: "none",
                    }}
                />
                <button
                    onClick={handleSubmit}
                    style={{
                        position: "absolute",
                        right: "6px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "transparent",
                        border: "none",
                        color: "#aaa",
                        cursor: "pointer",
                        fontSize: "14px",
                        padding: "0",
                        lineHeight: 1,
                    }}
                >
                    🔍
                </button>

                {suggestions.length > 0 && (
                    <ul
                        style={{
                            position: "absolute",
                            top: "calc(100% + 6px)",
                            left: 0,
                            right: 0,
                            background: "#1a1a1a",
                            color: "#eee",
                            border: "1px solid #444",
                            borderRadius: "6px",
                            maxHeight: "200px",
                            overflowY: "auto",
                            margin: 0,
                            padding: "4px",
                            listStyle: "none",
                            zIndex: 1100,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                        }}
                    >
                        {suggestions.map((c) => (
                            <li
                                key={c.name}
                                onClick={() => handleSelect(c.name)}
                                style={{
                                    padding: "7px 10px",
                                    cursor: "pointer",
                                    borderRadius: "4px",
                                    fontSize: "13px",
                                }}
                                onMouseEnter={(e) =>
                                    (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)")
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

export default function CryptidsMap() {
    const usaCenter: LatLngExpression = [39.8283, -98.5795];
    const [filter, setFilter] = useState("All");
    const [flyCoords, setFlyCoords] = useState<LatLngExpression | null>(null);
    const [activeMarker, setActiveMarker] =
        useState<React.RefObject<L.Marker | null> | null>(null);
    const [theme, setTheme] = useState<ThemeType>("light");
    const [drawerCreature, setDrawerCreature] = useState<Creature | null>(null);

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

    if (loading) return <div style={{ padding: 40, color: "#fff", background: "#111", height: "100vh" }}>Loading creatures...</div>;
    if (error) return <div style={{ padding: 40, color: "red" }}>Error: {error.message}</div>;

    return (
        <div style={{ height: "100vh", width: "100%" }}>
            <MapContainer
                center={usaCenter}
                zoom={4}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    url={themes[theme].url}
                    attribution={themes[theme].attribution}
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
            </MapContainer>

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
            {/* Theme selector */}
            <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 1100 }}>
                <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value as ThemeType)}
                    style={{
                        padding: "6px",
                        borderRadius: "6px",
                        border: "1px solid #555",
                        backgroundColor: "#fff",
                        cursor: "pointer",
                    }}
                >
                    <option value="light">🌍 Light</option>
                    <option value="gray">🌫️ Gray</option>
                    <option value="dark">🌙 Dark</option>
                </select>
            </div>
        </div>
    );
}
