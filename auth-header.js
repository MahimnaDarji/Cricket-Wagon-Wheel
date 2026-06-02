
(function setupFreshAnalysisOnLogin() {
  const ACTIVE_ANALYSIS_KEYS = [
    "creasevisionPitchDeliveries",
    "wagonWheelInnings",
    "pitch_map_history_view_record_id",
    "cww_history_view_record_id",
    "cww_history_auto_export"
  ];

  function safeParse(value) {
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  function getCurrentLoggedInUserKey() {
    const sessionUser = safeParse(localStorage.getItem("cww_session_user"));
    const currentUser = safeParse(localStorage.getItem("currentUser"));
    const profileUser = safeParse(localStorage.getItem("creasevisionUserProfile"));

    const user = sessionUser || currentUser || profileUser || {};

    const id = String(user.id || "").trim();
    const email = String(user.email || "").trim();
    const name = String(user.name || "").trim();

    return id || email || name || "";
  }

  function clearActiveAnalysisSessions() {
    ACTIVE_ANALYSIS_KEYS.forEach((key) => {
      localStorage.removeItem(key);
    });
  }

  function freshStartIfNewLogin() {
    const currentUserKey = getCurrentLoggedInUserKey();

    if (!currentUserKey) {
      return;
    }

    const lastUserKey = localStorage.getItem("creasevisionLastFreshStartUserKey") || "";
    const loginMarker = sessionStorage.getItem("creasevisionFreshStartDoneForThisTab") || "";

    if (lastUserKey !== currentUserKey || loginMarker !== currentUserKey) {
      clearActiveAnalysisSessions();
      localStorage.setItem("creasevisionLastFreshStartUserKey", currentUserKey);
      sessionStorage.setItem("creasevisionFreshStartDoneForThisTab", currentUserKey);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", freshStartIfNewLogin);
  } else {
    freshStartIfNewLogin();
  }

  window.addEventListener("pageshow", freshStartIfNewLogin);
})();

const STATIC_AUTH_MODE =
  window.location.hostname.endsWith("github.io") ||
  window.location.protocol === "file:";

const LOCAL_SESSION_KEY = "cww_session_user";
const BASE_URL = window.location.hostname === "localhost" ? "http://localhost:5000" : "";

function toAuthUrl(path) {
  return `${BASE_URL}${path}`;
}

function getLocalSessionUser() {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return {
      name: String(parsed.name || "User"),
      email: String(parsed.email || ""),
      profileImageUrl: String(parsed.profileImageUrl || ""),
      isGuest: Boolean(parsed.isGuest),
    };
  } catch {
    return null;
  }
}

function clearLocalSessionUser() {
  localStorage.removeItem(LOCAL_SESSION_KEY);
}

async function requestJson(path, options = {}) {
  const response = await fetch(toAuthUrl(path), {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

async function getSessionUser() {
  if (STATIC_AUTH_MODE) {
    return getLocalSessionUser();
  }

  const response = await requestJson("/auth/me", { method: "GET" });
  if (!response.ok) {
    return null;
  }

  return response.data?.user || null;
}

async function logout() {
  if (STATIC_AUTH_MODE) {
    clearLocalSessionUser();
    return;
  }

  try {
    await requestJson("/auth/logout", { method: "POST" });
  } catch {
    // Allow fallback redirect even if API call fails.
  }
}

function attachLogoutHandlers() {
  document.querySelectorAll('[data-logout="true"]').forEach((element) => {
    element.addEventListener("click", async (event) => {
      event.preventDefault();
      await logout();
      window.location.href = "index.html";
    });
  });
}

async function guardAuthenticatedPages() {
  const pageName = String(window.location.pathname.split("/").pop() || "");
  const isAuthPage = pageName === "index.html" || pageName === "";

  if (isAuthPage) {
    return;
  }

  const user = await getSessionUser();
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  document.querySelectorAll("[data-user-name]").forEach((node) => {
    node.textContent = user.name || "User";
  });
}

window.CWWAuth = {
  STATIC_AUTH_MODE,
  toAuthUrl,
  requestJson,
  getSessionUser,
  logout,
};

document.addEventListener("DOMContentLoaded", async () => {
  await guardAuthenticatedPages();
  attachLogoutHandlers();
});


function getLatestCreaseVisionProfile() {
  const sources = [
    localStorage.getItem("cww_session_user"),
    localStorage.getItem("creasevisionUserProfile"),
    localStorage.getItem("currentUser")
  ];

  for (const source of sources) {
    try {
      const parsed = source ? JSON.parse(source) : null;
      if (parsed && typeof parsed === "object") {
        return {
          name: String(parsed.name || ""),
          email: String(parsed.email || ""),
          profileImageUrl: String(parsed.profileImageUrl || "")
        };
      }
    } catch {}
  }

  return {
    name: localStorage.getItem("profileName") || "",
    email: localStorage.getItem("profileEmail") || "",
    profileImageUrl: localStorage.getItem("profileImageUrl") || ""
  };
}

function applyCreaseVisionProfileEverywhere(profile = getLatestCreaseVisionProfile()) {
  const name = String(profile.name || "").trim();
  const email = String(profile.email || "").trim();
  const image = String(profile.profileImageUrl || "").trim();

  const nameSelectors = [
    "#user-name",
    "#dashboard-user-name",
    "#dashboard-name",
    "#header-user-name",
    "#profile-summary-name",
    "[data-user-name]",
    "[data-profile-name]"
  ];

  const emailSelectors = [
    "#user-email",
    "#dashboard-user-email",
    "#header-user-email",
    "[data-user-email]",
    "[data-profile-email]"
  ];

  const imageSelectors = [
    "#user-avatar",
    "#dashboard-user-avatar",
    "#header-user-avatar",
    "#profile-avatar",
    "[data-user-avatar]",
    "[data-profile-avatar]"
  ];

  if (name) {
    nameSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        element.textContent = name;
      });
    });
  }

  if (email) {
    emailSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        element.textContent = email;
      });
    });
  }

  if (image) {
    imageSelectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        if (element.tagName === "IMG") {
          element.src = image;
        } else {
          element.style.backgroundImage = "url(" + image + ")";
        }
      });
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyCreaseVisionProfileEverywhere();
});

window.addEventListener("storage", () => {
  applyCreaseVisionProfileEverywhere();
});

window.addEventListener("creasevision-profile-updated", (event) => {
  applyCreaseVisionProfileEverywhere(event.detail);
});
