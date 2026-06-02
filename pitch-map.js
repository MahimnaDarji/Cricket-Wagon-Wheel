
function getPitchMapUserIdentity() {
  function safeParsePitchIdentity(value, fallback) {
    try {
      const parsed = JSON.parse(value || "");
      return parsed || fallback;
    } catch {
      return fallback;
    }
  }

  const playerSetup = safeParsePitchIdentity(localStorage.getItem("playerSetup"), null);

  if (playerSetup && Array.isArray(playerSetup.players) && playerSetup.players.length > 0) {
    const firstPlayer = playerSetup.players[0] || {};
    const playerName = String(firstPlayer.name || "").trim();
    const playerAvatar = String(firstPlayer.avatar || "").trim();

    if (playerName || playerAvatar) {
      return {
        name: playerName,
        avatar: playerAvatar
      };
    }
  }

  const jsonKeys = [
    "cww_session_user",
    "creasevisionUserProfile",
    "currentUser"
  ];

  for (const key of jsonKeys) {
    const value = safeParsePitchIdentity(localStorage.getItem(key), null);

    if (value && typeof value === "object") {
      const name = String(value.name || "").trim();
      const avatar = String(value.profileImageUrl || value.avatar || "").trim();

      if (name || avatar) {
        return {
          name,
          avatar
        };
      }
    }
  }

  return {
    name: String(localStorage.getItem("profileName") || "").trim(),
    avatar: String(localStorage.getItem("profileImageUrl") || "").trim()
  };
}


function getCreaseVisionLatestProfileForBowlerSync() {
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

function syncCreaseVisionBowlerStorageWithProfile() {
  const profile = getCreaseVisionLatestProfileForBowlerSync();
  const profileName = String(profile.name || "").trim();
  const profileImageUrl = String(profile.profileImageUrl || "").trim();

  if (!profileName && !profileImageUrl) {
    return null;
  }

  let bowlers = [];

  try {
    const parsed = JSON.parse(localStorage.getItem("creasevisionBowlers") || "[]");
    bowlers = Array.isArray(parsed) ? parsed : [];
  } catch {
    bowlers = [];
  }

  let selectedIndex = Number(localStorage.getItem("creasevisionSelectedBowlerIndex") || "0");
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0) {
    selectedIndex = 0;
  }

  const existing = bowlers[selectedIndex] || {};

  bowlers[selectedIndex] = {
    ...existing,
    id: String(existing.id || "bowler-1"),
    name: profileName || String(existing.name || "Bowler"),
    style: String(existing.style || "Right Arm Bowler"),
    avatar: profileImageUrl || String(existing.avatar || "")
  };

  localStorage.setItem("creasevisionBowlers", JSON.stringify(bowlers));
  localStorage.setItem("creasevisionSelectedBowlerIndex", String(selectedIndex));

  return bowlers[selectedIndex];
}

