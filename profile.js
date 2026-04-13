const profileForm = document.getElementById("profile-form");
const profileNameInput = document.getElementById("profile-name");
const profileEmailInput = document.getElementById("profile-email");
const profileImageFileInput = document.getElementById("profile-image-file");
const profileAvatarPreview = document.getElementById("profile-avatar-preview");
const profileFeedback = document.getElementById("profile-feedback");
const summaryName = document.getElementById("summary-name");
const summaryEmail = document.getElementById("summary-email");
const editProfileButton = document.getElementById("edit-profile-btn");
const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
const historyList = document.getElementById("history-list");

const DEFAULT_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none">
    <defs>
      <linearGradient id="avatarGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#c9d2c3"/>
        <stop offset="100%" stop-color="#9ca997"/>
      </linearGradient>
    </defs>
    <rect width="96" height="96" rx="48" fill="url(#avatarGrad)"/>
    <circle cx="48" cy="36" r="16" fill="#eef2e8"/>
    <path d="M20 82c2-14 15-24 28-24s26 10 28 24" fill="#eef2e8"/>
  </svg>`
)}`;

const HISTORY_VIEW_RECORD_KEY = "cww_history_view_record_id";
const HISTORY_AUTO_EXPORT_KEY = "cww_history_auto_export";
const HISTORY_EXPORT_EVENT = "cww-history-export-ready";

const PREVIEW_RUN_FALLBACK_COLORS = Object.freeze({
  1: "#1d4ed8",
  2: "#facc15",
  3: "#ffffff",
  4: "#f97316",
  5: "#7c3aed",
  6: "#ef4444",
});

const PREVIEW_SHOT_START = Object.freeze({ xRatio: 0.5, yRatio: 0.363 });

let currentUser = null;
let currentProfileImageUrl = "";
const historyPreviewCache = new Map();

function setFeedback(type, messages) {
  profileFeedback.className = `feedback ${type}`;
  profileFeedback.innerHTML = messages.map((message) => `<div>${message}</div>`).join("");
}

function clearFeedback() {
  profileFeedback.className = "feedback";
  profileFeedback.innerHTML = "";
}

function isValidEmail(email) {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
}

async function readImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read selected image."));
    reader.readAsDataURL(file);
  });
}

function normalizeUser(user) {
  return {
    id: String(user?.id || ""),
    name: String(user?.name || ""),
    email: String(user?.email || ""),
    profileImageUrl: String(user?.profileImageUrl || ""),
  };
}

function formatDate(value) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function clamp01(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(1, numeric));
}

