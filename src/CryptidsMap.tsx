import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import L, { type LatLngExpression, Icon } from "leaflet";
import { useQuery } from "@apollo/client/react";
import { supabase } from "./supabase";
import { GET_CREATURES } from "./graphql/queries";
import CreatureDrawer from "./CreatureDrawer";
import AddCreatureModal from "./AddCreatureModal";
import CryptidListPanel from "./CryptidListPanel";
import type { Creature, UserCryptidRow } from "./types";

// Map theme options
type ThemeType = "light" | "dark" | "gray";

// Category colors
const categoryColors: Record<string, string> = {
    Humanoid: "violet",
    Aquatic: "blue",
    Flying: "orange",
    "Beast / Monster": "red",
};
const ALLOWED_CATEGORIES = new Set(Object.keys(categoryColors));
const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 600;

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

function createLocalCreatureId() {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return `local-${crypto.randomUUID()}`;
    }

    return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeLocalCreature(creature: Creature): Creature {
    return {
        ...creature,
        id: creature.id ?? createLocalCreatureId(),
        source: "user",
        visibility: creature.visibility ?? "private",
    };
}

type CryptidsMapProps = {
    isGuest?: boolean;
    refreshToken?: number;
};

export default function CryptidsMap({ isGuest = false, refreshToken = 0 }: CryptidsMapProps) {
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
    const [userCreatures, setUserCreatures] = useState<Creature[]>([]);
    const [publicCreatures, setPublicCreatures] = useState<Creature[]>([]);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingCreature, setEditingCreature] = useState<Creature | null>(null);
    const [showListPanel, setShowListPanel] = useState(false);
    const [isPicking, setIsPicking] = useState(false);
    const [pickedCoords, setPickedCoords] = useState<[number, number] | null>(null);
    const [isLoadingUserCreatures, setIsLoadingUserCreatures] = useState(true);
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
    const [pendingDeleteCreature, setPendingDeleteCreature] = useState<Creature | null>(null);

    useEffect(() => {
        if (!feedbackMessage) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            setFeedbackMessage(null);
        }, 2600);

        return () => window.clearTimeout(timeoutId);
    }, [feedbackMessage]);

    useEffect(() => {
        const loadUserCreatures = async () => {
            const guestMode = localStorage.getItem("cryptidsGuestMode") === "true";

            if (!supabase) {
                try {
                    const saved = localStorage.getItem("userCreatures");
                    const parsed = saved ? (JSON.parse(saved) as Creature[]) : [];
                    const normalized = parsed.map(normalizeLocalCreature);
                    setUserCreatures(normalized);
                    setPublicCreatures([]);
                    setCurrentUserId(null);
                    localStorage.setItem("userCreatures", JSON.stringify(normalized));
                } catch {
                    setUserCreatures([]);
                    setPublicCreatures([]);
                    setCurrentUserId(null);
                } finally {
                    setIsLoadingUserCreatures(false);
                }
                return;
            }

            if (guestMode) {
                try {
                    const saved = localStorage.getItem("userCreatures");
                    const parsed = saved ? (JSON.parse(saved) as Creature[]) : [];
                    const normalized = parsed.map(normalizeLocalCreature);
                    setUserCreatures(normalized);
                    setCurrentUserId(null);
                    localStorage.setItem("userCreatures", JSON.stringify(normalized));
                } catch {
                    setUserCreatures([]);
                    setCurrentUserId(null);
                }
            }

            const {
                data: { session },
            } = await supabase.auth.getSession();

            const { data: publicData, error: publicError } = await supabase
                .from("user_cryptids")
                .select("id, user_id, name, location, latitude, longitude, description, category, created_at, is_public")
                .eq("is_public", true)
                .order("created_at", { ascending: false });

            if (publicError) {
                console.error("Failed to load public cryptids:", publicError.message);
                setPublicCreatures([]);
                setFeedbackMessage(mapSupabaseError(publicError.message, "load"));
                setIsLoadingUserCreatures(false);
                return;
            }

            const mappedPublic = (publicData as UserCryptidRow[]).map((row) => ({
                id: row.id,
                ownerId: row.user_id,
                name: row.name,
                location: row.location,
                coords: [Number(row.latitude), Number(row.longitude)] as [number, number],
                description: row.description,
                category: row.category,
                source: "user" as const,
                createdAt: row.created_at,
                visibility: row.is_public ? "public" as const : "private" as const,
            }));

            if (!session?.user || guestMode) {
                setCurrentUserId(null);
                setUserCreatures([]);
                if (guestMode) {
                    try {
                        const saved = localStorage.getItem("userCreatures");
                        const parsed = saved ? (JSON.parse(saved) as Creature[]) : [];
                        setUserCreatures(parsed.map(normalizeLocalCreature));
                    } catch {
                        setUserCreatures([]);
                    }
                }
                setPublicCreatures(mappedPublic);
                setIsLoadingUserCreatures(false);
                return;
            }

            setCurrentUserId(session.user.id);

            const { data: ownData, error: ownError } = await supabase
                .from("user_cryptids")
                .select("id, user_id, name, location, latitude, longitude, description, category, created_at, is_public")
                .eq("user_id", session.user.id)
                .order("created_at", { ascending: false });

            if (ownError) {
                console.error("Failed to load own cryptids:", ownError.message);
                setUserCreatures([]);
                setPublicCreatures(mappedPublic.filter((entry) => entry.ownerId !== session.user.id));
                setFeedbackMessage(mapSupabaseError(ownError.message, "load"));
                setIsLoadingUserCreatures(false);
                return;
            }

            const mappedOwn = (ownData as UserCryptidRow[]).map((row) => ({
                id: row.id,
                ownerId: row.user_id,
                name: row.name,
                location: row.location,
                coords: [Number(row.latitude), Number(row.longitude)] as [number, number],
                description: row.description,
                category: row.category,
                source: "user" as const,
                createdAt: row.created_at,
                visibility: row.is_public ? "public" as const : "private" as const,
            }));

            setUserCreatures(mappedOwn);
            setPublicCreatures(mappedPublic.filter((entry) => entry.ownerId !== session.user.id));
            setIsLoadingUserCreatures(false);
        };

        loadUserCreatures();

        if (!supabase) {
            return;
        }

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(() => {
            setIsLoadingUserCreatures(true);
            loadUserCreatures();
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [refreshToken]);

    // 🟢 GraphQL query — fetch all creatures
    const { data, loading, error } = useQuery<{ creatures: Creature[] }>(GET_CREATURES);
    const allCreatures: Creature[] = data?.creatures ?? [];

    const searchableCreatures = [...allCreatures, ...publicCreatures, ...userCreatures];

    // Marker refs
    const markerRefs = useRef<Record<string, React.RefObject<L.Marker | null>>>({});
    searchableCreatures.forEach((c) => {
        const key = c.id ?? c.name;
        if (!markerRefs.current[key]) {
            markerRefs.current[key] = React.createRef<L.Marker | null>();
        }
    });

    // Filter creatures by category
    const filteredCreatures =
        filter === "All"
            ? allCreatures
            : allCreatures.filter((c) => c.category === filter);
    const filteredPublicCreatures =
        filter === "All"
            ? publicCreatures
            : publicCreatures.filter((c) => c.category === filter);
    const filteredUserCreatures =
        filter === "All"
            ? userCreatures
            : userCreatures.filter((c) => c.category === filter);

    // Search handler
    const handleSearch = (query: string) => {
        const match = searchableCreatures.find(
            (c) => c.name.toLowerCase() === query.toLowerCase()
        );
        if (match) {
            setFlyCoords(match.coords as LatLngExpression);
            setActiveMarker(markerRefs.current[match.id ?? match.name]);
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
        setActiveMarker(markerRefs.current[creature.id ?? creature.name] ?? null);
        setDrawerCreature(creature);
    };

    const persistLocalCreatures = (nextCreatures: Creature[]) => {
        localStorage.setItem("userCreatures", JSON.stringify(nextCreatures));
        setUserCreatures(nextCreatures);
    };

    const storageLabel = isGuest
        ? "Saved locally in this browser as a guest entry."
        : "Saved to your signed-in account.";

    const validateCreature = (creature: Creature) => {
        const normalizedName = creature.name.trim().toLowerCase();
        const normalizedLocation = creature.location.trim() || "Unknown";
        const normalizedDescription = creature.description.trim();

        if (!normalizedName) {
            throw new Error("Name is required.");
        }

        if (creature.name.trim().length > MAX_NAME_LENGTH) {
            throw new Error(`Name must be ${MAX_NAME_LENGTH} characters or fewer.`);
        }

        if (normalizedDescription.length > MAX_DESCRIPTION_LENGTH) {
            throw new Error(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`);
        }

        if (!ALLOWED_CATEGORIES.has(creature.category)) {
            throw new Error("Please choose a valid category.");
        }

        const duplicateUserEntry = userCreatures.find((entry) => {
            if (editingCreature?.id && entry.id === editingCreature.id) {
                return false;
            }

            return entry.name.trim().toLowerCase() === normalizedName;
        });

        const duplicateDatabaseEntry = [...allCreatures, ...publicCreatures].find(
            (entry) => entry.name.trim().toLowerCase() === normalizedName
        );

        if (duplicateUserEntry || duplicateDatabaseEntry) {
            throw new Error("You already added a cryptid with this exact name.");
        }

        return {
            ...creature,
            name: creature.name.trim(),
            location: normalizedLocation,
            description: normalizedDescription,
            visibility: creature.visibility ?? "private",
        };
    };

    const mapSupabaseError = (message: string, action: "load" | "save" | "update" | "delete") => {
        const loweredMessage = message.toLowerCase();

        if (loweredMessage.includes("row-level security") || loweredMessage.includes("permission denied")) {
            return `Permission denied. Your account is not allowed to ${action} this cryptid yet. Check the RLS policies on public.user_cryptids.`;
        }

        if (loweredMessage.includes("jwt") || loweredMessage.includes("not authenticated") || loweredMessage.includes("auth session missing")) {
            return "Your session is no longer active. Please log in again and try once more.";
        }

        return message;
    };

    const handleSaveCreature = async (creature: Creature) => {
        const guestMode = localStorage.getItem("cryptidsGuestMode") === "true";
        const validatedCreature = validateCreature(creature);
        const normalizedCreature = {
            ...validatedCreature,
            id: validatedCreature.id ?? editingCreature?.id,
            source: "user" as const,
            visibility: guestMode ? "private" as const : validatedCreature.visibility ?? "private" as const,
        };

        if (!supabase || guestMode) {
            if (editingCreature?.id) {
                const updated = userCreatures.map((entry) =>
                    entry.id === editingCreature.id
                        ? { ...normalizedCreature, id: editingCreature.id, source: "user" as const }
                        : entry
                );
                persistLocalCreatures(updated);
                setDrawerCreature({ ...normalizedCreature, id: editingCreature.id, source: "user" });
                setEditingCreature(null);
                setFeedbackMessage("Entry updated in your local field guide.");
                return;
            }

            const newCreature = normalizeLocalCreature(normalizedCreature);
            const updated = [newCreature, ...userCreatures];
            persistLocalCreatures(updated);
            setDrawerCreature(newCreature);
            setFeedbackMessage("Creature saved to your local field guide.");
            return;
        }

        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
            throw new Error("You are not logged in. Please log in again before saving.");
        }

        if (editingCreature?.id) {
            const { error } = await supabase
                .from("user_cryptids")
                .update({
                    name: normalizedCreature.name,
                    location: normalizedCreature.location,
                    latitude: normalizedCreature.coords[0],
                    longitude: normalizedCreature.coords[1],
                    description: normalizedCreature.description,
                    category: normalizedCreature.category,
                    is_public: normalizedCreature.visibility === "public",
                })
                .eq("id", editingCreature.id)
                .eq("user_id", session.user.id);

            if (error) {
                throw new Error(mapSupabaseError(error.message, "update"));
            }

            const updatedCreature = {
                ...normalizedCreature,
                id: editingCreature.id,
                source: "user" as const,
            };
            setUserCreatures((prev) =>
                prev.map((entry) => (entry.id === editingCreature.id ? updatedCreature : entry))
            );
            setDrawerCreature(updatedCreature);
            setEditingCreature(null);
            setFeedbackMessage("Creature updated in your field guide.");
            return;
        }

        const { data: insertedRow, error } = await supabase
            .from("user_cryptids")
            .insert({
                user_id: session.user.id,
                name: normalizedCreature.name,
                location: normalizedCreature.location,
                latitude: normalizedCreature.coords[0],
                longitude: normalizedCreature.coords[1],
                description: normalizedCreature.description,
                category: normalizedCreature.category,
                is_public: normalizedCreature.visibility === "public",
            })
            .select("id, created_at, user_id, is_public")
            .single();

        if (error) {
            throw new Error(mapSupabaseError(error.message, "save"));
        }

        const savedCreature: Creature = {
            ...normalizedCreature,
            id: insertedRow.id,
            source: "user",
            createdAt: insertedRow.created_at,
            ownerId: insertedRow.user_id,
            visibility: insertedRow.is_public ? "public" : "private",
        };

        setUserCreatures((prev) => [savedCreature, ...prev]);
        setDrawerCreature(savedCreature);
        setFeedbackMessage("Creature saved to your field guide.");
    };

    const handleEditCreature = (creature: Creature) => {
        setDrawerCreature(null);
        setPickedCoords(creature.coords);
        setEditingCreature(creature);
        setShowAddModal(true);
    };

    const handleDeleteCreature = (creature: Creature) => {
        if (!creature.id) {
            return;
        }

        setPendingDeleteCreature(creature);
    };

    const confirmDeleteCreature = async () => {
        const creature = pendingDeleteCreature;
        if (!creature?.id) {
            setPendingDeleteCreature(null);
            return;
        }

        const guestMode = localStorage.getItem("cryptidsGuestMode") === "true";

        if (!supabase || guestMode) {
            const updated = userCreatures.filter((entry) => entry.id !== creature.id);
            persistLocalCreatures(updated);
            if (drawerCreature?.id === creature.id) {
                setDrawerCreature(null);
            }
            if (editingCreature?.id === creature.id) {
                setEditingCreature(null);
                setShowAddModal(false);
            }
            setFeedbackMessage("Creature removed from your local field guide.");
            setPendingDeleteCreature(null);
            return;
        }

        const {
            data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) {
            alert("You are not logged in. Please log in again before deleting.");
            setPendingDeleteCreature(null);
            return;
        }

        const { error } = await supabase
            .from("user_cryptids")
            .delete()
            .eq("id", creature.id)
            .eq("user_id", session.user.id);

        if (error) {
            alert(mapSupabaseError(error.message, "delete"));
            setPendingDeleteCreature(null);
            return;
        }

        setUserCreatures((prev) => prev.filter((entry) => entry.id !== creature.id));
        if (drawerCreature?.id === creature.id) {
            setDrawerCreature(null);
        }
        if (editingCreature?.id === creature.id) {
            setEditingCreature(null);
            setShowAddModal(false);
        }
        setFeedbackMessage("Creature removed from your field guide.");
        setPendingDeleteCreature(null);
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

    if (loading || isLoadingUserCreatures) return <div style={{ padding: 40, color: "#fff", background: "#111", height: "100vh" }}>Loading creatures...</div>;
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
                                ref={markerRefs.current[c.id ?? c.name]}
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
                    {filteredPublicCreatures.map((c, i) => {
                        const color = categoryColors[c.category] || "grey";
                        return (
                            <Marker
                                key={c.id ?? `public-${i}-${c.name}`}
                                position={c.coords as LatLngExpression}
                                icon={createIcon(color)}
                                ref={markerRefs.current[c.id ?? c.name]}
                                eventHandlers={{ click: () => setDrawerCreature(c) }}
                            >
                                <Popup><b>{c.name}</b><br />{c.location}</Popup>
                            </Marker>
                        );
                    })}
                    {filteredUserCreatures.map((c, i) => {
                        const color = categoryColors[c.category] || "grey";
                        return (
                            <Marker
                                key={c.id ?? `user-${i}-${c.name}`}
                                position={c.coords as LatLngExpression}
                                icon={createIcon(color)}
                                ref={markerRefs.current[c.id ?? c.name]}
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
                allCreatures={searchableCreatures}
            />
            <Legend />
            <CreatureDrawer
                creature={drawerCreature}
                onClose={() => setDrawerCreature(null)}
                onEdit={handleEditCreature}
                onDelete={handleDeleteCreature}
                currentUserId={currentUserId}
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
                    onClick={() => {
                        setPickedCoords(null);
                        setEditingCreature(null);
                        setShowAddModal(true);
                    }}
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
                publicCreatures={publicCreatures}
                userCreatures={userCreatures}
                onSelect={handleSelectFromList}
                onClose={() => setShowListPanel(false)}
            />

            {/* Add creature modal */}
            {showAddModal && (
                <AddCreatureModal
                    onSave={handleSaveCreature}
                    onClose={() => {
                        setShowAddModal(false);
                        setIsPicking(false);
                        setEditingCreature(null);
                    }}
                    pickedCoords={pickedCoords}
                    onStartPicking={handlePickStart}
                    isPicking={isPicking}
                    initialCreature={editingCreature}
                    storageLabel={storageLabel}
                    allowVisibilityChoice={!isGuest}
                />
            )}

            {feedbackMessage && (
                <div className="map-feedback-toast header-panel" role="status" aria-live="polite">
                    {feedbackMessage}
                </div>
            )}

            {pendingDeleteCreature && (
                <>
                    <div
                        className="modal-scrim is-open"
                        onClick={() => setPendingDeleteCreature(null)}
                    />
                    <div className="confirm-modal" role="dialog" aria-modal="true" aria-label="Delete creature entry">
                        <div className="modal-header">
                            <div>
                                <p className="side-panel-eyebrow">Field Guide</p>
                                <h2 className="side-panel-title">Delete Entry?</h2>
                                <p className="modal-subtitle">
                                    Remove <strong>{pendingDeleteCreature.name}</strong> from your field guide.
                                </p>
                                <p className="modal-storage-note">{storageLabel}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPendingDeleteCreature(null)}
                                className="side-panel-close"
                                aria-label="Close delete confirmation"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="confirm-modal-copy">
                            This action cannot be undone. You can always add the creature again later,
                            but this specific saved entry will be removed.
                        </div>

                        <div className="confirm-modal-actions">
                            <button
                                type="button"
                                className="detail-drawer-button"
                                onClick={() => setPendingDeleteCreature(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="detail-drawer-button detail-drawer-button-danger"
                                onClick={confirmDeleteCreature}
                            >
                                Delete Entry
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
