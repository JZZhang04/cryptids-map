import React, { useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L, { type LatLngExpression, Icon } from "leaflet";
import creatures from "./data/cryptids_us.json";

// 🔹 定义可选主题类型
type ThemeType = "light" | "dark" | "gray";

// 🟢 分类颜色
const categoryColors: Record<string, string> = {
    Humanoid: "violet",
    Aquatic: "blue",
    Flying: "orange",
    "Beast / Monster": "red",
};

// 🟢 创建彩色图标
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

// 🟢 图例组件
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
                {collapsed ? "▶ 展开图例" : "▼ 收起图例"}
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

// 🟢 搜索控件
const Controls = ({
    selected,
    setSelected,
    onSearch,
}: {
    selected: string;
    setSelected: (val: string) => void;
    onSearch: (query: string) => void;
}) => {
    const [query, setQuery] = useState("");
    const [suggestions, setSuggestions] = useState<typeof creatures>([]);

    const handleChange = (val: string) => {
        setQuery(val);
        if (val.length > 0) {
            const matches = creatures.filter((c) =>
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
                top: "20px",
                left: "20px",
                zIndex: 1000,
                background: "rgba(255,255,255,0.95)",
                padding: "10px",
                borderRadius: "6px",
                fontSize: "14px",
                width: "260px",
            }}
        >
            <div style={{ marginBottom: "6px" }}>
                分类：
                <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    style={{ marginLeft: "4px", width: "140px" }}
                >
                    <option value="All">全部</option>
                    {Object.keys(categoryColors).map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>
            </div>

            <div style={{ position: "relative" }}>
                <input
                    type="text"
                    placeholder="搜索生物名..."
                    value={query}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    style={{
                        padding: "6px",
                        width: "100%",
                        borderRadius: "4px",
                        border: "1px solid #555",
                        backgroundColor: "rgba(0,0,0,0.85)",
                        color: "white",
                        outline: "none",
                    }}
                />

                <button
                    onClick={handleSubmit}
                    style={{
                        position: "absolute",
                        right: "4px",
                        top: "4px",
                        padding: "4px 6px",
                        fontSize: "12px",
                        cursor: "pointer",
                        borderRadius: "4px",
                        border: "1px solid #555",
                        backgroundColor: "rgba(0,0,0,0.85)",
                        color: "white",
                    }}
                >
                    🔍
                </button>

                {suggestions.length > 0 && (
                    <ul
                        style={{
                            position: "absolute",
                            top: "36px",
                            left: 0,
                            right: 0,
                            background: "rgba(0,0,0,0.85)",
                            color: "white",
                            border: "1px solid #ccc",
                            borderRadius: "4px",
                            maxHeight: "150px",
                            overflowY: "auto",
                            margin: 0,
                            padding: "4px",
                            listStyle: "none",
                            zIndex: 1100,
                        }}
                    >
                        {suggestions.map((c) => (
                            <li
                                key={c.name}
                                onClick={() => handleSelect(c.name)}
                                style={{
                                    padding: "6px",
                                    cursor: "pointer",
                                    borderRadius: "4px",
                                }}
                                onMouseEnter={(e) =>
                                (e.currentTarget.style.backgroundColor =
                                    "rgba(255,255,255,0.2)")
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

// 🟢 Hook：执行飞到目标并打开 Popup
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
    const [theme, setTheme] = useState<ThemeType>("light"); // ✅ 初始主题

    // 🟢 Marker refs
    const markerRefs = useRef<Record<string, React.RefObject<L.Marker | null>>>(
        {}
    );
    creatures.forEach((c) => {
        if (!markerRefs.current[c.name]) {
            markerRefs.current[c.name] = React.createRef<L.Marker | null>();
        }
    });

    // 🟢 根据筛选过滤
    const filteredCreatures =
        filter === "All"
            ? creatures
            : creatures.filter((c) => c.category === filter);

    // 🟢 搜索功能
    const handleSearch = (query: string) => {
        const match = creatures.find(
            (c) => c.name.toLowerCase() === query.toLowerCase()
        );
        if (match) {
            setFlyCoords(match.coords as LatLngExpression);
            setActiveMarker(markerRefs.current[match.name]);
        } else {
            alert("未找到该生物");
        }
    };

    // 🔹 主题配置
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

                {/* 渲染 Marker */}
                {filteredCreatures.map((c) => {
                    const color = categoryColors[c.category] || "grey";
                    return (
                        <Marker
                            key={c.name}
                            position={c.coords as LatLngExpression}
                            icon={createIcon(color)}
                            ref={markerRefs.current[c.name]}
                        >
                            <Popup>
                                <h3>{c.name}</h3>
                                <p>
                                    <b>地点：</b>
                                    {c.location}
                                </p>
                                <p>{c.description}</p>
                                <p>
                                    <i>分类：{c.category}</i>
                                </p>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* 飞到目标并打开 Popup */}
                <FlyToAndOpen coords={flyCoords} markerRef={activeMarker} />
            </MapContainer>

            {/* 控件 & 图例 */}
            <Controls
                selected={filter}
                setSelected={setFilter}
                onSearch={handleSearch}
            />
            <Legend />
            {/* 🔹 主题切换按钮 */}
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
                    <option value="light">🌍 亮色</option>
                    <option value="gray">🌫️ 灰色</option>
                    <option value="dark">🌙 暗色</option>
                </select>
            </div>
        </div>
    );
}