import { useState, useEffect } from "react";
import type { Creature } from "./types";

const CATEGORIES = ["Humanoid", "Aquatic", "Flying", "Beast / Monster"];
const MAX_NAME_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 600;

interface Props {
  onSave: (creature: Creature) => Promise<void>;
  onClose: () => void;
  pickedCoords: [number, number] | null;
  onStartPicking: () => void;
  isPicking: boolean;
  initialCreature?: Creature | null;
  storageLabel: string;
  allowVisibilityChoice?: boolean;
}

export default function AddCreatureModal({
  onSave,
  onClose,
  pickedCoords,
  onStartPicking,
  isPicking,
  initialCreature = null,
  storageLabel,
  allowVisibilityChoice = false,
}: Props) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Humanoid");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditing = Boolean(initialCreature);

  useEffect(() => {
    if (!initialCreature) {
      setName("");
      setLocation("");
      setLat("");
      setLng("");
      setDescription("");
      setCategory("Humanoid");
      setVisibility("private");
      setError("");
      return;
    }

    setName(initialCreature.name);
    setLocation(initialCreature.location);
    setLat(initialCreature.coords[0].toFixed(4));
    setLng(initialCreature.coords[1].toFixed(4));
    setDescription(initialCreature.description);
    setCategory(initialCreature.category);
    setVisibility(initialCreature.visibility ?? "private");
    setError("");
  }, [initialCreature]);

  useEffect(() => {
    if (pickedCoords) {
      setLat(pickedCoords[0].toFixed(4));
      setLng(pickedCoords[1].toFixed(4));
    }
  }, [pickedCoords]);

  const handleSubmit = async () => {
    setError("");
    const trimmedName = name.trim();
    const trimmedLocation = location.trim() || "Unknown";
    const trimmedDescription = description.trim();

    if (!trimmedName) {
      setError("Name is required.");
      return;
    }
    if (trimmedName.length > MAX_NAME_LENGTH) {
      setError(`Name must be ${MAX_NAME_LENGTH} characters or fewer.`);
      return;
    }
    if (trimmedDescription.length > MAX_DESCRIPTION_LENGTH) {
      setError(`Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.`);
      return;
    }
    if (!CATEGORIES.includes(category)) {
      setError("Please choose a valid category.");
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

    try {
      setIsSubmitting(true);
      await onSave({
        ...initialCreature,
        name: trimmedName,
        location: trimmedLocation,
        coords: [latNum, lngNum],
        description: trimmedDescription,
        category,
        visibility,
      });
      onClose();
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unable to save this cryptid.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
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
            <h2 className="side-panel-title">{isEditing ? "Edit Creature" : "Add Creature"}</h2>
            <p className="modal-subtitle">
              {isEditing
                ? "Revise your field-guide entry and save the updated details."
                : "Record a new sighting for the field guide."}
            </p>
            <p className="modal-storage-note">{storageLabel}</p>
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
              maxLength={MAX_NAME_LENGTH}
            />
            <p className="modal-help">{name.trim().length}/{MAX_NAME_LENGTH} characters</p>
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

          {allowVisibilityChoice && (
            <div className="modal-field">
              <span className="modal-label">Visibility</span>
              <div className="modal-visibility-grid">
                <label className={visibility === "private" ? "modal-visibility-card is-active" : "modal-visibility-card"}>
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={visibility === "private"}
                    onChange={() => setVisibility("private")}
                  />
                  <span className="modal-visibility-title">Only visible to you</span>
                  <span className="modal-visibility-copy">This entry stays private in your personal field guide.</span>
                </label>
                <label className={visibility === "public" ? "modal-visibility-card is-active" : "modal-visibility-card"}>
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={visibility === "public"}
                    onChange={() => setVisibility("public")}
                  />
                  <span className="modal-visibility-title">Submit for public review</span>
                  <span className="modal-visibility-copy">Moderators review it before it appears to everyone on the map.</span>
                </label>
              </div>
            </div>
          )}

          <label className="modal-field">
            <span className="modal-label">Description</span>
            <textarea
              className="modal-input modal-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the creature..."
              maxLength={MAX_DESCRIPTION_LENGTH}
            />
            <p className="modal-help">{description.trim().length}/{MAX_DESCRIPTION_LENGTH} characters</p>
          </label>

          {error && <p className="modal-error">{error}</p>}

          <button onClick={handleSubmit} className="modal-submit" type="button" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Add to Map"}
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
