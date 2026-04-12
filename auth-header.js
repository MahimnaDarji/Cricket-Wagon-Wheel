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
