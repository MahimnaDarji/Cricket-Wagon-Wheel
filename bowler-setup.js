(() => {
  "use strict";

  const MAX_BOWLERS = 11;

  const individualMode = document.getElementById("individual-mode");
  const teamMode = document.getElementById("team-mode");
  const bowlerName = document.getElementById("bowler-name");
  const rightArmBtn = document.getElementById("right-arm-btn");
  const leftArmBtn = document.getElementById("left-arm-btn");
  const addBowlerBtn = document.getElementById("add-bowler-btn");
  const removeBowlerBtn = document.getElementById("remove-bowler-btn");
  const confirmBtn = document.getElementById("confirm-btn");
  const bowlerList = document.getElementById("bowler-list");
  const bowlerCount = document.getElementById("bowler-count");
  const selectorHelp = document.getElementById("selector-help");
  const modeStatus = document.getElementById("mode-status");
  const detailsTitle = document.getElementById("bowler-details-title");
  const uploadAvatarBtn = document.getElementById("upload-avatar-btn");
  const resetAvatarBtn = document.getElementById("reset-avatar-btn");
  const avatarInput = document.getElementById("avatar-input");
  const avatarBox = document.querySelector(".bowler-avatar");

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

  const state = {
    mode: "individual",
    selectedIndex: 0,
    bowlers: []
  };

  function getCurrentAccountProfile() {
    const fallback = { name: "", avatar: "" };

    if (!window.CWWAuth || typeof window.CWWAuth.getSessionUserSync !== "function") {
      return fallback;
    }

    const user = window.CWWAuth.getSessionUserSync();

    if (!user) {
      return fallback;
    }

    return {
      name: String(user.name || "").trim(),
      avatar: String(user.profileImageUrl || "").trim()
    };
  }

  function createBowler(index, name = "", avatar = "") {
    return {
      id: "bowler-" + (index + 1),
      name: String(name || ""),
      style: "Right Arm Bowler",
      avatar: String(avatar || "")
    };
  }

  function resetActivePitchMapOnly() {
    [
      "creasevisionBowlers",
      "creasevisionSelectedBowlerIndex",
      "creasevisionBowlerMode",
      "creasevisionPitchDeliveries",
      "latestPitchMapInnings",
      "pitch_map_history_view_record_id"
    ].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }

  function initializeSetup() {
    resetActivePitchMapOnly();

    const profile = getCurrentAccountProfile();

    state.mode = "individual";
    state.selectedIndex = 0;
    state.bowlers = [createBowler(0, profile.name, profile.avatar)];
  }

  function currentBowler() {
    return state.bowlers[state.selectedIndex] || state.bowlers[0] || createBowler(0);
  }

  function isCurrentBowlerComplete() {
    return Boolean(String(currentBowler().name || "").trim());
  }

  function saveCurrentInputToState() {
    const bowler = currentBowler();
    bowler.name = String(bowlerName?.value || "").trim();
  }

  function saveStateToStorage() {
    const normalizedBowlers = state.bowlers.map((bowler, index) => ({
      id: String(bowler.id || "bowler-" + (index + 1)),
      name: String(bowler.name || "").trim(),
      style: bowler.style === "Left Arm Bowler" ? "Left Arm Bowler" : "Right Arm Bowler",
      avatar: String(bowler.avatar || "")
    }));

    const payload = JSON.stringify(normalizedBowlers);

    localStorage.setItem("creasevisionBowlerMode", state.mode);
    localStorage.setItem("creasevisionSelectedBowlerIndex", String(state.selectedIndex));
    localStorage.setItem("creasevisionBowlers", payload);

    sessionStorage.setItem("creasevisionBowlerMode", state.mode);
    sessionStorage.setItem("creasevisionSelectedBowlerIndex", String(state.selectedIndex));
    sessionStorage.setItem("creasevisionBowlers", payload);
  }

  function renderAvatar(target, bowler) {
    if (!target) {
      return;
    }

    target.innerHTML = "";
    target.classList.toggle("has-image", Boolean(bowler.avatar));

    const img = document.createElement("img");
    img.src = bowler.avatar || DEFAULT_AVATAR;
    img.alt = "Bowler profile";
    target.appendChild(img);
  }

  function renderList() {
    if (!bowlerList) {
      return;
    }

    bowlerList.innerHTML = "";

    state.bowlers.forEach((bowler, index) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "bowler-card" + (index === state.selectedIndex ? " active" : "");
      card.addEventListener("click", () => {
        saveCurrentInputToState();
        state.selectedIndex = index;
        render();
      });

      const avatar = document.createElement("div");
      avatar.className = "bowler-card-avatar" + (bowler.avatar ? " has-image" : "");
      renderAvatar(avatar, bowler);

      const meta = document.createElement("div");

      const name = document.createElement("p");
      name.className = "bowler-card-name";
      name.textContent = bowler.name || "Enter your name here";

      const style = document.createElement("p");
      style.className = "bowler-card-style";
      style.textContent = bowler.style.toUpperCase();

      meta.appendChild(name);
      meta.appendChild(style);
      card.appendChild(avatar);
      card.appendChild(meta);
      bowlerList.appendChild(card);
    });
  }

  function render() {
    const bowler = currentBowler();

    if (bowlerName) {
      bowlerName.value = bowler.name || "";
      bowlerName.placeholder = "Enter your name here";
      bowlerName.autocomplete = "off";
    }

    if (detailsTitle) {
      detailsTitle.textContent = "Bowler " + (state.selectedIndex + 1) + " Details";
    }

    if (individualMode) {
      individualMode.classList.toggle("active", state.mode === "individual");
      individualMode.setAttribute("aria-selected", String(state.mode === "individual"));
    }

    if (teamMode) {
      teamMode.classList.toggle("active", state.mode === "team");
      teamMode.setAttribute("aria-selected", String(state.mode === "team"));
    }

    if (rightArmBtn) {
      rightArmBtn.classList.toggle("active", bowler.style === "Right Arm Bowler");
    }

    if (leftArmBtn) {
      leftArmBtn.classList.toggle("active", bowler.style === "Left Arm Bowler");
    }

    if (addBowlerBtn) {
      addBowlerBtn.disabled = state.mode !== "team" || state.bowlers.length >= MAX_BOWLERS;
      addBowlerBtn.classList.toggle("disabled-btn", addBowlerBtn.disabled);
    }

    if (removeBowlerBtn) {
      removeBowlerBtn.disabled = state.mode !== "team" || state.bowlers.length <= 1;
      removeBowlerBtn.classList.toggle("disabled-btn", removeBowlerBtn.disabled);
    }

    if (confirmBtn) {
      confirmBtn.disabled = !isCurrentBowlerComplete();
      confirmBtn.classList.toggle("disabled-btn", confirmBtn.disabled);
    }

    if (bowlerCount) {
      bowlerCount.textContent = "Bowlers: " + state.bowlers.length + " / " + (state.mode === "team" ? MAX_BOWLERS : 1);
    }

    if (modeStatus) {
      modeStatus.textContent = state.mode === "team" ? "Team mode is active." : "Individual mode is active.";
    }

    if (selectorHelp) {
      selectorHelp.textContent = state.mode === "team"
        ? "Add and manage up to 11 bowlers."
        : "Switch to Team Mode to manage up to 11 bowlers.";
    }

    renderAvatar(avatarBox, bowler);
    renderList();
  }

  function setMode(mode) {
    saveCurrentInputToState();
    state.mode = mode;

    if (mode === "individual") {
      state.selectedIndex = 0;
      state.bowlers = [state.bowlers[0] || createBowler(0)];
    }

    if (mode === "team" && state.bowlers.length === 0) {
      state.bowlers = [createBowler(0)];
      state.selectedIndex = 0;
    }

    render();
  }

  function setStyle(style) {
    currentBowler().style = style === "Left Arm Bowler" ? "Left Arm Bowler" : "Right Arm Bowler";
    render();
  }

  function addBowler() {
    saveCurrentInputToState();

    if (state.mode !== "team" || state.bowlers.length >= MAX_BOWLERS) {
      return;
    }

    const created = createBowler(state.bowlers.length);
    state.bowlers.push(created);
    state.selectedIndex = state.bowlers.length - 1;

    render();
  }

  function removeBowler() {
    if (state.mode !== "team" || state.bowlers.length <= 1) {
      return;
    }

    state.bowlers.splice(state.selectedIndex, 1);
    state.selectedIndex = Math.max(0, state.selectedIndex - 1);

    render();
  }

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Unable to read selected image."));
      reader.readAsDataURL(file);
    });
  }

  async function uploadAvatar(file) {
    if (!file) {
      return;
    }

    try {
      currentBowler().avatar = await readImageFile(file);
      render();
    } catch {
      currentBowler().avatar = "";
      render();
    }
  }

  function resetAvatar() {
    if (avatarInput) {
      avatarInput.value = "";
    }

    currentBowler().avatar = "";
    render();
  }

  function confirmAndContinue() {
    saveCurrentInputToState();

    if (!isCurrentBowlerComplete()) {
      render();
      return;
    }

    if (state.mode === "individual") {
      state.selectedIndex = 0;
      state.bowlers = [currentBowler()];
    }

    saveStateToStorage();
    window.location.href = "pitch-map.html";
  }

  function bindEvents() {
    if (individualMode) {
      individualMode.addEventListener("click", () => setMode("individual"));
    }

    if (teamMode) {
      teamMode.addEventListener("click", () => setMode("team"));
    }

    if (rightArmBtn) {
      rightArmBtn.addEventListener("click", () => setStyle("Right Arm Bowler"));
    }

    if (leftArmBtn) {
      leftArmBtn.addEventListener("click", () => setStyle("Left Arm Bowler"));
    }

    if (addBowlerBtn) {
      addBowlerBtn.addEventListener("click", addBowler);
    }

    if (removeBowlerBtn) {
      removeBowlerBtn.addEventListener("click", removeBowler);
    }

    if (confirmBtn) {
      confirmBtn.addEventListener("click", confirmAndContinue);
    }

    if (uploadAvatarBtn && avatarInput) {
      uploadAvatarBtn.addEventListener("click", () => avatarInput.click());
    }

    if (resetAvatarBtn) {
      resetAvatarBtn.addEventListener("click", resetAvatar);
    }

    if (avatarInput) {
      avatarInput.addEventListener("change", (event) => {
        uploadAvatar(event.target.files?.[0]);
      });
    }

    if (bowlerName) {
      bowlerName.addEventListener("input", () => {
        currentBowler().name = String(bowlerName.value || "").trim();
        renderList();

        if (confirmBtn) {
          confirmBtn.disabled = !isCurrentBowlerComplete();
          confirmBtn.classList.toggle("disabled-btn", confirmBtn.disabled);
        }
      });
    }
  }

  function init() {
    initializeSetup();
    bindEvents();
    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