function toPreviewRatio(point) {
  if (!point || typeof point !== "object") {
    return null;
  }

  const hasRatios = Number.isFinite(Number(point.xRatio)) && Number.isFinite(Number(point.yRatio));
  if (hasRatios) {
    return {
      xRatio: clamp01(point.xRatio),
      yRatio: clamp01(point.yRatio),
    };
  }

  const x = Number(point.x);
  const y = Number(point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  if (x >= 0 && x <= 1.2 && y >= 0 && y <= 1.2) {
    return {
      xRatio: clamp01(x),
      yRatio: clamp01(y),
    };
  }

  return null;
}

function extractPreviewShots(entry) {
  if (!entry || typeof entry !== "object") {
    return [];
  }

  const shotsByPlayer = entry.shotsByPlayer;
  if (!shotsByPlayer || typeof shotsByPlayer !== "object") {
    return [];
  }

  return Object.values(shotsByPlayer)
    .flatMap((playerShots) => (Array.isArray(playerShots) ? playerShots : []))
    .map((shot) => {
      const runValue = Number(shot?.runValue);
      if (!Number.isInteger(runValue)) {
        return null;
      }

      const start = toPreviewRatio(shot?.start);
      const end = toPreviewRatio(shot?.end);
      if (!start || !end) {
        return null;
      }

      const runColor = entry?.runColors && typeof entry.runColors === "object"
        ? entry.runColors[runValue]
        : "";

      const color = String(shot?.color || runColor || PREVIEW_RUN_FALLBACK_COLORS[runValue] || "#f4f2ea");

      return {
        runValue,
        color,
        start,
        end,
      };
    })
    .filter(Boolean);
}

function renderHistoryPreviewDataUrl(entryId, entry, size = 84) {
  const safeSize = Math.max(32, Math.round(Number(size) || 84));
  const cacheKey = `${entryId}:${safeSize}`;
  if (historyPreviewCache.has(cacheKey)) {
    return historyPreviewCache.get(cacheKey);
  }

  const canvas = document.createElement("canvas");
  canvas.width = safeSize;
  canvas.height = safeSize;
  const context = canvas.getContext("2d");

  if (!context) {
    return "";
  }

  const center = safeSize / 2;
  const radius = safeSize * 0.47;
  const shots = extractPreviewShots(entry);

  context.clearRect(0, 0, safeSize, safeSize);

  context.save();
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.clip();

  const fieldGradient = context.createRadialGradient(center, center, radius * 0.2, center, center, radius);
  fieldGradient.addColorStop(0, "#6f9d73");
  fieldGradient.addColorStop(0.62, "#4a7750");
  fieldGradient.addColorStop(1, "#355d3b");
  context.fillStyle = fieldGradient;
  context.fillRect(0, 0, safeSize, safeSize);

  context.strokeStyle = "rgba(244, 242, 234, 0.32)";
  context.lineWidth = 1.2;
  context.beginPath();
  context.arc(center, center, radius * 0.73, 0, Math.PI * 2);
  context.stroke();

  context.beginPath();
  context.arc(center, center, radius * 0.45, 0, Math.PI * 2);
  context.stroke();

  const pitchWidth = radius * 0.34;
  const pitchHeight = radius * 1.28;
  const pitchX = center - (pitchWidth / 2);
  const pitchY = center - (pitchHeight * 0.58);
  const pitchGradient = context.createLinearGradient(pitchX, pitchY, pitchX, pitchY + pitchHeight);
  pitchGradient.addColorStop(0, "#b79463");
  pitchGradient.addColorStop(1, "#8a6b46");
  context.fillStyle = pitchGradient;
  context.fillRect(pitchX, pitchY, pitchWidth, pitchHeight);

  context.strokeStyle = "rgba(244, 242, 234, 0.68)";
  context.lineWidth = 0.9;
  const creaseYTop = pitchY + 4;
  const creaseYBottom = pitchY + pitchHeight - 4;
  context.beginPath();
  context.moveTo(pitchX + 2, creaseYTop);
  context.lineTo(pitchX + pitchWidth - 2, creaseYTop);
  context.moveTo(pitchX + 2, creaseYBottom);
  context.lineTo(pitchX + pitchWidth - 2, creaseYBottom);
  context.stroke();

  shots.forEach((shot) => {
    const startX = shot.start.xRatio * safeSize;
    const startY = shot.start.yRatio * safeSize;
    const endX = shot.end.xRatio * safeSize;
    const endY = shot.end.yRatio * safeSize;

    context.strokeStyle = shot.color;
    context.lineWidth = shot.runValue === 4 || shot.runValue === 6 ? 2.15 : 1.55;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();

    context.fillStyle = shot.color;
    context.beginPath();
    context.arc(endX, endY, 1.5, 0, Math.PI * 2);
    context.fill();
  });

  context.fillStyle = "rgba(244, 242, 234, 0.86)";
  context.beginPath();
  context.arc(PREVIEW_SHOT_START.xRatio * safeSize, PREVIEW_SHOT_START.yRatio * safeSize, 1.8, 0, Math.PI * 2);
  context.fill();

  context.restore();

  context.strokeStyle = "#7f9683";
  context.lineWidth = 1;
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.stroke();

  const imageUrl = canvas.toDataURL("image/png");
  historyPreviewCache.set(cacheKey, imageUrl);
  return imageUrl;
}

function applyHistoryPreview(previewElement, entry) {
  const previewUrl = renderHistoryPreviewDataUrl(entry.id, entry.raw);
  previewElement.classList.add("is-rendered");
  previewElement.style.backgroundImage = previewUrl ? `url(${previewUrl})` : "none";
}

function getHistoryEntries() {
  const storedHistory = (() => {
    try {
      const raw = localStorage.getItem("wagonWheelHistory");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  return storedHistory
    .map((entry) => {
      const ballsByPlayer = entry?.ballsByPlayer && typeof entry.ballsByPlayer === "object" ? entry.ballsByPlayer : {};
      const playerNames = entry?.playerRosterNameById && typeof entry.playerRosterNameById === "object"
        ? entry.playerRosterNameById
        : {};

      const computedFromBalls = (() => {
        let runs = 0;
        let balls = 0;

        Object.values(ballsByPlayer).forEach((playerBalls) => {
          if (!Array.isArray(playerBalls)) {
            return;
          }

          balls += playerBalls.length;
          runs += playerBalls.reduce((sum, ball) => sum + (Number(ball?.run) || 0), 0);
        });

        return { runs, balls };
      })();

      const computedFromRunsSequence = (() => {
        if (!Array.isArray(entry?.runsSequence)) {
          return { runs: 0, balls: 0 };
        }

        const runs = entry.runsSequence.reduce((sum, value) => sum + (Number(value) || 0), 0);
        return {
          runs,
          balls: entry.runsSequence.length,
        };
      })();

      const computedFromShots = (() => {
        if (!entry?.shotsByPlayer || typeof entry.shotsByPlayer !== "object") {
          return { runs: 0, balls: 0 };
        }

        let runs = 0;
        let balls = 0;
        Object.values(entry.shotsByPlayer).forEach((shots) => {
          if (!Array.isArray(shots)) {
            return;
          }

          balls += shots.length;
          runs += shots.reduce((sum, shot) => sum + (Number(shot?.runValue) || 0), 0);
        });

        return { runs, balls };
      })();

      const runs = Number.isFinite(Number(entry?.totalRuns))
        ? Number(entry.totalRuns)
        : (computedFromRunsSequence.balls > 0
          ? computedFromRunsSequence.runs
          : (computedFromShots.balls > computedFromBalls.balls ? computedFromShots.runs : computedFromBalls.runs));
      const balls = Number.isFinite(Number(entry?.totalBalls))
        ? Number(entry.totalBalls)
        : (computedFromRunsSequence.balls > 0
          ? computedFromRunsSequence.balls
          : Math.max(computedFromBalls.balls, computedFromShots.balls));

      const displayPlayerName = (() => {
        if (entry?.playerName) {
          return String(entry.playerName);
        }

        const rosterNames = Object.values(playerNames).filter((value) => String(value || "").trim().length > 0);
        if (rosterNames.length === 1) {
          return String(rosterNames[0]);
        }

        if (rosterNames.length > 1) {
          return "Team Innings";
        }

        return "Player";
      })();

      return {
        id: String(entry?.id || entry?.savedAt || `${displayPlayerName}-${runs}-${balls}`),
        playerName: displayPlayerName,
        runs: Math.max(0, runs),
        balls: Math.max(0, balls),
        savedAt: entry?.savedAt || "",
        raw: entry,
      };
    })
    .sort((a, b) => {
      const aTime = Date.parse(String(a.savedAt || ""));
      const bTime = Date.parse(String(b.savedAt || ""));
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });
}

function deleteHistoryEntry(entryId) {
  const confirmed = window.confirm("Delete this innings history entry?");
  if (!confirmed) {
    return;
  }

  const nextHistory = (() => {
    try {
      const raw = localStorage.getItem("wagonWheelHistory");
      const parsed = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) ? parsed : [];
      return list.filter((entry) => String(entry?.id || "") !== String(entryId || ""));
    } catch {
      return [];
    }
  })();

  localStorage.setItem("wagonWheelHistory", JSON.stringify(nextHistory));
  renderHistory();
}

function downloadHistoryEntry(entry) {
  localStorage.setItem(HISTORY_VIEW_RECORD_KEY, entry.id);
  localStorage.setItem(HISTORY_AUTO_EXPORT_KEY, "1");

  const requestId = `history-export-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.setAttribute("aria-hidden", "true");

  let isHandled = false;

  const cleanup = () => {
    window.removeEventListener("message", onMessage);
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
    localStorage.removeItem(HISTORY_AUTO_EXPORT_KEY);
  };

  const onMessage = (event) => {
    if (event.origin !== window.location.origin) {
      return;
    }

    const payload = event.data;
    if (!payload || payload.type !== HISTORY_EXPORT_EVENT || payload.requestId !== requestId) {
      return;
    }

    isHandled = true;

    if (typeof payload.dataUrl === "string" && payload.dataUrl.startsWith("data:image/jpeg")) {
      const link = document.createElement("a");
      link.href = payload.dataUrl;
      link.download = String(payload.fileName || "wagon_wheel.jpg");
      link.click();
    }

    cleanup();
  };

  window.addEventListener("message", onMessage);

  window.setTimeout(() => {
    if (!isHandled) {
      cleanup();
    }
  }, 15000);

  iframe.src = `review.html?source=history&autodownload=1&exportmode=embedded&requestId=${encodeURIComponent(requestId)}`;
  document.body.appendChild(iframe);
}

function renderHistory() {
  const entries = getHistoryEntries();
  historyList.innerHTML = "";

  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "No innings history yet. Complete an innings in Review to see cards here.";
    historyList.appendChild(empty);
    return;
  }

  entries.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "history-card-item";

    const top = document.createElement("div");
    top.className = "history-top";

    const left = document.createElement("div");
    const player = document.createElement("p");
    player.className = "history-player";
    player.textContent = entry.playerName;

    const date = document.createElement("p");
    date.className = "history-date";
    date.textContent = formatDate(entry.savedAt);

    left.appendChild(player);
    left.appendChild(date);

    const preview = document.createElement("div");
    preview.className = "history-preview";
    preview.setAttribute("aria-hidden", "true");
    applyHistoryPreview(preview, entry);

    top.appendChild(left);
    top.appendChild(preview);

    const stats = document.createElement("p");
    stats.className = "history-stats";
    stats.textContent = `${entry.runs} Runs | ${entry.balls} Balls`;

    const actions = document.createElement("div");
    actions.className = "history-actions";

    const viewButton = document.createElement("button");
    viewButton.type = "button";
    viewButton.className = "action-btn secondary";
    viewButton.textContent = "View";
    viewButton.addEventListener("click", () => {
      localStorage.setItem(HISTORY_VIEW_RECORD_KEY, entry.id);
      window.location.href = "review.html?source=history";
    });

    const downloadButton = document.createElement("button");
    downloadButton.type = "button";
    downloadButton.className = "action-btn secondary";
    downloadButton.textContent = "Download";
    downloadButton.addEventListener("click", () => {
      downloadHistoryEntry(entry);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "action-btn secondary";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => {
      deleteHistoryEntry(entry.id);
    });

    actions.appendChild(viewButton);
    actions.appendChild(downloadButton);
    actions.appendChild(deleteButton);

    card.appendChild(top);
    card.appendChild(stats);
    card.appendChild(actions);
    historyList.appendChild(card);
  });
}

function setupTabs() {
  tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;
      tabButtons.forEach((tab) => {
        const isActive = tab === button;
        tab.classList.toggle("active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
      });

      document.querySelectorAll(".tab-panel").forEach((panel) => {
        panel.classList.toggle("active", panel.id === targetId);
      });

      if (targetId === "panel-history") {
        renderHistory();
      }
    });
  });
}

function renderSummary() {
  const name = String(currentUser?.name || "User");
  const email = String(currentUser?.email || "user@example.com");
  const image = String(currentProfileImageUrl || currentUser?.profileImageUrl || "").trim();

  summaryName.textContent = name;
  summaryEmail.textContent = email;
  profileAvatarPreview.src = image || DEFAULT_AVATAR;
}

function fillForm() {
  profileNameInput.value = String(currentUser?.name || "");
  profileEmailInput.value = String(currentUser?.email || "");
}

async function loadUserProfile() {
  clearFeedback();

  if (window.CWWAuth?.STATIC_AUTH_MODE) {
    const sessionUser = await window.CWWAuth.getSessionUser();
    if (!sessionUser) {
      window.location.href = "index.html";
      return;
    }

    currentUser = normalizeUser(sessionUser);
    currentProfileImageUrl = String(sessionUser.profileImageUrl || "");
    fillForm();
    renderSummary();
    return;
  }

  const response = await window.CWWAuth.requestJson("/auth/profile", { method: "GET" });
  if (!response.ok || !response.data?.user) {
    setFeedback("error", [response.data?.message || "Unable to load your profile."]);
    return;
  }

  currentUser = normalizeUser(response.data.user);
  currentProfileImageUrl = currentUser.profileImageUrl;
  fillForm();
  renderSummary();
}

function bindEditButton() {
  editProfileButton.addEventListener("click", () => {
    const profileTab = document.getElementById("tab-profile");
    profileTab?.click();
    profileNameInput.focus();
    profileForm.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function bindImageUpload() {
  profileImageFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      currentProfileImageUrl = await readImageFile(file);
      renderSummary();
    } catch {
      setFeedback("error", ["Unable to load the selected image file."]);
    }
  });
}

function bindProfileSave() {
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFeedback();

    const payload = {
      name: String(profileNameInput.value || "").trim(),
      email: String(profileEmailInput.value || "").trim().toLowerCase(),
      profileImageUrl: String(currentProfileImageUrl || "").trim(),
    };

    if (!payload.name) {
      setFeedback("error", ["Name is required."]);
      return;
    }

    if (!payload.email || !isValidEmail(payload.email)) {
      setFeedback("error", ["Please enter a valid email address."]);
      return;
    }

    if (window.CWWAuth?.STATIC_AUTH_MODE) {
      const sessionUser = await window.CWWAuth.getSessionUser();
      if (!sessionUser) {
        setFeedback("error", ["Session not found."]);
        return;
      }

      const updatedSession = {
        ...sessionUser,
        name: payload.name,
        email: payload.email,
        profileImageUrl: payload.profileImageUrl,
        savedAt: new Date().toISOString(),
      };

      localStorage.setItem("cww_session_user", JSON.stringify(updatedSession));
      currentUser = normalizeUser(updatedSession);
      currentProfileImageUrl = payload.profileImageUrl;
      renderSummary();
      setFeedback("success", ["Profile saved in static mode."]);
      return;
    }

    const response = await window.CWWAuth.requestJson("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errors = Array.isArray(response.data?.errors) ? response.data.errors : [];
      const message = response.data?.message || "Unable to save profile right now.";
      setFeedback("error", errors.length > 0 ? errors : [message]);
      return;
    }

    currentUser = normalizeUser(response.data.user);
    currentProfileImageUrl = currentUser.profileImageUrl;
    fillForm();
    renderSummary();
    setFeedback("success", [response.data?.message || "Profile updated successfully."]);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  setupTabs();
  bindEditButton();
  bindImageUpload();
  bindProfileSave();
  await loadUserProfile();
  renderHistory();
});