function getLatestCreaseVisionUserProfile() {
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

function syncBowlerWithLatestProfile() {
  const profile = getLatestCreaseVisionUserProfile();
  const profileName = String(profile.name || "").trim();
  const profileImageUrl = String(profile.profileImageUrl || "").trim();

  if (!profileName && !profileImageUrl) {
    return;
  }

  const bowlers = (() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("creasevisionBowlers") || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const selectedIndex = Number(localStorage.getItem("creasevisionSelectedBowlerIndex") || "0");
  const safeIndex = Number.isInteger(selectedIndex) && selectedIndex >= 0 ? selectedIndex : 0;

  if (!bowlers[safeIndex]) {
    bowlers[safeIndex] = {
      id: "bowler-1",
      name: profileName || "Bowler",
      style: "Right Arm Bowler",
      avatar: profileImageUrl
    };
  } else {
    bowlers[safeIndex] = {
      ...bowlers[safeIndex],
      name: profileName || bowlers[safeIndex].name || "Bowler",
      avatar: profileImageUrl || bowlers[safeIndex].avatar || ""
    };
  }

  localStorage.setItem("creasevisionBowlers", JSON.stringify(bowlers));
  localStorage.setItem("creasevisionSelectedBowlerIndex", String(safeIndex));
}

const PITCH_MAP_HISTORY_VIEW_KEY = "pitch_map_history_view_record_id";

function parsePitchMapJson(value, fallback) {
  try {
    const parsed = value ? JSON.parse(value) : fallback;
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function getPitchMapHistoryRecordForView() {
  const params = new URLSearchParams(window.location.search);
  const isHistoryView = params.get("source") === "history";
  const requestedId = String(localStorage.getItem(PITCH_MAP_HISTORY_VIEW_KEY) || "").trim();

  if (!isHistoryView || !requestedId) {
    return null;
  }

  const history = parsePitchMapJson(
    localStorage.getItem("pitchMapHistory") || localStorage.getItem("creasevisionPitchMapHistory"),
    []
  );

  if (!Array.isArray(history)) {
    localStorage.removeItem(PITCH_MAP_HISTORY_VIEW_KEY);
    return null;
  }

  const record = history.find((entry) => String(entry?.id || "") === requestedId);
  localStorage.removeItem(PITCH_MAP_HISTORY_VIEW_KEY);

  return record && typeof record === "object" ? record : null;
}

const pitchMapHistoryViewRecord = getPitchMapHistoryRecordForView();

const state = {
  outcome: "Dot",
  deliveries: Array.isArray(pitchMapHistoryViewRecord?.deliveries)
    ? pitchMapHistoryViewRecord.deliveries.map((delivery) => ({ ...delivery }))
    : JSON.parse(localStorage.getItem("creasevisionPitchDeliveries") || "[]")
};

window.pitchMapHistoryViewRecord = pitchMapHistoryViewRecord;

window.pitchMapState = state;

const pitchMapInitialDeliverySnapshot = JSON.stringify(state.deliveries || []);

function savePitchMapState() {
  if (window.pitchMapHistoryViewRecord) {
    return;
  }

  if (!window.pitchMapHistoryViewRecord) {
    localStorage.setItem("creasevisionPitchDeliveries", JSON.stringify(state.deliveries));
  }
}

const outcomeButtons = document.querySelectorAll("[data-outcome]");
const pitchArea = document.getElementById("pitch-area");
const deliveryLayer = document.getElementById("delivery-layer");

const colors = {
  Dot: "#FF0054",
  Run: "#005F73",
  Boundary: "#E8A838",
  Wicket: "#2D00F7"
};

const pitchBounds = {
  left: 15.4,
  right: 88.6,
  top: 12.9,
  bottom: 97.8
};

function getRenderedImageRect(img) {
  const rect = img.getBoundingClientRect();
  const naturalRatio = img.naturalWidth / img.naturalHeight;
  const boxRatio = rect.width / rect.height;

  let width = rect.width;
  let height = rect.height;
  let left = rect.left;
  let top = rect.top;

  if (boxRatio > naturalRatio) {
    width = rect.height * naturalRatio;
    left = rect.left + (rect.width - width) / 2;
  } else {
    height = rect.width / naturalRatio;
    top = rect.top + (rect.height - height) / 2;
  }

  return { left, top, width, height };
}

const PITCH_IMAGE_BANDS = {
  left: 15.4,
  right: 88.6,
  top: 12.9,
  fullTossEnd: 22.3,
  yorkerEnd: 34.0,
  halfVolleyEnd: 46.9,
  fullEnd: 60.8,
  goodEnd: 75.4,
  bottom: 97.8
};

function getLengthFromPitchImageY(imageY) {
  const y = Number(imageY);

  if (!Number.isFinite(y)) return "Unknown";
  if (y < PITCH_IMAGE_BANDS.top || y > PITCH_IMAGE_BANDS.bottom) return "Unknown";
  if (y < PITCH_IMAGE_BANDS.fullTossEnd) return "FullToss";
  if (y < PITCH_IMAGE_BANDS.yorkerEnd) return "Yorker";
  if (y < PITCH_IMAGE_BANDS.halfVolleyEnd) return "HalfVolley";
  if (y < PITCH_IMAGE_BANDS.fullEnd) return "Full";
  if (y < PITCH_IMAGE_BANDS.goodEnd) return "Good";
  return "Short";
}

function normalizePitchDeliveryLength(delivery) {
  if (!delivery || typeof delivery !== "object") {
    return delivery;
  }

  return {
    ...delivery,
    length: getLengthFromPitchImageY(Number(delivery.imageY))
  };
}

function lengthCountId(length) {
  return {
    FullToss: "full-toss-count",
    Yorker: "yorker-count",
    HalfVolley: "half-volley-count",
    Full: "full-count",
    Good: "good-count",
    Short: "short-count"
  }[length];
}

function loadBowler() {
  const identity = getPitchMapUserIdentity();

  const bowlers = (() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("creasevisionBowlers") || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const selectedIndex = Number(localStorage.getItem("creasevisionSelectedBowlerIndex") || "0");
  const selectedBowler = bowlers[selectedIndex] || {};

  const bowler = {
    id: String(selectedBowler.id || "bowler-1"),
    name: identity.name || String(selectedBowler.name || "Bowler"),
    style: String(selectedBowler.style || "Right Arm Bowler"),
    avatar: identity.avatar || String(selectedBowler.avatar || "")
  };

  bowlers[selectedIndex] = bowler;
  localStorage.setItem("creasevisionBowlers", JSON.stringify(bowlers));
  localStorage.setItem("creasevisionSelectedBowlerIndex", String(selectedIndex));

  const nameElement = document.getElementById("bowler-name-display");
  const styleElement = document.getElementById("bowler-style-display");
  const avatarElement = document.getElementById("bowler-avatar");

  if (nameElement) {
    nameElement.textContent = bowler.name;
  }

  if (styleElement) {
    styleElement.textContent = bowler.style;
  }

  if (avatarElement) {
    avatarElement.innerHTML = "";
    avatarElement.classList.toggle("has-image", Boolean(bowler.avatar));

    if (bowler.avatar) {
      const img = document.createElement("img");
      img.src = bowler.avatar;
      img.alt = bowler.name + " profile";
      avatarElement.appendChild(img);
    }
  }
}

function setActive(buttons, activeValue, attr) {
  buttons.forEach((button) => {
    button.classList.toggle("active", button.dataset[attr] === activeValue);
  });
}

function renderDeliveries() {
  state.deliveries = state.deliveries
    .map(normalizePitchDeliveryLength)
    .filter((delivery) => delivery && delivery.length !== "Unknown");

  localStorage.setItem("creasevisionPitchDeliveries", JSON.stringify(state.deliveries));

  deliveryLayer.innerHTML = "";

  state.deliveries.forEach((delivery) => {
    const dot = document.createElement("span");
    dot.className = "delivery-dot";
    dot.style.left = `${delivery.wrapperX}%`;
    dot.style.top = `${delivery.wrapperY}%`;
    dot.style.background = colors[delivery.outcome];
    deliveryLayer.appendChild(dot);
  });

  updateSummary();
}

function isCurrentBowlerLeftArm() {
  const styleText = String(document.getElementById("bowler-style-display")?.textContent || "").toLowerCase();

  if (styleText.includes("left")) {
    return true;
  }

  try {
    const bowlers = JSON.parse(localStorage.getItem("creasevisionBowlers") || "[]");
    const selectedIndex = Number(localStorage.getItem("creasevisionSelectedBowlerIndex") || "0");
    const bowler = Array.isArray(bowlers) ? bowlers[selectedIndex] : null;
    const storedStyle = String(bowler?.style || "").toLowerCase();

    return storedStyle.includes("left");
  } catch {
    return false;
  }
}

function updateSummary() {
  state.deliveries = state.deliveries
    .map(normalizePitchDeliveryLength)
    .filter((delivery) => delivery && delivery.length !== "Unknown");

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  const lengthCounts = {
    FullToss: 0,
    Yorker: 0,
    HalfVolley: 0,
    Full: 0,
    Good: 0,
    Short: 0
  };

  state.deliveries.forEach((delivery) => {
    const length = getLengthFromPitchImageY(Number(delivery.imageY));
    if (Object.prototype.hasOwnProperty.call(lengthCounts, length)) {
      lengthCounts[length] += 1;
    }
  });

  setText("full-toss-count", lengthCounts.FullToss);
  setText("yorker-count", lengthCounts.Yorker);
  setText("half-volley-count", lengthCounts.HalfVolley);
  setText("full-count", lengthCounts.Full);
  setText("good-count", lengthCounts.Good);
  setText("short-count", lengthCounts.Short);

  const isLeftArmBowler = isCurrentBowlerLeftArm();

  const leftSideCount = state.deliveries.filter((d) => Number(d.pitchX) < 42).length;
  const middleCount = state.deliveries.filter((d) => Number(d.pitchX) >= 42 && Number(d.pitchX) <= 58).length;
  const rightSideCount = state.deliveries.filter((d) => Number(d.pitchX) > 58).length;

  setText("off-count", isLeftArmBowler ? rightSideCount : leftSideCount);
  setText("middle-count", middleCount);
  setText("leg-count", isLeftArmBowler ? leftSideCount : rightSideCount);
}

outcomeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.outcome = button.dataset.outcome;
    setActive(outcomeButtons, state.outcome, "outcome");
  });
});

pitchArea.addEventListener("click", (event) => {
  const wrap = document.querySelector(".pitch-image-wrap");
  const image = document.querySelector(".pitch-base-image");

  if (!wrap || !image) return;

  const wrapRect = wrap.getBoundingClientRect();
  const imageRect = getRenderedImageRect(image);

  const imageX = ((event.clientX - imageRect.left) / imageRect.width) * 100;
  const imageY = ((event.clientY - imageRect.top) / imageRect.height) * 100;

  if (
    imageX < pitchBounds.left ||
    imageX > pitchBounds.right ||
    imageY < pitchBounds.top ||
    imageY > pitchBounds.bottom
  ) {
    return;
  }

  const wrapperX = ((event.clientX - wrapRect.left) / wrapRect.width) * 100;
  const wrapperY = ((event.clientY - wrapRect.top) / wrapRect.height) * 100;

  const pitchX = ((imageX - pitchBounds.left) / (pitchBounds.right - pitchBounds.left)) * 100;
  const pitchY = ((imageY - pitchBounds.top) / (pitchBounds.bottom - pitchBounds.top)) * 100;

  state.deliveries.push({
    wrapperX,
    wrapperY,
    imageX,
    imageY,
    pitchX,
    pitchY,
    outcome: state.outcome,
    length: getLengthFromPitchImageY(imageY)
  });

  savePitchMapState();
  renderDeliveries();
});

document.getElementById("next-delivery-btn").addEventListener("click", () => {
  savePitchMapState();
  state.outcome = "Dot";
  setActive(outcomeButtons, state.outcome, "outcome");
});

const undoDeliveryButton = document.getElementById("undo-delivery-btn");

if (undoDeliveryButton) {
  undoDeliveryButton.addEventListener("click", () => {
    if (!Array.isArray(state.deliveries) || state.deliveries.length === 0) {
      return;
    }

    state.deliveries.pop();
    savePitchMapState();
    renderDeliveries();
  });
}

document.getElementById("complete-bowling-btn").addEventListener("click", () => {
  localStorage.setItem("creasevisionPitchDeliveries", JSON.stringify(state.deliveries));
});

function applyGroundSelectionToPitchMap() {
  const groundNameElement = document.getElementById("pitch-ground-name");
  const groundModeElement = document.getElementById("pitch-ground-mode");

  const savedGroundName = localStorage.getItem("creasevisionGroundName") || "Melbourne Cricket Ground";
  const savedGroundMode = localStorage.getItem("creasevisionGroundModeLabel") || "Preset";

  if (groundNameElement) groundNameElement.textContent = savedGroundName;
  if (groundModeElement) groundModeElement.textContent = `Ground Mode: ${savedGroundMode}`;
}

loadBowler();
applyGroundSelectionToPitchMap();
renderDeliveries();


window.resetPitchMapForNewInnings = function resetPitchMapForNewInnings() {
  state.deliveries = [];
  state.outcome = "Dot";
  localStorage.setItem("creasevisionPitchDeliveries", JSON.stringify(state.deliveries));

  const outcomeButtons = document.querySelectorAll("[data-outcome]");
  outcomeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.outcome === "Dot");
  });

  renderDeliveries();
};


