(() => {
  "use strict";

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

  const HISTORY_VIEW_RECORD_KEY = "cww_history_view_record_id";
  const PITCH_HISTORY_VIEW_RECORD_KEY = "pitch_map_history_view_record_id";

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

  const PROFILE_PITCH_OUTCOME_COLORS = {
    Dot: "#FF0054",
    Run: "#005F73",
    Boundary: "#E8A838",
    Wicket: "#2D00F7"
  };

  const PREVIEW_RUN_FALLBACK_COLORS = Object.freeze({
    1: "#1d4ed8",
    2: "#facc15",
    3: "#ffffff",
    4: "#f97316",
    5: "#7c3aed",
    6: "#ef4444"
  });

  const PREVIEW_SHOT_START = Object.freeze({ xRatio: 0.5, yRatio: 0.363 });

  let currentUser = null;
  let currentProfileImageUrl = "";
  const historyPreviewCache = new Map();

  function getAuth() {
    return window.CWWAuth || null;
  }

  function safeParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function getCurrentUserKey() {
    const auth = getAuth();

    if (auth && typeof auth.getCurrentUserKey === "function") {
      return String(auth.getCurrentUserKey() || "").trim().toLowerCase();
    }

    return String(currentUser?.email || "").trim().toLowerCase();
  }

  function getScopedKey(baseKey) {
    const userKey = getCurrentUserKey();

    if (!userKey) {
      return "";
    }

    return "cv_user::" + userKey + "::" + baseKey;
  }

  function getScopedArray(baseKey) {
    const auth = getAuth();

    if (auth && typeof auth.scopedGet === "function") {
      const scoped = auth.scopedGet(baseKey, []);

      if (Array.isArray(scoped)) {
        return scoped;
      }
    }

    const scopedKey = getScopedKey(baseKey);
    const scopedValue = scopedKey ? safeParse(localStorage.getItem(scopedKey), []) : [];

    return Array.isArray(scopedValue) ? scopedValue : [];
  }

  function setScopedArray(baseKey, value) {
    const safeValue = Array.isArray(value) ? value : [];
    const auth = getAuth();

    if (auth && typeof auth.scopedSet === "function") {
      auth.scopedSet(baseKey, safeValue);
      return;
    }

    const scopedKey = getScopedKey(baseKey);

    if (scopedKey) {
      localStorage.setItem(scopedKey, JSON.stringify(safeValue));
    }
  }

  function normalizeUser(user) {
    return {
      id: String(user?.id || ""),
      name: String(user?.name || ""),
      email: String(user?.email || ""),
      profileImageUrl: String(user?.profileImageUrl || "")
    };
  }

  function setFeedback(type, messages) {
    if (!profileFeedback) return;

    profileFeedback.className = "feedback " + type;
    profileFeedback.innerHTML = messages.map((message) => "<div>" + message + "</div>").join("");
  }

  function clearFeedback() {
    if (!profileFeedback) return;

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

  function renderSummary() {
    const name = String(currentUser?.name || "User");
    const email = String(currentUser?.email || "user@example.com");
    const image = String(currentProfileImageUrl || currentUser?.profileImageUrl || "").trim();

    if (summaryName) {
      summaryName.textContent = name;
    }

    if (summaryEmail) {
      summaryEmail.textContent = email;
    }

    if (profileAvatarPreview) {
      profileAvatarPreview.src = image || DEFAULT_AVATAR;
    }
  }

  function fillForm() {
    if (profileNameInput) {
      profileNameInput.value = String(currentUser?.name || "");
    }

    if (profileEmailInput) {
      profileEmailInput.value = String(currentUser?.email || "");
      profileEmailInput.readOnly = true;
      profileEmailInput.title = "Email is fixed for the logged-in account.";
    }
  }

  async function loadUserProfile() {
    clearFeedback();

    const auth = getAuth();

    if (!auth || typeof auth.getSessionUser !== "function") {
      window.location.href = "index.html";
      return;
    }

    const sessionUser = await auth.getSessionUser();

    if (!sessionUser || !sessionUser.email) {
      window.location.href = "index.html";
      return;
    }

    currentUser = normalizeUser(sessionUser);
    currentProfileImageUrl = String(currentUser.profileImageUrl || "");

    fillForm();
    renderSummary();
  }

  function bindEditButton() {
    if (!editProfileButton) return;

    editProfileButton.addEventListener("click", () => {
      const profileTab = document.getElementById("tab-profile");

      if (profileTab) {
        profileTab.click();
      }

      if (profileNameInput) {
        profileNameInput.focus();
      }

      if (profileForm) {
        profileForm.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  function bindImageUpload() {
    if (!profileImageFileInput) return;

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
    if (!profileForm) return;

    profileForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      clearFeedback();

      const name = String(profileNameInput?.value || "").trim();
      const email = String(profileEmailInput?.value || "").trim().toLowerCase();

      if (!name) {
        setFeedback("error", ["Name is required."]);
        return;
      }

      if (!email || !isValidEmail(email)) {
        setFeedback("error", ["Please enter a valid email address."]);
        return;
      }

      if (currentUser && currentUser.email && email !== currentUser.email) {
        setFeedback("error", ["Email cannot be changed for this logged-in account."]);
        fillForm();
        return;
      }

      const auth = getAuth();

      if (!auth || typeof auth.updateCurrentUserProfile !== "function") {
        setFeedback("error", ["Auth system is not ready. Hard refresh and try again."]);
        return;
      }

      const result = auth.updateCurrentUserProfile({
        name,
        profileImageUrl: String(currentProfileImageUrl || "").trim()
      });

      if (!result.ok) {
        setFeedback("error", [result.message || "Unable to save profile right now."]);
        return;
      }

      currentUser = normalizeUser(result.user);
      currentProfileImageUrl = String(currentUser.profileImageUrl || "");

      sessionStorage.setItem("cv_profile_setup_done", "1");
      localStorage.setItem("cv_profile_setup_done::" + String(currentUser.email || "").toLowerCase(), "1");

      fillForm();
      renderSummary();
      setFeedback("success", [result.message || "Profile updated successfully."]);
    });
  }

  function formatDate(value) {
    const date = new Date(String(value || ""));

    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }

    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric"
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
        yRatio: clamp01(point.yRatio)
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
        yRatio: clamp01(y)
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
      .flatMap((playerShots) => Array.isArray(playerShots) ? playerShots : [])
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
          end
        };
      })
      .filter(Boolean);
  }

  function renderHistoryPreviewDataUrl(entryId, entry, size = 84) {
    const safeSize = Math.max(32, Math.round(Number(size) || 84));
    const cacheKey = entryId + ":" + safeSize;

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
    const pitchX = center - pitchWidth / 2;
    const pitchY = center - pitchHeight * 0.58;

    const pitchGradient = context.createLinearGradient(pitchX, pitchY, pitchX, pitchY + pitchHeight);
    pitchGradient.addColorStop(0, "#b79463");
    pitchGradient.addColorStop(1, "#8a6b46");
    context.fillStyle = pitchGradient;
    context.fillRect(pitchX, pitchY, pitchWidth, pitchHeight);

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
    previewElement.style.backgroundImage = previewUrl ? "url(" + previewUrl + ")" : "none";
  }

  function renderPitchMapHistoryPreview(preview, record) {
    if (!preview || !record) {
      return;
    }

    const deliveries = Array.isArray(record.deliveries) ? record.deliveries : [];

    preview.innerHTML = "";
    preview.classList.add("is-rendered", "pitch-history-preview");
    preview.style.position = "relative";
    preview.style.overflow = "hidden";
    preview.style.borderRadius = "8px";
    preview.style.backgroundImage = "url(assets/pitch-map-base.png?v=final)";
    preview.style.backgroundSize = "contain";
    preview.style.backgroundPosition = "center";
    preview.style.backgroundRepeat = "no-repeat";

    deliveries.forEach((delivery) => {
      const x = Number(delivery.wrapperX);
      const y = Number(delivery.wrapperY);

      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        return;
      }

      const dot = document.createElement("span");
      dot.className = "profile-pitch-delivery-dot";
      dot.style.left = x + "%";
      dot.style.top = y + "%";
      dot.style.background = PROFILE_PITCH_OUTCOME_COLORS[delivery.outcome] || "#FF0054";

      preview.appendChild(dot);
    });
  }

  function getHistoryEntries() {
    const wagonHistory = getScopedArray("wagonWheelHistory");
    const pitchMapHistory = getScopedArray("pitchMapHistory");

    const wagonEntries = wagonHistory.map((entry, index) => {
      const ballsByPlayer = entry?.ballsByPlayer && typeof entry.ballsByPlayer === "object" ? entry.ballsByPlayer : {};
      const playerNames = entry?.playerRosterNameById && typeof entry.playerRosterNameById === "object" ? entry.playerRosterNameById : {};

      const computedFromBalls = (() => {
        let runs = 0;
        let balls = 0;

        Object.values(ballsByPlayer).forEach((playerBalls) => {
          if (!Array.isArray(playerBalls)) return;
          balls += playerBalls.length;
          runs += playerBalls.reduce((sum, ball) => sum + (Number(ball?.run) || 0), 0);
        });

        return { runs, balls };
      })();

      const computedFromShots = (() => {
        if (!entry?.shotsByPlayer || typeof entry.shotsByPlayer !== "object") {
          return { runs: 0, balls: 0 };
        }

        let runs = 0;
        let balls = 0;

        Object.values(entry.shotsByPlayer).forEach((shots) => {
          if (!Array.isArray(shots)) return;
          balls += shots.length;
          runs += shots.reduce((sum, shot) => sum + (Number(shot?.runValue) || 0), 0);
        });

        return { runs, balls };
      })();

      const runs = Number.isFinite(Number(entry?.totalRuns))
        ? Number(entry.totalRuns)
        : Math.max(computedFromBalls.runs, computedFromShots.runs);

      const balls = Number.isFinite(Number(entry?.totalBalls))
        ? Number(entry.totalBalls)
        : Math.max(computedFromBalls.balls, computedFromShots.balls);

      const displayPlayerName = (() => {
        if (entry?.playerName) return String(entry.playerName);

        const rosterNames = Object.values(playerNames).filter((value) => String(value || "").trim().length > 0);
        if (rosterNames.length === 1) return String(rosterNames[0]);
        if (rosterNames.length > 1) return "Team Innings";

        return "Player";
      })();

      return {
        id: String(entry?.id || entry?.savedAt || displayPlayerName + "-" + runs + "-" + balls),
        type: "wagon",
        playerName: displayPlayerName,
        title: "Wagon Wheel " + (index + 1),
        statsText: Math.max(0, runs) + " Runs | " + Math.max(0, balls) + " Balls",
        savedAt: entry?.savedAt || "",
        raw: entry
      };
    });

    const pitchEntries = pitchMapHistory.map((entry, index) => {
      const totalDeliveries = Number(entry?.totalDeliveries) || (Array.isArray(entry?.deliveries) ? entry.deliveries.length : 0);
      const dotBalls = Number(entry?.dotBalls) || (Array.isArray(entry?.deliveries) ? entry.deliveries.filter((delivery) => delivery?.outcome === "Dot").length : 0);
      const wickets = Number(entry?.wickets) || 0;
      const bowlerName = String(entry?.bowlerName || "Bowler");

      return {
        id: String(entry?.id || entry?.savedAt || "pitch-map-" + bowlerName + "-" + totalDeliveries),
        type: "pitch",
        playerName: bowlerName,
        title: "Pitch Map " + (index + 1),
        statsText: totalDeliveries + " Deliveries | " + dotBalls + " Dot Balls | " + wickets + " Wickets",
        savedAt: entry?.savedAt || "",
        raw: entry
      };
    });

    return [...wagonEntries, ...pitchEntries].sort((a, b) => {
      const aTime = Date.parse(String(a.savedAt || ""));
      const bTime = Date.parse(String(b.savedAt || ""));
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });
  }

  function showCreaseVisionConfirm(message, onConfirm) {
    const existing = document.getElementById("creasevision-confirm-modal");
    if (existing) existing.remove();

    const backdrop = document.createElement("div");
    backdrop.id = "creasevision-confirm-modal";
    backdrop.className = "cv-confirm-backdrop";

    const modal = document.createElement("div");
    modal.className = "cv-confirm-modal";

    const title = document.createElement("h3");
    title.textContent = "CreaseVision";

    const text = document.createElement("p");
    text.textContent = message;

    const actions = document.createElement("div");
    actions.className = "cv-confirm-actions";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "action-btn secondary";
    cancelButton.textContent = "Cancel";

    const okButton = document.createElement("button");
    okButton.type = "button";
    okButton.className = "action-btn primary";
    okButton.textContent = "OK";

    cancelButton.addEventListener("click", () => backdrop.remove());
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) backdrop.remove();
    });

    okButton.addEventListener("click", () => {
      backdrop.remove();
      onConfirm();
    });

    actions.appendChild(cancelButton);
    actions.appendChild(okButton);
    modal.appendChild(title);
    modal.appendChild(text);
    modal.appendChild(actions);
    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);
  }

  function deleteHistoryEntry(entryId, entryType = "wagon") {
    showCreaseVisionConfirm("Delete this history entry?", () => {
      const baseKey = entryType === "pitch" ? "pitchMapHistory" : "wagonWheelHistory";
      const legacyKey = entryType === "pitch" ? "pitchMapHistory" : "wagonWheelHistory";
      const history = getScopedArray(baseKey);

      const nextHistory = history.filter((entry) => String(entry?.id || "") !== String(entryId || ""));
      setScopedArray(baseKey, nextHistory);

      if (entryType === "pitch") {
        setScopedArray("creasevisionPitchMapHistory", nextHistory);
      }

      renderHistory();
    });
  }

  function renderHistory() {
    if (!historyList) return;

    const entries = getHistoryEntries();
    historyList.innerHTML = "";

    if (entries.length === 0) {
      const empty = document.createElement("div");
      empty.className = "history-empty";
      empty.textContent = "No history yet. Complete a wagon wheel innings or pitch map to see cards here.";
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
      player.textContent = entry.title || entry.playerName;

      const date = document.createElement("p");
      date.className = "history-date";
      date.textContent = formatDate(entry.savedAt);

      left.appendChild(player);
      left.appendChild(date);

      const preview = document.createElement("div");
      preview.className = "history-preview";
      preview.setAttribute("aria-hidden", "true");

      if (entry.type === "pitch") {
        renderPitchMapHistoryPreview(preview, entry.raw || entry);
      } else {
        applyHistoryPreview(preview, entry);
      }

      top.appendChild(left);
      top.appendChild(preview);

      const stats = document.createElement("p");
      stats.className = "history-stats";
      stats.textContent = entry.statsText;

      const actions = document.createElement("div");
      actions.className = "history-actions";

      const viewButton = document.createElement("button");
      viewButton.type = "button";
      viewButton.className = "action-btn secondary";
      viewButton.textContent = "View";
      viewButton.addEventListener("click", () => {
        if (entry.type === "pitch") {
          localStorage.setItem(PITCH_HISTORY_VIEW_RECORD_KEY, entry.id);
          window.location.href = "pitch-map.html?source=history";
          return;
        }

        localStorage.setItem(HISTORY_VIEW_RECORD_KEY, entry.id);
        window.location.href = "review.html?source=history";
      });

      const downloadButton = document.createElement("button");
      downloadButton.type = "button";
      downloadButton.className = "action-btn secondary";
      downloadButton.textContent = "Download";
      downloadButton.addEventListener("click", () => {
        if (entry.type === "pitch") {
          localStorage.setItem(PITCH_HISTORY_VIEW_RECORD_KEY, entry.id);
          window.location.href = "pitch-map.html?source=history";
          return;
        }

        localStorage.setItem(HISTORY_VIEW_RECORD_KEY, entry.id);
        localStorage.setItem("cww_history_auto_export", "1");
        window.location.href = "review.html?source=history&autodownload=1";
      });

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "action-btn secondary";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", () => {
        deleteHistoryEntry(entry.id, entry.type);
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

  async function init() {
    setupTabs();
    bindEditButton();
    bindImageUpload();
    bindProfileSave();
    await loadUserProfile();
    renderHistory();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
