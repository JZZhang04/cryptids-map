import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import CryptidsMap from "./CryptidsMap";
import { isSupabaseConfigured, supabase } from "./supabase";
import type { Creature, ProfileRole, UserCryptidRow } from "./types";
import reviewSuccessImage from "../docs/review_success.png";
import "./App.css";

type AuthMode = "login" | "signup";
type MigrationStatus =
  | "ready"
  | "duplicate-account"
  | "duplicate-selection"
  | "invalid-name"
  | "unselected";
type PendingMigrationEntry = {
  localKey: string;
  creature: Creature;
  selected: boolean;
  status: MigrationStatus;
  reason: string;
};
type ModeratorQueueItem = Creature;

const GUEST_STORAGE_KEY = "cryptidsGuestMode";
const USER_CREATURES_STORAGE_KEY = "userCreatures";
const REVIEW_NOTICE_STORAGE_PREFIX = "reviewApprovedNoticeSeen";

function readLocalGuestCreatures() {
  try {
    const saved = localStorage.getItem(USER_CREATURES_STORAGE_KEY);
    const parsed = saved ? (JSON.parse(saved) as Creature[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function createGuestEntryKey(creature: Creature, index: number) {
  return `${creature.name.trim().toLowerCase()}-${index}`;
}

function buildMigrationPlan(
  localCreatures: Creature[],
  existingAccountNames: Set<string>,
  selectedKeys: Set<string>
) {
  const seenSelectedNames = new Set<string>();

  return localCreatures.map((creature, index) => {
    const localKey = createGuestEntryKey(creature, index);
    const normalizedName = creature.name.trim().toLowerCase();
    const isSelected = selectedKeys.has(localKey);

    if (!isSelected) {
      return {
        localKey,
        creature,
        selected: false,
        status: "unselected" as const,
        reason: "Not selected for this migration.",
      };
    }

    if (!normalizedName) {
      return {
        localKey,
        creature,
        selected: true,
        status: "invalid-name" as const,
        reason: "Skipped because this entry is missing a valid name.",
      };
    }

    if (existingAccountNames.has(normalizedName)) {
      return {
        localKey,
        creature,
        selected: true,
        status: "duplicate-account" as const,
        reason: "Skipped because your account already has an entry with this name.",
      };
    }

    if (seenSelectedNames.has(normalizedName)) {
      return {
        localKey,
        creature,
        selected: true,
        status: "duplicate-selection" as const,
        reason: "Skipped because another selected guest entry already uses this name.",
      };
    }

    seenSelectedNames.add(normalizedName);
    return {
      localKey,
      creature,
      selected: true,
      status: "ready" as const,
      reason: "Ready to migrate to your account.",
    };
  });
}

function getDisplayName(session: Session | null) {
  const user = session?.user;
  if (!user) {
    return "";
  }

  const metadataName =
    typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : "";
  if (metadataName.trim()) {
    return metadataName.trim();
  }

  if (user.email) {
    return user.email.split("@")[0];
  }

  return "Explorer";
}

async function getUserRole(session: Session | null): Promise<ProfileRole> {
  if (!session?.user || !supabase) {
    return "user";
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single();

  if (error || !data?.role) {
    return "user";
  }

  return data.role as ProfileRole;
}

function mapReviewRow(row: UserCryptidRow): ModeratorQueueItem {
  return {
    id: row.id,
    ownerId: row.user_id,
    name: row.name,
    location: row.location,
    coords: [Number(row.latitude), Number(row.longitude)],
    description: row.description,
    category: row.category,
    source: "user",
    createdAt: row.created_at,
    visibility: row.visibility,
    reviewStatus: row.review_status,
    reviewNotes: row.review_notes ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
  };
}

function App() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [showGuide, setShowGuide] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authMessage, setAuthMessage] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [guestEntriesPendingMigration, setGuestEntriesPendingMigration] = useState(0);
  const [dismissedMigrationPrompt, setDismissedMigrationPrompt] = useState(false);
  const [isMigratingGuestData, setIsMigratingGuestData] = useState(false);
  const [migrationMessage, setMigrationMessage] = useState("");
  const [mapRefreshToken, setMapRefreshToken] = useState(0);
  const [pendingMigrationEntries, setPendingMigrationEntries] = useState<PendingMigrationEntry[]>([]);
  const [existingAccountNames, setExistingAccountNames] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<ProfileRole>("user");
  const [showModeratorPanel, setShowModeratorPanel] = useState(false);
  const [moderatorQueue, setModeratorQueue] = useState<ModeratorQueueItem[]>([]);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [reviewNotesDraft, setReviewNotesDraft] = useState("");
  const [isLoadingModeratorQueue, setIsLoadingModeratorQueue] = useState(false);
  const [isSubmittingReviewAction, setIsSubmittingReviewAction] = useState(false);
  const [moderatorMessage, setModeratorMessage] = useState("");
  const [approvedNoticeQueue, setApprovedNoticeQueue] = useState<Creature[]>([]);

  const selectedMigrationCount = pendingMigrationEntries.filter((entry) => entry.selected).length;
  const readyMigrationCount = pendingMigrationEntries.filter((entry) => entry.status === "ready").length;
  const selectedReviewItem =
    moderatorQueue.find((item) => item.id === selectedReviewId) ?? moderatorQueue[0] ?? null;
  const skippedSelectedEntries = pendingMigrationEntries.filter(
    (entry) =>
      entry.selected &&
      entry.status !== "ready" &&
      entry.status !== "unselected"
  );
  const currentApprovedNotice = approvedNoticeQueue[0] ?? null;

  useEffect(() => {
    setReviewNotesDraft(selectedReviewItem?.reviewNotes ?? "");
  }, [selectedReviewItem?.id]);

  const refreshMigrationState = async (activeSession: Session | null) => {
    const localCreatures = readLocalGuestCreatures();

    if (!activeSession?.user || localCreatures.length === 0 || !supabase) {
      setPendingMigrationEntries([]);
      setGuestEntriesPendingMigration(localCreatures.length);
      setExistingAccountNames([]);
      return;
    }

    const { data: existingRows, error } = await supabase
      .from("user_cryptids")
      .select("name")
      .eq("user_id", activeSession.user.id);

    if (error) {
      setExistingAccountNames([]);
      setPendingMigrationEntries(
        localCreatures.map((creature, index) => ({
          localKey: createGuestEntryKey(creature, index),
          creature,
          selected: true,
          status: "ready",
          reason: "Ready to migrate to your account.",
        }))
      );
      setGuestEntriesPendingMigration(localCreatures.length);
      return;
    }

    const existingNames = new Set(
      (existingRows ?? []).map((row) => String(row.name).trim().toLowerCase())
    );
    setExistingAccountNames(Array.from(existingNames));
    const selectedKeys = new Set(
      localCreatures.map((creature, index) => createGuestEntryKey(creature, index))
    );
    const plan = buildMigrationPlan(localCreatures, existingNames, selectedKeys);

    setPendingMigrationEntries(plan);
    setGuestEntriesPendingMigration(localCreatures.length);
  };

  const refreshModeratorQueue = async (activeSession: Session | null, activeRole: ProfileRole) => {
    if (!supabase || !activeSession?.user || !["moderator", "admin"].includes(activeRole)) {
      setModeratorQueue([]);
      setSelectedReviewId(null);
      return;
    }

    setIsLoadingModeratorQueue(true);
    const { data, error } = await supabase
      .from("user_cryptids")
      .select("id, user_id, name, location, latitude, longitude, description, category, created_at, visibility, review_status, review_notes")
      .eq("review_status", "pending_review")
      .order("created_at", { ascending: true });

    if (error) {
      setModeratorMessage(`Unable to load review queue. ${error.message}`);
      setModeratorQueue([]);
      setSelectedReviewId(null);
      setIsLoadingModeratorQueue(false);
      return;
    }

    const mappedQueue = ((data ?? []) as UserCryptidRow[]).map(mapReviewRow);
    setModeratorQueue(mappedQueue);
    setSelectedReviewId((current) =>
      mappedQueue.some((item) => item.id === current) ? current : mappedQueue[0]?.id ?? null
    );
    setIsLoadingModeratorQueue(false);
  };

  const refreshApprovedNotices = async (activeSession: Session | null) => {
    if (!supabase || !activeSession?.user) {
      setApprovedNoticeQueue([]);
      return;
    }

    const { data, error } = await supabase
      .from("user_cryptids")
      .select("id, user_id, name, location, latitude, longitude, description, category, created_at, visibility, review_status, review_notes, reviewed_at")
      .eq("user_id", activeSession.user.id)
      .eq("visibility", "public")
      .eq("review_status", "approved")
      .not("reviewed_at", "is", null)
      .order("reviewed_at", { ascending: false });

    if (error) {
      return;
    }

    const storageKey = `${REVIEW_NOTICE_STORAGE_PREFIX}:${activeSession.user.id}`;
    let seenIds: string[] = [];

    try {
      const saved = localStorage.getItem(storageKey);
      seenIds = saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      seenIds = [];
    }

    const unseenApproved = ((data ?? []) as UserCryptidRow[])
      .map(mapReviewRow)
      .filter((entry) => entry.id && !seenIds.includes(entry.id));

    setApprovedNoticeQueue(unseenApproved);
  };

  const dismissApprovedNotice = (creatureId?: string) => {
    if (session?.user && creatureId) {
      const storageKey = `${REVIEW_NOTICE_STORAGE_PREFIX}:${session.user.id}`;
      try {
        const saved = localStorage.getItem(storageKey);
        const seenIds = saved ? (JSON.parse(saved) as string[]) : [];
        if (!seenIds.includes(creatureId)) {
          localStorage.setItem(storageKey, JSON.stringify([...seenIds, creatureId]));
        }
      } catch {
        localStorage.setItem(storageKey, JSON.stringify([creatureId]));
      }
    }

    setApprovedNoticeQueue((prev) => prev.filter((entry) => entry.id !== creatureId));
  };

  const portalTitle = useMemo(
    () => (mode === "login" ? "Log in to explore the map" : "Create an explorer account"),
    [mode]
  );

  const portalAction = mode === "login" ? "Log in" : "Sign up";

  useEffect(() => {
    const initializeAuth = async () => {
      const guestMode = localStorage.getItem(GUEST_STORAGE_KEY) === "true";

      if (!isSupabaseConfigured || !supabase) {
        if (guestMode) {
          setIsGuest(true);
          setIsAuthenticated(true);
          setDisplayName("Guest");
        }
        setIsLoadingAuth(false);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        localStorage.removeItem(GUEST_STORAGE_KEY);
        const role = await getUserRole(session);
        setSession(session);
        setUserRole(role);
        setIsGuest(false);
        setIsAuthenticated(true);
        setDisplayName(getDisplayName(session));
        await refreshMigrationState(session);
        await refreshModeratorQueue(session, role);
        await refreshApprovedNotices(session);
      } else if (guestMode) {
        setSession(null);
        setUserRole("user");
        setIsGuest(true);
        setIsAuthenticated(true);
        setDisplayName("Guest");
        setGuestEntriesPendingMigration(0);
        setPendingMigrationEntries([]);
        setModeratorQueue([]);
        setSelectedReviewId(null);
        setApprovedNoticeQueue([]);
      } else {
        setSession(null);
        setUserRole("user");
        setGuestEntriesPendingMigration(0);
        setPendingMigrationEntries([]);
        setModeratorQueue([]);
        setSelectedReviewId(null);
        setApprovedNoticeQueue([]);
      }

      setIsLoadingAuth(false);
    };

    initializeAuth();

    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        if (session) {
          localStorage.removeItem(GUEST_STORAGE_KEY);
          void (async () => {
            const role = await getUserRole(session);
            setSession(session);
            setUserRole(role);
            setIsGuest(false);
            setIsAuthenticated(true);
            setDisplayName(getDisplayName(session));
            setAuthMessage("");
            setDismissedMigrationPrompt(false);
            await refreshMigrationState(session);
            await refreshModeratorQueue(session, role);
            await refreshApprovedNotices(session);
          })();
        } else {
          const guestMode = localStorage.getItem(GUEST_STORAGE_KEY) === "true";
          setSession(null);
          setUserRole("user");
          setIsGuest(guestMode);
          setIsAuthenticated(guestMode);
          setDisplayName(guestMode ? "Guest" : "");
          setGuestEntriesPendingMigration(0);
          setPendingMigrationEntries([]);
          setExistingAccountNames([]);
          setDismissedMigrationPrompt(false);
          setMigrationMessage("");
          setModeratorQueue([]);
          setSelectedReviewId(null);
          setShowModeratorPanel(false);
          setModeratorMessage("");
          setApprovedNoticeQueue([]);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setAuthMessage("Please enter both an email and password.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setAuthMessage(
        "Supabase is not configured yet. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local."
      );
      return;
    }

    setAuthMessage("");

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (error) {
        setAuthMessage(error.message);
        return;
      }

      localStorage.removeItem(GUEST_STORAGE_KEY);
      setEmail(trimmedEmail);
      setPassword("");
      setShowGuide(true);
      setAuthMessage(
        "Account created. If email confirmation is enabled in Supabase, check your inbox before logging in."
      );
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: trimmedPassword,
    });

    if (error) {
      setAuthMessage(error.message);
      return;
    }

    localStorage.removeItem(GUEST_STORAGE_KEY);
    setDismissedMigrationPrompt(false);
    setShowGuide(true);
    setPassword("");
  };

  const handleLogout = async () => {
    localStorage.removeItem(GUEST_STORAGE_KEY);
    setShowGuide(false);
    setMode("login");
    setAuthMessage("");
    setPassword("");
    setMigrationMessage("");
    setDismissedMigrationPrompt(false);
    setModeratorMessage("");
    setShowModeratorPanel(false);

    if (isGuest || !supabase) {
      setIsGuest(false);
      setIsAuthenticated(false);
      setDisplayName("");
      setSession(null);
      setUserRole("user");
      setGuestEntriesPendingMigration(0);
      setPendingMigrationEntries([]);
      setExistingAccountNames([]);
      setModeratorQueue([]);
      setSelectedReviewId(null);
      setApprovedNoticeQueue([]);
      return;
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      setAuthMessage(error.message);
      return;
    }
  };

  const handleGuestBrowse = () => {
    localStorage.setItem(GUEST_STORAGE_KEY, "true");
    setIsGuest(true);
    setIsAuthenticated(true);
    setDisplayName("Guest");
    setShowGuide(true);
    setAuthMessage("");
    setPassword("");
    setMigrationMessage("");
  };

  const handleMigrateGuestData = async () => {
    if (!supabase || !session?.user) {
      setMigrationMessage("Log in again before migrating your guest entries.");
      return;
    }

    if (pendingMigrationEntries.length === 0) {
      setGuestEntriesPendingMigration(0);
      setMigrationMessage("No guest entries are waiting to be migrated.");
      return;
    }

    setIsMigratingGuestData(true);
    setMigrationMessage("");

    const rowsToInsert = pendingMigrationEntries
      .filter((entry) => entry.status === "ready")
      .map((entry) => ({
        user_id: session.user.id,
        name: entry.creature.name.trim(),
        location: entry.creature.location?.trim() || "Unknown",
        latitude: entry.creature.coords[0],
        longitude: entry.creature.coords[1],
        description: entry.creature.description?.trim() || "",
        category: entry.creature.category,
        visibility: "private",
        review_status: "draft",
      }));
    const skippedEntries = pendingMigrationEntries.filter(
      (entry) => entry.selected && entry.status !== "ready"
    );

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase.from("user_cryptids").insert(rowsToInsert);

      if (insertError) {
        setIsMigratingGuestData(false);
        setMigrationMessage(`Migration failed. ${insertError.message}`);
        return;
      }
    }

    localStorage.removeItem(USER_CREATURES_STORAGE_KEY);
    setGuestEntriesPendingMigration(0);
    setPendingMigrationEntries([]);
    setExistingAccountNames([]);
    setDismissedMigrationPrompt(true);
    setIsMigratingGuestData(false);
    setMapRefreshToken((prev) => prev + 1);

    if (rowsToInsert.length === 0) {
      setMigrationMessage("No selected entries were migrated. Review the skipped list for details.");
      return;
    }

    if (skippedEntries.length > 0) {
      setMigrationMessage(
        `${rowsToInsert.length} guest entr${rowsToInsert.length === 1 ? "y was" : "ies were"} moved to your account. ${skippedEntries.length} selected entr${skippedEntries.length === 1 ? "y was" : "ies were"} skipped.`
      );
      return;
    }

    setMigrationMessage(
      `${rowsToInsert.length} guest entr${rowsToInsert.length === 1 ? "y was" : "ies were"} moved to your account.`
    );
  };

  const handleModeratorAction = async (nextStatus: "approved" | "rejected") => {
    if (!supabase || !session?.user || !selectedReviewItem?.id) {
      setModeratorMessage("Sign in as a moderator again before reviewing.");
      return;
    }

    setIsSubmittingReviewAction(true);
    setModeratorMessage("");

    const { error } = await supabase
      .from("user_cryptids")
      .update({
        review_status: nextStatus,
        review_notes: reviewNotesDraft.trim() || null,
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", selectedReviewItem.id);

    if (error) {
      setIsSubmittingReviewAction(false);
      setModeratorMessage(`Review update failed. ${error.message}`);
      return;
    }

    setModeratorMessage(
      nextStatus === "approved"
        ? `"${selectedReviewItem.name}" approved and published to the public map.`
        : `"${selectedReviewItem.name}" was rejected and returned to the submitter.`
    );
    setReviewNotesDraft("");
    setMapRefreshToken((prev) => prev + 1);
    await refreshModeratorQueue(session, userRole);
    setIsSubmittingReviewAction(false);
  };

  if (isLoadingAuth) {
    return (
      <div className="app-shell">
        <div className="app-overlay" aria-hidden="true" />
        <section className="portal-card" aria-label="Loading portal">
          <p className="portal-eyebrow">Field Guide</p>
          <h1>Loading map access...</h1>
          <p className="portal-intro">Checking your session and preparing the Cryptids Field Guide.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <CryptidsMap isGuest={isGuest} refreshToken={mapRefreshToken} />

      {!isAuthenticated && <div className="app-overlay" aria-hidden="true" />}

      {currentApprovedNotice && (
        <>
          <div className="app-overlay review-success-overlay" aria-hidden="true" />
          <section className="review-success-card header-panel" role="dialog" aria-modal="true" aria-label="Review approved notice">
            <button
              type="button"
              className="side-panel-close review-success-close"
              onClick={() => dismissApprovedNotice(currentApprovedNotice.id)}
              aria-label="Close approval notice"
            >
              ✕
            </button>
            <img
              src={reviewSuccessImage}
              alt="Approved submission illustration"
              className="review-success-image"
            />
            <p className="portal-eyebrow">Field Guide Update</p>
            <h2>Your sighting is now public</h2>
            <p className="review-success-copy">
              <strong>{currentApprovedNotice.name}</strong> passed moderator review and is now visible
              to everyone exploring the map.
            </p>
            {currentApprovedNotice.reviewNotes && (
              <p className="review-success-notes">
                Moderator note: {currentApprovedNotice.reviewNotes}
              </p>
            )}
            <button
              type="button"
              className="guide-confirm"
              onClick={() => dismissApprovedNotice(currentApprovedNotice.id)}
            >
              Celebrate and continue
            </button>
          </section>
        </>
      )}

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
                {mode === "signup"
                  ? "Create an email-and-password account to keep using the map as a signed-in explorer."
                  : "Log in with your Supabase-backed account. You can still enter as a guest if you prefer."}
              </p>
            </div>

            <label className="portal-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
              />
            </label>

            <label className="portal-field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </label>

            {authMessage && <p className="portal-message">{authMessage}</p>}

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
            <span className="session-label">{isGuest ? "Guest" : userRole === "moderator" || userRole === "admin" ? "Moderator" : "Explorer"}</span>
            <strong>{displayName}</strong>
            <span className="session-storage">{isGuest ? "Saved locally" : "Saved to account"}</span>
          </div>
          {(userRole === "moderator" || userRole === "admin") && !isGuest && (
            <button
              type="button"
              className="session-moderate"
              onClick={() => {
                setShowModeratorPanel(true);
                void refreshModeratorQueue(session, userRole);
              }}
            >
              Moderate
            </button>
          )}
          <button type="button" className="session-logout" onClick={handleLogout}>
            Log out
          </button>
        </div>
      )}

      {isAuthenticated && !isGuest && guestEntriesPendingMigration > 0 && !dismissedMigrationPrompt && (
        <div className="migration-banner header-panel" role="status" aria-live="polite">
          <div className="migration-copy">
            <span className="migration-eyebrow">Guest Entries Detected</span>
            <strong>
              {guestEntriesPendingMigration} local entr{guestEntriesPendingMigration === 1 ? "y" : "ies"} can be moved to your account
            </strong>
            <p>
              These cryptids are still saved only in this browser. Migrate them now to keep them with your signed-in account.
            </p>
            {migrationMessage && <p className="migration-message">{migrationMessage}</p>}
          </div>
          <div className="migration-preview">
            {pendingMigrationEntries.map((entry) => (
              <label key={entry.localKey} className="migration-entry">
                <input
                  type="checkbox"
                  checked={entry.selected}
                  onChange={() => {
                    const nextSelectedKeys = new Set(
                      pendingMigrationEntries
                        .filter((item) => item.selected)
                        .map((item) => item.localKey)
                    );

                    if (entry.selected) {
                      nextSelectedKeys.delete(entry.localKey);
                    } else {
                      nextSelectedKeys.add(entry.localKey);
                    }

                    const nextPlan = buildMigrationPlan(
                      pendingMigrationEntries.map((item) => item.creature),
                      new Set(existingAccountNames),
                      nextSelectedKeys
                    );

                    setPendingMigrationEntries(nextPlan);
                  }}
                  disabled={isMigratingGuestData}
                />
                <div className="migration-entry-copy">
                  <div className="migration-entry-topline">
                    <strong>{entry.creature.name || "Untitled entry"}</strong>
                    <span className={`migration-status migration-status-${entry.status}`}>
                      {entry.status === "ready" && "Ready"}
                      {entry.status === "duplicate-account" && "Duplicate in account"}
                      {entry.status === "duplicate-selection" && "Duplicate in selection"}
                      {entry.status === "invalid-name" && "Invalid"}
                      {entry.status === "unselected" && "Not selected"}
                    </span>
                  </div>
                  <p>{entry.creature.location || "Unknown"}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="migration-summary">
            <span>{selectedMigrationCount} selected</span>
            <span>{readyMigrationCount} ready to migrate</span>
          </div>
          {skippedSelectedEntries.length > 0 && (
            <div className="migration-skipped">
              <span className="migration-skipped-title">Will be skipped</span>
              {skippedSelectedEntries.map((entry) => (
                <div key={`${entry.localKey}-skipped`} className="migration-skipped-item">
                  <strong>{entry.creature.name || "Untitled entry"}</strong>
                  <span>{entry.reason}</span>
                </div>
              ))}
            </div>
          )}
          <div className="migration-actions">
            <button
              type="button"
              className="migration-primary"
              onClick={handleMigrateGuestData}
              disabled={isMigratingGuestData || readyMigrationCount === 0}
            >
              {isMigratingGuestData ? "Migrating..." : `Migrate ${readyMigrationCount} to account`}
            </button>
            <button
              type="button"
              className="migration-secondary"
              onClick={() => setDismissedMigrationPrompt(true)}
              disabled={isMigratingGuestData}
            >
              Later
            </button>
          </div>
        </div>
      )}

      {isAuthenticated && !isGuest && guestEntriesPendingMigration === 0 && migrationMessage && (
        <div className="migration-banner migration-banner-compact header-panel" role="status" aria-live="polite">
          <div className="migration-copy">
            <span className="migration-eyebrow">Account Sync</span>
            <p className="migration-message">{migrationMessage}</p>
          </div>
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

      {(userRole === "moderator" || userRole === "admin") && (
        <>
          <div
            onClick={() => setShowModeratorPanel(false)}
            className={showModeratorPanel ? "panel-scrim is-open" : "panel-scrim"}
          />

          <aside className={showModeratorPanel ? "moderator-panel is-open" : "moderator-panel"}>
            <div className="side-panel-header">
              <div>
                <p className="side-panel-eyebrow">Moderator Review</p>
                <h2 className="side-panel-title">Pending Sightings</h2>
                <p className="list-panel-count">{moderatorQueue.length} awaiting review</p>
              </div>
              <button
                type="button"
                className="side-panel-close"
                aria-label="Close moderator panel"
                onClick={() => setShowModeratorPanel(false)}
              >
                ✕
              </button>
            </div>

            <div className="moderator-panel-body">
              <div className="moderator-queue">
                {isLoadingModeratorQueue ? (
                  <div className="list-empty-state">
                    <p className="list-empty-title">Loading review queue</p>
                    <p className="list-empty-copy">Gathering pending submissions from the field.</p>
                  </div>
                ) : moderatorQueue.length > 0 ? (
                  moderatorQueue.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={selectedReviewItem?.id === item.id ? "moderator-queue-item is-active" : "moderator-queue-item"}
                      onClick={() => setSelectedReviewId(item.id ?? null)}
                    >
                      <strong>{item.name}</strong>
                      <span>{item.location}</span>
                    </button>
                  ))
                ) : (
                  <div className="list-empty-state">
                    <p className="list-empty-title">No pending reviews right now</p>
                    <p className="list-empty-copy">Fresh public submissions will appear here when explorers send them in.</p>
                  </div>
                )}
              </div>

              <div className="moderator-review-card">
                {selectedReviewItem ? (
                  <>
                    <div className="moderator-review-header">
                      <div>
                        <p className="side-panel-eyebrow">Submission</p>
                        <h3 className="moderator-review-title">{selectedReviewItem.name}</h3>
                      </div>
                      <span className="detail-drawer-origin detail-drawer-origin-secondary">
                        Pending Review
                      </span>
                    </div>

                    <div className="moderator-review-grid">
                      <section className="detail-drawer-section">
                        <p className="detail-drawer-label">Location</p>
                        <p className="detail-drawer-value">{selectedReviewItem.location}</p>
                      </section>
                      <section className="detail-drawer-section">
                        <p className="detail-drawer-label">Coordinates</p>
                        <p className="detail-drawer-coords">
                          {selectedReviewItem.coords[0].toFixed(4)}, {selectedReviewItem.coords[1].toFixed(4)}
                        </p>
                      </section>
                      <section className="detail-drawer-section">
                        <p className="detail-drawer-label">Category</p>
                        <p className="detail-drawer-value">{selectedReviewItem.category}</p>
                      </section>
                      <section className="detail-drawer-section">
                        <p className="detail-drawer-label">Submitted By</p>
                        <p className="detail-drawer-coords">{selectedReviewItem.ownerId ?? "Unknown user"}</p>
                      </section>
                      <section className="detail-drawer-section moderator-review-description">
                        <p className="detail-drawer-label">Description</p>
                        <p className="detail-drawer-description">{selectedReviewItem.description || "No description provided."}</p>
                      </section>
                    </div>

                    <label className="modal-field moderator-review-notes">
                      <span className="modal-label">Moderator Notes</span>
                      <textarea
                        className="modal-input modal-textarea"
                        value={reviewNotesDraft}
                        onChange={(event) => setReviewNotesDraft(event.target.value)}
                        placeholder="Optional notes for the submitter..."
                      />
                    </label>

                    {moderatorMessage && <p className="portal-message moderator-message">{moderatorMessage}</p>}

                    <div className="moderator-actions">
                      <button
                        type="button"
                        className="detail-drawer-button detail-drawer-button-danger"
                        onClick={() => void handleModeratorAction("rejected")}
                        disabled={isSubmittingReviewAction}
                      >
                        {isSubmittingReviewAction ? "Saving..." : "Reject"}
                      </button>
                      <button
                        type="button"
                        className="modal-submit moderator-approve"
                        onClick={() => void handleModeratorAction("approved")}
                        disabled={isSubmittingReviewAction}
                      >
                        {isSubmittingReviewAction ? "Saving..." : "Approve"}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="list-empty-state">
                    <p className="list-empty-title">Review queue clear</p>
                    <p className="list-empty-copy">Select a pending submission when one arrives, then approve it or send it back with notes.</p>
                    {moderatorMessage && <p className="portal-message moderator-message">{moderatorMessage}</p>}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </>
      )}
    </div>
  );
}

export default App;