document.addEventListener("DOMContentLoaded", () => {
  syncBowlerWithLatestProfile();

  const profile = getLatestCreaseVisionUserProfile();
  const profileName = String(profile.name || "").trim();
  const profileImageUrl = String(profile.profileImageUrl || "").trim();

  const bowlerNameDisplay = document.getElementById("bowler-name-display");
  const bowlerAvatar = document.getElementById("bowler-avatar");

  if (bowlerNameDisplay && profileName) {
    bowlerNameDisplay.textContent = profileName;
  }

  if (bowlerAvatar && profileImageUrl) {
    bowlerAvatar.classList.add("has-image");
    bowlerAvatar.innerHTML = '<img src="' + profileImageUrl + '" alt="' + (profileName || "Bowler") + ' profile">';
  }

  const nameInputs = [
    document.getElementById("bowler-name"),
    document.getElementById("bowler-name-input"),
    document.querySelector("[data-bowler-name]")
  ].filter(Boolean);

  nameInputs.forEach((input) => {
    if ("value" in input && profileName) {
      input.value = profileName;
    }
  });

  const avatarTargets = [
    document.getElementById("selected-avatar"),
    document.getElementById("bowler-avatar-preview"),
    document.querySelector("[data-bowler-avatar]")
  ].filter(Boolean);

  avatarTargets.forEach((element) => {
    if (!profileImageUrl) {
      return;
    }

    if (element.tagName === "IMG") {
      element.src = profileImageUrl;
    } else {
      element.classList.add("has-image");
      element.innerHTML = '<img src="' + profileImageUrl + '" alt="' + (profileName || "Bowler") + ' profile">';
    }
  });
});


