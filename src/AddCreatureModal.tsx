import { useState, useEffect } from "react";
import type { Creature } from "./types";

const CATEGORIES = ["Humanoid", "Aquatic", "Flying", "Beast / Monster"];

interface Props {
  onAdd: (creature: Creature) => void;
  onClose: () => void;
  pickedCoords: [number, number] | null;
  onStartPicking: () => void;
  isPicking: boolean;
}

export default function AddCreatureModal({
  onAdd,
  onClose,
  pickedCoords,
  onStartPicking,
  isPicking,
}: Props) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Humanoid");
  const [error, setError] = useState("");

  useEffect(() => {
    if (pickedCoords) {
      setLat(pickedCoords[0].toFixed(4));
      setLng(pickedCoords[1].toFixed(4));
    }
  }, [pickedCoords]);

  const handleSubmit = () => {
    setError("");
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (Number.isNaN(latNum) || Number.isNaN(lngNum)) {
      setError("Valid coordinates are required.");
      return;
    }
    if (latNum < -90 || latNum > 90) {
      setError("Latitude must be between -90 and 90.");
      return;
    }
    if (lngNum < -180 || lngNum > 180) {
      setError("Longitude must be between -180 and 180.");
      return;
    }

    onAdd({
      name: name.trim(),
      location: location.trim() || "Unknown",
      coords: [latNum, lngNum],
      description: description.trim(),
      category,
    });
    onClose();
  };

  return (
    <>
      <div
        onClick={isPicking ? undefined : onClose}
        className={isPicking ? "modal-scrim is-hidden" : "modal-scrim is-open"}
      />

      <div className={isPicking ? "add-creature-modal is-picking" : "add-creature-modal"}>
        <div className="modal-header">
          <div>
            <p className="side-panel-eyebrow">Field Entry</p>
            <h2 className="side-panel-title">Add Creature</h2>
            <p className="modal-subtitle">Record a new sighting for the field guide.</p>
          </div>
          <button onClick={onClose} className="side-panel-close" aria-label="Close add creature modal">
            ✕
          </button>
        </div>

        <div className="modal-form">
          <label className="modal-field">
            <span className="modal-label">Name *</span>
            <input
              className="modal-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dover Demon"
            />
          </label>

          <label className="modal-field">
            <span className="modal-label">Location</span>
            <input
              className="modal-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Dover, Massachusetts"
            />
          </label>

          <div className="modal-field">
            <span className="modal-label">Coordinates *</span>
            <div className="modal-coordinates">
              <input
                className="modal-input"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="Latitude"
              />
              <input
                className="modal-input"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="Longitude"
              />
              <button
                onClick={onStartPicking}
                title="Click on map to pick coordinates"
                className="modal-pin"
                type="button"
              >
                📍
              </button>
            </div>
            <p className="modal-help">Enter manually or click the pin, then select a point on the map.</p>
          </div>

          <label className="modal-field">
            <span className="modal-label">Category</span>
            <select
              className="modal-input modal-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="modal-field">
            <span className="modal-label">Description</span>
            <textarea
              className="modal-input modal-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the creature..."
            />
          </label>

          {error && <p className="modal-error">{error}</p>}

          <button onClick={handleSubmit} className="modal-submit" type="button">
            Add to Map
          </button>
        </div>
      </div>

      {isPicking && (
        <div className="map-picking-hint header-panel">
          📍 Click anywhere on the map to set coordinates
        </div>
      )}
    </>
  );
}
