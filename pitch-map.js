(() => {
  "use strict";

  const HISTORY_VIEW_KEY = "pitch_map_history_view_record_id";

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

  const pitchBands = {
    top: 12.9,
    fullTossEnd: 22.3,
    yorkerEnd: 34.0,
    halfVolleyEnd: 46.9,
    fullEnd: 60.8,
    goodEnd: 75.4,
    bottom: 97.8
  };

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

  const outcomeButtons = Array.from(document.querySelectorAll("[data-outcome]"));
  const pitchArea = document.getElementById("pitch-area");
  const deliveryLayer = document.getElementById("delivery-layer");
  const nextDeliveryButton = document.getElementById("next-delivery-btn");
  const undoDeliveryButton = document.getElementById("undo-delivery-btn");
  const completeBowlingButton = document.getElementById("complete-bowling-btn");
  const exportBlock = document.getElementById("download-export-block");

  const state = {
    outcome: "Dot",
    deliveries: []
  };

  window.pitchMapState = state;

  const historyViewRecord = getHistoryViewRecord();
  const isHistoryView = Boolean(historyViewRecord);

  if (isHistoryView) {
    state.deliveries = normalizeDeliveries(historyViewRecord.deliveries || []);
  } else {
    state.deliveries = loadActiveDeliveries();
  }

  const initialDeliverySnapshot = JSON.stringify(state.deliveries);

  function safeParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function loadActiveDeliveries() {
    const sessionDeliveries = safeParse(sessionStorage.getItem("creasevisionPitchDeliveries"), null);

    if (Array.isArray(sessionDeliveries)) {
      return normalizeDeliveries(sessionDeliveries);
    }

    const localDeliveries = safeParse(localStorage.getItem("creasevisionPitchDeliveries"), []);

    return Array.isArray(localDeliveries) ? normalizeDeliveries(localDeliveries) : [];
  }

  function savePitchMapState() {
    if (isHistoryView) {
      return;
    }

    const payload = JSON.stringify(state.deliveries);

    sessionStorage.setItem("creasevisionPitchDeliveries", payload);
    localStorage.setItem("creasevisionPitchDeliveries", payload);
  }

  function clearPitchMapState() {
    state.deliveries = [];
    state.outcome = "Dot";

    sessionStorage.removeItem("creasevisionPitchDeliveries");
    localStorage.removeItem("creasevisionPitchDeliveries");

    setActiveOutcome("Dot");
    renderDeliveries();
  }

  function getHistoryArray(key) {
    const direct = safeParse(localStorage.getItem(key), null);

    if (Array.isArray(direct)) {
      return direct;
    }

    if (window.CWWAuth && typeof window.CWWAuth.scopedGet === "function") {
      const scoped = window.CWWAuth.scopedGet(key, []);

      if (Array.isArray(scoped)) {
        return scoped;
      }
    }

    return [];
  }

  function getHistoryViewRecord() {
    const params = new URLSearchParams(window.location.search);
    const source = params.get("source");

    if (source !== "history") {
      return null;
    }

    const requestedId = String(localStorage.getItem(HISTORY_VIEW_KEY) || "").trim();

    if (!requestedId) {
      return null;
    }

    const allHistory = [
      ...getHistoryArray("pitchMapHistory"),
      ...getHistoryArray("creasevisionPitchMapHistory")
    ];

    const record = allHistory.find((entry) => String(entry && entry.id || "") === requestedId);

    return record && typeof record === "object" ? record : null;
  }

  function readConfirmedBowlerSetup() {
    const sessionBowlers = safeParse(sessionStorage.getItem("creasevisionBowlers"), null);
    const localBowlers = safeParse(localStorage.getItem("creasevisionBowlers"), null);

    const bowlers = Array.isArray(sessionBowlers)
      ? sessionBowlers
      : (Array.isArray(localBowlers) ? localBowlers : []);

    const sessionIndex = Number(sessionStorage.getItem("creasevisionSelectedBowlerIndex") || "0");
    const localIndex = Number(localStorage.getItem("creasevisionSelectedBowlerIndex") || "0");
    const selectedIndex = Number.isInteger(sessionIndex) && sessionIndex >= 0
      ? sessionIndex
      : (Number.isInteger(localIndex) && localIndex >= 0 ? localIndex : 0);

    const selected = bowlers[selectedIndex] || bowlers[0] || {};

    return {
      id: String(selected.id || "bowler-1"),
      name: String(selected.name || "").trim() || "Bowler",
      style: selected.style === "Left Arm Bowler" ? "Left Arm Bowler" : "Right Arm Bowler",
      avatar: String(selected.avatar || "")
    };
  }

  function getCurrentBowler() {
    if (isHistoryView && historyViewRecord) {
      return {
        id: String(historyViewRecord.bowlerId || "bowler-1"),
        name: String(historyViewRecord.bowlerName || "Bowler"),
        style: historyViewRecord.bowlerStyle === "Left Arm Bowler" ? "Left Arm Bowler" : "Right Arm Bowler",
        avatar: String(historyViewRecord.bowlerAvatar || "")
      };
    }

    return readConfirmedBowlerSetup();
  }

  function renderBowler() {
    const bowler = getCurrentBowler();

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

      const img = document.createElement("img");
      img.src = bowler.avatar || DEFAULT_AVATAR;
      img.alt = "Bowler profile";

      avatarElement.classList.toggle("has-image", Boolean(bowler.avatar));
      avatarElement.appendChild(img);
    }
  }

  function applyGroundSelectionToPitchMap() {
    const groundNameElement = document.getElementById("pitch-ground-name");
    const groundModeElement = document.getElementById("pitch-ground-mode");

    const savedGroundName = localStorage.getItem("creasevisionGroundName") || "Melbourne Cricket Ground";
    const savedGroundMode = localStorage.getItem("creasevisionGroundModeLabel") || "Preset";

    if (groundNameElement) {
      groundNameElement.textContent = savedGroundName;
    }

    if (groundModeElement) {
      groundModeElement.textContent = "Ground Mode: " + savedGroundMode;
    }
  }

  function getRenderedImageRect(img) {
    const rect = img.getBoundingClientRect();

    if (!img.naturalWidth || !img.naturalHeight) {
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      };
    }

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

  function getLengthFromPitchImageY(imageY) {
    const y = Number(imageY);

    if (!Number.isFinite(y)) return "Unknown";
    if (y < pitchBands.top || y > pitchBands.bottom) return "Unknown";
    if (y < pitchBands.fullTossEnd) return "FullToss";
    if (y < pitchBands.yorkerEnd) return "Yorker";
    if (y < pitchBands.halfVolleyEnd) return "HalfVolley";
    if (y < pitchBands.fullEnd) return "Full";
    if (y < pitchBands.goodEnd) return "Good";

    return "Short";
  }

  function normalizeDelivery(delivery) {
    if (!delivery || typeof delivery !== "object") {
      return null;
    }

    const imageY = Number(delivery.imageY);
    const imageX = Number(delivery.imageX);
    const wrapperX = Number(delivery.wrapperX);
    const wrapperY = Number(delivery.wrapperY);
    const pitchX = Number(delivery.pitchX);
    const pitchY = Number(delivery.pitchY);

    if (
      !Number.isFinite(imageX) ||
      !Number.isFinite(imageY) ||
      !Number.isFinite(wrapperX) ||
      !Number.isFinite(wrapperY)
    ) {
      return null;
    }

    const length = getLengthFromPitchImageY(imageY);

    if (length === "Unknown") {
      return null;
    }

    return {
      wrapperX,
      wrapperY,
      imageX,
      imageY,
      pitchX: Number.isFinite(pitchX) ? pitchX : 0,
      pitchY: Number.isFinite(pitchY) ? pitchY : 0,
      outcome: ["Dot", "Run", "Boundary", "Wicket"].includes(delivery.outcome) ? delivery.outcome : "Dot",
      length
    };
  }

  function normalizeDeliveries(deliveries) {
    return Array.isArray(deliveries)
      ? deliveries.map(normalizeDelivery).filter(Boolean)
      : [];
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

  function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = value;
    }
  }

  function isCurrentBowlerLeftArm() {
    const bowler = getCurrentBowler();
    return bowler.style === "Left Arm Bowler";
  }

  function updateSummary() {
    state.deliveries = normalizeDeliveries(state.deliveries);

    const lengthCounts = {
      FullToss: 0,
      Yorker: 0,
      HalfVolley: 0,
      Full: 0,
      Good: 0,
      Short: 0
    };

    state.deliveries.forEach((delivery) => {
      const length = getLengthFromPitchImageY(delivery.imageY);

      if (Object.prototype.hasOwnProperty.call(lengthCounts, length)) {
        lengthCounts[length] += 1;
      }
    });

    Object.keys(lengthCounts).forEach((length) => {
      setText(lengthCountId(length), lengthCounts[length]);
    });

    const leftSideCount = state.deliveries.filter((delivery) => Number(delivery.pitchX) < 42).length;
    const middleCount = state.deliveries.filter((delivery) => Number(delivery.pitchX) >= 42 && Number(delivery.pitchX) <= 58).length;
    const rightSideCount = state.deliveries.filter((delivery) => Number(delivery.pitchX) > 58).length;

    const leftArm = isCurrentBowlerLeftArm();

    setText("off-count", leftArm ? rightSideCount : leftSideCount);
    setText("middle-count", middleCount);
    setText("leg-count", leftArm ? leftSideCount : rightSideCount);
  }

  function renderDeliveries() {
    if (!deliveryLayer) {
      return;
    }

    state.deliveries = normalizeDeliveries(state.deliveries);

    if (!isHistoryView) {
      savePitchMapState();
    }

    deliveryLayer.innerHTML = "";

    state.deliveries.forEach((delivery) => {
      const dot = document.createElement("span");
      dot.className = "delivery-dot";
      dot.style.left = delivery.wrapperX + "%";
      dot.style.top = delivery.wrapperY + "%";
      dot.style.background = colors[delivery.outcome] || colors.Dot;
      deliveryLayer.appendChild(dot);
    });

    updateSummary();
  }

  function setActiveOutcome(outcome) {
    state.outcome = outcome;

    outcomeButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.outcome === state.outcome);
    });
  }

  function handlePitchClick(event) {
    if (isHistoryView) {
      return;
    }

    const wrap = document.querySelector(".pitch-image-wrap");
    const image = document.querySelector(".pitch-base-image");

    if (!wrap || !image) {
      return;
    }

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

    renderDeliveries();
  }

  function handleNextDelivery() {
    if (isHistoryView) {
      return;
    }

    savePitchMapState();
    setActiveOutcome("Dot");
  }

  function handleUndoDelivery() {
    if (isHistoryView) {
      return;
    }

    if (!Array.isArray(state.deliveries) || state.deliveries.length === 0) {
      return;
    }

    state.deliveries.pop();
    renderDeliveries();
  }

  function hasUnsavedChanges() {
    if (isHistoryView) {
      return false;
    }

    return state.deliveries.length > 0 || JSON.stringify(state.deliveries) !== initialDeliverySnapshot;
  }

  function goBackFromPitchMap() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = "bowler-setup.html";
  }

  function saveCurrentPitchMapToHistoryBeforeBack() {
    if (!state.deliveries.length) {
      return;
    }

    if (
      typeof window.buildCompletedPitchMapRecord === "function" &&
      typeof window.appendPitchMapToHistory === "function"
    ) {
      const record = window.buildCompletedPitchMapRecord();
      window.appendPitchMapToHistory(record);
    }

    clearPitchMapState();
  }

  function showBackConfirm() {
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
      clearPitchMapState();
      goBackFromPitchMap();
    });

    yesButton.addEventListener("click", () => {
      backdrop.remove();
      saveCurrentPitchMapToHistoryBeforeBack();
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

  function setupBackButton() {
    const backButton =
      document.getElementById("pitch-map-back-btn") ||
      Array.from(document.querySelectorAll(".panel-back-btn")).find((button) => {
        return String(button.textContent || "").trim().toLowerCase() === "back";
      });

    if (!backButton) {
      return;
    }

    backButton.removeAttribute("onclick");

    backButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (!hasUnsavedChanges()) {
        goBackFromPitchMap();
        return;
      }

      showBackConfirm();
    }, true);
  }

  function applyHistoryViewMode() {
    if (!isHistoryView) {
      return;
    }

    if (exportBlock) {
      exportBlock.classList.remove("is-hidden");
    }

    [
      "[data-outcome]",
      "#next-delivery-btn",
      "#undo-delivery-btn",
      "#complete-bowling-btn"
    ].forEach((selector) => {
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

  function bindEvents() {
    outcomeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        if (isHistoryView) {
          return;
        }

        setActiveOutcome(button.dataset.outcome || "Dot");
      });
    });

    if (pitchArea) {
      pitchArea.addEventListener("click", handlePitchClick);
    }

    if (nextDeliveryButton) {
      nextDeliveryButton.addEventListener("click", handleNextDelivery);
    }

    if (undoDeliveryButton) {
      undoDeliveryButton.addEventListener("click", handleUndoDelivery);
    }

    if (completeBowlingButton) {
      completeBowlingButton.addEventListener("click", () => {
        if (!isHistoryView) {
          savePitchMapState();
        }
      });
    }

    setupBackButton();
  }

  window.resetPitchMapForNewInnings = function resetPitchMapForNewInnings() {
    clearPitchMapState();
  };

  window.getCurrentPitchMapBowler = function getCurrentPitchMapBowler() {
    return getCurrentBowler();
  };

  window.getPitchMapLengthFromImageY = function getPitchMapLengthFromImageY(imageY) {
    return getLengthFromPitchImageY(imageY);
  };

  function init() {
    renderBowler();
    applyGroundSelectionToPitchMap();
    bindEvents();
    setActiveOutcome("Dot");
    renderDeliveries();
    applyHistoryViewMode();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