function refreshPitchMapBowlerFromProfile() {
  syncCreaseVisionBowlerStorageWithProfile();
  loadBowler();
}

window.addEventListener("storage", refreshPitchMapBowlerFromProfile);
window.addEventListener("pageshow", refreshPitchMapBowlerFromProfile);


function getPitchMapSavedBowlerStyle() {
  try {
    const bowlers = JSON.parse(localStorage.getItem("creasevisionBowlers") || "[]");
    const selectedIndex = Number(localStorage.getItem("creasevisionSelectedBowlerIndex") || "0");
    const selectedBowler = Array.isArray(bowlers) ? bowlers[selectedIndex] || bowlers[0] : null;
    const savedStyle = String(selectedBowler?.style || "").trim();

    if (savedStyle === "Left Arm Bowler" || savedStyle === "Right Arm Bowler") {
      return savedStyle;
    }
  } catch {}

  return "Right Arm Bowler";
}

function applyProfileToPitchMapBowlerSource() {
  let setup = {};
  try {
    setup = JSON.parse(localStorage.getItem("playerSetup") || "{}");
  } catch {
    setup = {};
  }

  let profile = null;
  try {
    profile = JSON.parse(localStorage.getItem("cww_session_user") || "null");
  } catch {
    profile = null;
  }

  const player = Array.isArray(setup.players) && setup.players.length > 0 ? setup.players[0] : {};

  const finalName = String(profile?.name || player.name || localStorage.getItem("profileName") || "").trim();
  const finalAvatar = String(profile?.profileImageUrl || player.avatar || localStorage.getItem("profileImageUrl") || "").trim();
  const finalStyle = getPitchMapSavedBowlerStyle();

  if (!finalName && !finalAvatar) return;

  let bowlers = [];
  try {
    const parsed = JSON.parse(localStorage.getItem("creasevisionBowlers") || "[]");
    bowlers = Array.isArray(parsed) ? parsed : [];
  } catch {
    bowlers = [];
  }

  const existing = bowlers[0] || {};

  const bowler = {
    ...existing,
    id: String(existing.id || "bowler-1"),
    name: finalName || String(existing.name || "Bowler"),
    style: finalStyle,
    avatar: finalAvatar || String(existing.avatar || "")
  };

  localStorage.setItem("creasevisionBowlerMode", "individual");
  localStorage.setItem("creasevisionSelectedBowlerIndex", "0");
  localStorage.setItem("creasevisionBowlers", JSON.stringify([bowler]));

  const nameElement = document.getElementById("bowler-name-display");
  const styleElement = document.getElementById("bowler-style-display");
  const avatarElement = document.getElementById("bowler-avatar");

  if (nameElement) {
    nameElement.textContent = bowler.name;
  }

  if (styleElement) {
    styleElement.textContent = bowler.style;
  }

  if (avatarElement) {
    avatarElement.innerHTML = "";
    avatarElement.classList.toggle("has-image", Boolean(bowler.avatar));

    if (bowler.avatar) {
      const img = document.createElement("img");
      img.src = bowler.avatar;
      img.alt = bowler.name + " profile";
      avatarElement.appendChild(img);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  applyProfileToPitchMapBowlerSource();
  window.setTimeout(applyProfileToPitchMapBowlerSource, 0);
  window.setTimeout(applyProfileToPitchMapBowlerSource, 150);
});

window.addEventListener("pageshow", applyProfileToPitchMapBowlerSource);


function hasPitchMapUnsavedChanges() {
  if (!Array.isArray(state.deliveries)) {
    return false;
  }

  return state.deliveries.length > 0 || JSON.stringify(state.deliveries) !== pitchMapInitialDeliverySnapshot;
}

function clearCurrentPitchMapSession() {
  state.deliveries = [];
  state.outcome = "Dot";
  localStorage.removeItem("creasevisionPitchDeliveries");

  document.querySelectorAll("[data-outcome]").forEach((button) => {
    button.classList.toggle("active", button.dataset.outcome === "Dot");
  });

  renderDeliveries();
}

function saveCurrentPitchMapToHistory() {
  if (!Array.isArray(state.deliveries) || state.deliveries.length === 0) {
    return;
  }

  if (typeof buildCompletedPitchMapRecord === "function" && typeof appendPitchMapToHistory === "function") {
    const completedRecord = buildCompletedPitchMapRecord();
    appendPitchMapToHistory(completedRecord);
  }

  clearCurrentPitchMapSession();
}

function goBackFromPitchMap() {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.location.href = "bowler-setup.html";
}

function showPitchMapBackConfirm() {
  const existing = document.getElementById("pitch-map-back-confirm-modal");
  if (existing) {
    existing.remove();
  }

  const backdrop = document.createElement("div");
  backdrop.id = "pitch-map-back-confirm-modal";
  backdrop.className = "modal-backdrop";

  const modal = document.createElement("div");
  modal.className = "confirm-modal";

  const title = document.createElement("h3");
  title.textContent = "Save Changes";

  const message = document.createElement("p");
  message.className = "confirm-message";
  message.textContent = "Do you want to save your changes?";

  const actions = document.createElement("div");
  actions.className = "confirm-actions";

  const noButton = document.createElement("button");
  noButton.type = "button";
  noButton.className = "wagon-wheel-action-btn";
  noButton.textContent = "No";

  const yesButton = document.createElement("button");
  yesButton.type = "button";
  yesButton.className = "wagon-wheel-action-btn complete";
  yesButton.textContent = "Yes";

  noButton.addEventListener("click", () => {
    backdrop.remove();
    clearCurrentPitchMapSession();
    goBackFromPitchMap();
  });

  yesButton.addEventListener("click", () => {
    backdrop.remove();
    saveCurrentPitchMapToHistory();
    goBackFromPitchMap();
  });

  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) {
      backdrop.remove();
    }
  });

  actions.appendChild(noButton);
  actions.appendChild(yesButton);
  modal.appendChild(title);
  modal.appendChild(message);
  modal.appendChild(actions);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);
}

