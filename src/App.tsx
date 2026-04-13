import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import CryptidsMap from "./CryptidsMap";
import "./App.css";

type AuthMode = "login" | "signup";

function App() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  const portalTitle = useMemo(
    () => (mode === "login" ? "Log in to explore the map" : "Create an explorer account"),
    [mode]
  );

  const portalAction = mode === "login" ? "Log in" : "Sign up";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      window.alert("Please enter both a username and password.");
      return;
    }

    setDisplayName(trimmedUsername);
    setIsAuthenticated(true);
    setShowGuide(true);
    setPassword("");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setShowGuide(false);
    setMode("login");
  };

  const handleGuestBrowse = () => {
    setDisplayName("Guest");
    setIsAuthenticated(true);
    setShowGuide(true);
    setPassword("");
  };

  return (
    <div className="app-shell">
      <CryptidsMap />

      {!isAuthenticated && <div className="app-overlay" aria-hidden="true" />}

      {!isAuthenticated && (
        <section className="portal-card" aria-label="Cryptids portal">
          <p className="portal-eyebrow">Field Guide</p>
          <h1>What are cryptids?</h1>
          <p className="portal-intro">
            Cryptids are creatures from folklore, eyewitness reports, and local legends that
            people debate but science has not fully verified. Most are best understood as fictional
            stories, misidentifications, eyewitness bias, or later retellings of regional folklore
            rather than scientifically confirmed animals. This map collects famous sightings,
            regional mysteries, and modern monster stories across the country.
          </p>

          <div className="portal-tabs" role="tablist" aria-label="Authentication options">
            <button
              type="button"
              className={mode === "signup" ? "portal-tab active" : "portal-tab"}
              onClick={() => setMode("signup")}
            >
              Sign up
            </button>
            <button
              type="button"
              className={mode === "login" ? "portal-tab active" : "portal-tab"}
              onClick={() => setMode("login")}
            >
              Log in
            </button>
          </div>

          <form className="portal-form" onSubmit={handleSubmit}>
            <div className="portal-copy">
              <h2>{portalTitle}</h2>
              <p>
                Authentication is just a placeholder right now, so any username and password will
                let you enter the map.
              </p>
            </div>

            <label className="portal-field">
              <span>Username</span>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Enter any username"
              />
            </label>

            <label className="portal-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter any password"
              />
            </label>

            <div className="portal-actions">
              <button type="submit" className="portal-submit">
                {portalAction}
              </button>
              <button type="button" className="portal-guest" onClick={handleGuestBrowse}>
                Browse as guest
              </button>
            </div>
          </form>
        </section>
      )}

      {isAuthenticated && (
        <div className="session-bar header-panel">
          <div className="session-copy">
            <span className="session-label">Explorer</span>
            <strong>{displayName}</strong>
          </div>
          <button type="button" className="session-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      )}

      {isAuthenticated && showGuide && (
        <div className="guide-overlay" role="dialog" aria-modal="true" aria-label="Map guide">
          <div className="guide-backdrop" />

          <div className="guide-bubble guide-bubble-brand">
            <h3>Field Guide Header</h3>
            <p>
              This is the main identity area for the map. You are now inside Cryptids Field Guide
              and ready to explore sightings across the country.
            </p>
          </div>

          <div className="guide-bubble guide-bubble-tools">
            <h3>Map Tools</h3>
            <p>
              The left tool group lets you switch the basemap style and zoom in or out of the map.
            </p>
          </div>

          <div className="guide-bubble guide-bubble-search">
            <h3>Search And Filter</h3>
            <p>
              Use the top controls to filter by category or search for a cryptid by name and jump
              to its location.
            </p>
          </div>

          <div className="guide-bubble guide-bubble-session">
            <h3>Explorer Panel</h3>
            <p>
              The top-right panel shows your current session. You can log out here anytime and go
              back to the portal.
            </p>
          </div>

          <div className="guide-bubble guide-bubble-legend">
            <h3>Legend</h3>
            <p>
              The legend explains which cryptid category each marker color represents.
            </p>
          </div>

          <div className="guide-bubble guide-bubble-actions">
            <h3>Browse And Add</h3>
            <p>
              The bottom-right actions open the full cryptid list or let you add a new sighting to
              the map.
            </p>
          </div>

          <div className="guide-center-card header-panel">
            <p className="portal-eyebrow">Quick Tour</p>
            <h2>Welcome to the map</h2>
            <p>
              These callouts introduce the main parts of the interface. When you are ready, click
              the button below and the guide will disappear so you can start exploring.
            </p>
            <button type="button" className="guide-confirm" onClick={() => setShowGuide(false)}>
              OK, explore the map
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
