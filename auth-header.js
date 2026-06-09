(() => {
  "use strict";

  const STATIC_AUTH_MODE = true;

  const STORAGE_KEYS = Object.freeze({
    USERS: "cv_users_v1",
    SESSION: "cv_session_user_v1",
    LEGACY_SESSION: "cww_session_user"
  });

  const ACTIVE_WORK_KEYS = Object.freeze([
    "playerSetup",
    "creasevisionBowlers",
    "creasevisionSelectedBowlerIndex",
    "creasevisionBowlerMode",
    "creasevisionPitchDeliveries",
    "wagonWheelInnings",
    "pitch_map_history_view_record_id",
    "cww_history_view_record_id",
    "cww_history_auto_export",
    "latestPitchMapInnings"
  ]);

  function safeJsonParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeName(value) {
    return String(value || "").trim();
  }

  function makeUserId(email) {
    return normalizeEmail(email);
  }

  function getUsers() {
    const users = safeJsonParse(localStorage.getItem(STORAGE_KEYS.USERS), {});
    return users && typeof users === "object" && !Array.isArray(users) ? users : {};
  }

  function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users || {}));
  }

  function cleanUser(user) {
    const email = normalizeEmail(user && user.email);
    const name = normalizeName(user && user.name);
    const id = makeUserId(email || user?.id || name);

    return {
      id,
      name,
      email,
      profileImageUrl: String(user?.profileImageUrl || ""),
      savedAt: user?.savedAt || new Date().toISOString()
    };
  }

  function getCurrentUserKey() {
    const user = getSessionUserSync();
    return user && user.email ? user.email : "";
  }

  function scopedKey(baseKey, userKey = getCurrentUserKey()) {
    const cleanKey = normalizeEmail(userKey);

    if (!cleanKey) {
      return "";
    }

    return "cv_user::" + cleanKey + "::" + baseKey;
  }

  function scopedGet(baseKey, fallback = null) {
    const key = scopedKey(baseKey);

    if (!key) {
      return fallback;
    }

    return safeJsonParse(localStorage.getItem(key), fallback);
  }

  function scopedSet(baseKey, value) {
    const key = scopedKey(baseKey);

    if (!key) {
      return;
    }

    localStorage.setItem(key, JSON.stringify(value));
  }

  function scopedRemove(baseKey) {
    const key = scopedKey(baseKey);

    if (!key) {
      return;
    }

    localStorage.removeItem(key);
  }

  function clearActiveWork() {
    ACTIVE_WORK_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }

  function setSessionUser(user) {
    const normalized = cleanUser(user);

    sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(normalized));
    localStorage.setItem(STORAGE_KEYS.LEGACY_SESSION, JSON.stringify(normalized));

    localStorage.setItem("currentUser", JSON.stringify(normalized));
    localStorage.setItem("creasevisionUserProfile", JSON.stringify(normalized));
    localStorage.setItem("profileName", normalized.name);
    localStorage.setItem("profileEmail", normalized.email);
    localStorage.setItem("profileImageUrl", normalized.profileImageUrl);

    window.dispatchEvent(new CustomEvent("cv-session-user-changed", {
      detail: normalized
    }));

    return normalized;
  }

  function getSessionUserSync() {
    const sessionUser = safeJsonParse(sessionStorage.getItem(STORAGE_KEYS.SESSION), null);

    if (sessionUser && sessionUser.email) {
      return cleanUser(sessionUser);
    }

    const legacyUser = safeJsonParse(localStorage.getItem(STORAGE_KEYS.LEGACY_SESSION), null);

    if (legacyUser && legacyUser.email) {
      const normalized = cleanUser(legacyUser);
      sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(normalized));
      return normalized;
    }

    return null;
  }

  async function getSessionUser() {
    return getSessionUserSync();
  }

  function registerUser({ name, email, password }) {
    const cleanEmail = normalizeEmail(email);
    const cleanName = normalizeName(name);

    if (!cleanEmail) {
      return { ok: false, message: "Email is required." };
    }

    if (!cleanName) {
      return { ok: false, message: "Name is required." };
    }

    if (!String(password || "").trim()) {
      return { ok: false, message: "Password is required." };
    }

    const users = getUsers();

    if (users[cleanEmail]) {
      return { ok: false, message: "An account with this email already exists." };
    }

    const user = cleanUser({
      id: cleanEmail,
      name: cleanName,
      email: cleanEmail,
      profileImageUrl: "",
      savedAt: new Date().toISOString()
    });

    users[cleanEmail] = {
      ...user,
      password: String(password)
    };

    saveUsers(users);
    clearActiveWork();
    setSessionUser(user);

    return { ok: true, user };
  }

  function loginUser({ email, password }) {
    const cleanEmail = normalizeEmail(email);

    if (!cleanEmail) {
      return { ok: false, message: "Email is required." };
    }

    const users = getUsers();
    const found = users[cleanEmail];

    if (!found) {
      return { ok: false, message: "No account found with this email." };
    }

    if (String(found.password || "") !== String(password || "")) {
      return { ok: false, message: "Incorrect password." };
    }

    const user = cleanUser(found);

    clearActiveWork();
    setSessionUser(user);

    return { ok: true, user };
  }

  function updateCurrentUserProfile(payload) {
    const currentUser = getSessionUserSync();

    if (!currentUser || !currentUser.email) {
      return { ok: false, message: "Session not found." };
    }

    const users = getUsers();
    const existing = users[currentUser.email] || currentUser;

    const updated = cleanUser({
      ...existing,
      name: normalizeName(payload?.name),
      email: currentUser.email,
      profileImageUrl: String(payload?.profileImageUrl || ""),
      savedAt: new Date().toISOString()
    });

    users[currentUser.email] = {
      ...existing,
      ...updated,
      password: existing.password || ""
    };

    saveUsers(users);
    setSessionUser(updated);

    return {
      ok: true,
      user: updated,
      message: "Profile updated successfully."
    };
  }

  function logout() {
    clearActiveWork();

    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
    sessionStorage.removeItem("cv_profile_setup_done");

    localStorage.removeItem(STORAGE_KEYS.LEGACY_SESSION);
    localStorage.removeItem("currentUser");
    localStorage.removeItem("creasevisionUserProfile");
    localStorage.removeItem("profileName");
    localStorage.removeItem("profileEmail");
    localStorage.removeItem("profileImageUrl");

    window.location.href = "index.html";
  }

  async function requestJson(url, options = {}) {
    const method = String(options.method || "GET").toUpperCase();

    if (url === "/auth/profile" && method === "GET") {
      const user = getSessionUserSync();

      return {
        ok: Boolean(user),
        data: user ? { user } : { message: "Session not found." }
      };
    }

    if (url === "/auth/profile" && method === "PUT") {
      const body = safeJsonParse(options.body, {});
      const result = updateCurrentUserProfile(body);

      return {
        ok: result.ok,
        data: result.ok
          ? { user: result.user, message: result.message }
          : { message: result.message }
      };
    }

    return {
      ok: false,
      data: { message: "Unsupported static request." }
    };
  }

  function bindLogoutButtons() {
    document.querySelectorAll("[data-logout='true'], .logout-btn").forEach((element) => {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        logout();
      });
    });
  }

  function exposeAuth() {
    window.CWWAuth = {
      STATIC_AUTH_MODE,
      getSessionUser,
      getSessionUserSync,
      setSessionUser,
      registerUser,
      loginUser,
      updateCurrentUserProfile,
      requestJson,
      logout,
      clearActiveWork,
      scopedKey,
      scopedGet,
      scopedSet,
      scopedRemove,
      getCurrentUserKey
    };
  }

  function init() {
    exposeAuth();
    bindLogoutButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