function setupPitchMapBackBehavior() {
  const backButton = document.getElementById("pitch-map-back-btn");

  if (!backButton) {
    return;
  }

  backButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    if (!hasPitchMapUnsavedChanges()) {
      goBackFromPitchMap();
      return;
    }

    showPitchMapBackConfirm();
  }, true);
}

document.addEventListener("DOMContentLoaded", setupPitchMapBackBehavior);


function applyPitchMapHistoryViewMode() {
  if (!window.pitchMapHistoryViewRecord) {
    return;
  }

  const exportBlock = document.getElementById("download-export-block");
  if (exportBlock) {
    exportBlock.classList.remove("is-hidden");
  }

  const controlSelectors = [
    "[data-outcome]",
    "#next-delivery-btn",
    "#undo-delivery-btn",
    "#complete-bowling-btn"
  ];

  controlSelectors.forEach((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.disabled = true;
      element.style.pointerEvents = "none";
      element.style.opacity = "0.65";
    });
  });

  const title = document.querySelector(".pitch-topbar h2");
  if (title) {
    title.textContent = "Saved Pitch Map";
  }

  const subtitle = document.querySelector(".pitch-topbar p");
  if (subtitle) {
    subtitle.textContent = "Viewing the saved pitch map from history.";
  }

  const saveButton = document.getElementById("return-dashboard-btn");
  if (saveButton) {
    saveButton.textContent = "Back to Profile";
    saveButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.href = "profile.html";
    }, true);
  }
}

document.addEventListener("DOMContentLoaded", applyPitchMapHistoryViewMode);
