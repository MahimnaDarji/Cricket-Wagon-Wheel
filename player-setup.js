(() => {
  "use strict";

  const modeIndividualButton = document.getElementById("mode-individual");
  const modeTeamButton = document.getElementById("mode-team");
  const addPlayerButton = document.getElementById("add-player");
  const removePlayerButton = document.getElementById("remove-player");

  const playerCardTitle = document.getElementById("player-card-title");
  const playerNameInput = document.getElementById("player-name");
  const avatarInput = document.getElementById("player-avatar");
  const avatarPreview = document.getElementById("avatar-preview");
  const clearAvatarButton = document.getElementById("clear-avatar");

  const battingRightButton = document.getElementById("batting-right");
  const battingLeftButton = document.getElementById("batting-left");

  const rosterCount = document.getElementById("roster-count");
  const rosterNote = document.getElementById("roster-note");
  const playerFormNote = document.getElementById("player-form-note");
  const playerList = document.getElementById("player-list");
  const confirmContinueButton = document.getElementById("confirm-continue");

  const MODES = {
    INDIVIDUAL: "individual",
    TEAM: "team"
  };

  const STYLE = {
    RIGHT: "right",
    LEFT: "left"
  };

  const TEAM_MIN_PLAYERS = 3;
  const TEAM_MAX_PLAYERS = 11;

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

  let nextPlayerId = 1;

  const state = {
    mode: MODES.INDIVIDUAL,
    individualPlayer: null,
    teamPlayers: [],
    selectedTeamPlayerId: null
  };

  function safeParse(value, fallback = null) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function waitForAuth(callback, attempts = 0) {
    if (window.CWWAuth && typeof window.CWWAuth.getSessionUserSync === "function") {
      callback();
      return;
    }

    if (attempts > 80) {
      callback();
      return;
    }

    window.setTimeout(() => {
      waitForAuth(callback, attempts + 1);
    }, 50);
  }

  function getCurrentAccountProfile() {
    if (window.CWWAuth && typeof window.CWWAuth.getSessionUserSync === "function") {
      const user = window.CWWAuth.getSessionUserSync();

      if (user) {
        return {
          name: String(user.name || "").trim(),
          avatar: String(user.profileImageUrl || "").trim()
        };
      }
    }

    const fallbackUser =
      safeParse(sessionStorage.getItem("cv_session_user_v1"), null) ||
      safeParse(localStorage.getItem("cww_session_user"), null) ||
      safeParse(localStorage.getItem("currentUser"), null) ||
      safeParse(localStorage.getItem("creasevisionUserProfile"), null) ||
      {};

    return {
      name: String(fallbackUser.name || "").trim(),
      avatar: String(fallbackUser.profileImageUrl || fallbackUser.avatar || "").trim()
    };
  }

  function createPlayer(name = "", avatar = "") {
    const player = {
      id: "player-" + nextPlayerId,
      name: String(name || ""),
      battingStyle: STYLE.RIGHT,
      avatar: String(avatar || "")
    };

    nextPlayerId += 1;
    return player;
  }

  function clearOnlyActiveWagonWheelSession() {
    sessionStorage.removeItem("wagonWheelInnings");
    localStorage.removeItem("wagonWheelInnings");
    sessionStorage.removeItem("cww_history_view_record_id");
    localStorage.removeItem("cww_history_view_record_id");
    sessionStorage.removeItem("cww_history_auto_export");
    localStorage.removeItem("cww_history_auto_export");
  }

  function initializeSetup() {
    clearOnlyActiveWagonWheelSession();

    nextPlayerId = 1;

    const profile = getCurrentAccountProfile();

    state.mode = MODES.INDIVIDUAL;
    state.individualPlayer = createPlayer(profile.name, profile.avatar);
    state.teamPlayers = [
      createPlayer(profile.name, profile.avatar),
      createPlayer("", ""),
      createPlayer("", "")
    ];
    state.selectedTeamPlayerId = state.teamPlayers[0].id;
  }

  function getActivePlayers() {
    return state.mode === MODES.INDIVIDUAL ? [state.individualPlayer] : state.teamPlayers;
  }

  function getSelectedPlayer() {
    if (state.mode === MODES.INDIVIDUAL) {
      return state.individualPlayer;
    }

    return state.teamPlayers.find((player) => player.id === state.selectedTeamPlayerId) || state.teamPlayers[0] || null;
  }

  function getAvatarSource(player) {
    return player && player.avatar ? player.avatar : DEFAULT_AVATAR;
  }

  function getStyleLabel(style) {
    return style === STYLE.LEFT ? "Left-Handed Batter" : "Right-Handed Batter";
  }

  function isValidBattingStyle(style) {
    return style === STYLE.RIGHT || style === STYLE.LEFT;
  }

  function isPlayerComplete(player) {
    return Boolean(player && String(player.name || "").trim() && isValidBattingStyle(player.battingStyle));
  }

  function canConfirmCurrentSetup() {
    if (state.mode === MODES.INDIVIDUAL) {
      return isPlayerComplete(state.individualPlayer);
    }

    return state.teamPlayers.length >= TEAM_MIN_PLAYERS && state.teamPlayers.every(isPlayerComplete);
  }

  function getNextPagePath() {
    const params = new URLSearchParams(window.location.search);
    const next = String(params.get("next") || "").trim();

    if (next) {
      return next;
    }

    return "review.html";
  }

  function savePlayerSetup() {
    const players = state.mode === MODES.INDIVIDUAL ? [state.individualPlayer] : state.teamPlayers;

    const payload = {
      mode: state.mode,
      players: players.map((player, index) => ({
        id: String(player.id || "player-" + (index + 1)),
        name: String(player.name || "").trim(),
        battingStyle: isValidBattingStyle(player.battingStyle) ? player.battingStyle : STYLE.RIGHT,
        avatar: String(player.avatar || "")
      })),
      confirmedAt: new Date().toISOString()
    };

    sessionStorage.setItem("playerSetup", JSON.stringify(payload));
    localStorage.setItem("playerSetup", JSON.stringify(payload));

    return payload;
  }

  function confirmAndContinue(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!canConfirmCurrentSetup()) {
      render();
      if (playerNameInput && state.mode === MODES.INDIVIDUAL) {
        playerNameInput.focus();
      }
      return;
    }

    savePlayerSetup();
    clearOnlyActiveWagonWheelSession();

    window.location.assign(getNextPagePath());
  }

  function setMode(nextMode) {
    state.mode = nextMode;

    const individualActive = nextMode === MODES.INDIVIDUAL;

    if (modeIndividualButton) {
      modeIndividualButton.classList.toggle("active", individualActive);
      modeIndividualButton.setAttribute("aria-selected", String(individualActive));
    }

    if (modeTeamButton) {
      modeTeamButton.classList.toggle("active", !individualActive);
      modeTeamButton.setAttribute("aria-selected", String(!individualActive));
    }

    if (!individualActive && !state.teamPlayers.some((player) => player.id === state.selectedTeamPlayerId)) {
      state.selectedTeamPlayerId = state.teamPlayers[0]?.id || null;
    }

    render();
  }

  function updatePlayerName(name) {
    const selected = getSelectedPlayer();

    if (!selected) {
      return;
    }

    selected.name = String(name || "");
    render();
  }

  function updateBattingStyle(style) {
    const selected = getSelectedPlayer();

    if (!selected) {
      return;
    }

    selected.battingStyle = isValidBattingStyle(style) ? style : STYLE.RIGHT;
    render();
  }

  function updateAvatar(dataUrl) {
    const selected = getSelectedPlayer();

    if (!selected) {
      return;
    }

    selected.avatar = dataUrl || "";
    render();
  }

  function addPlayer() {
    if (state.mode !== MODES.TEAM || state.teamPlayers.length >= TEAM_MAX_PLAYERS) {
      return;
    }

    const created = createPlayer("", "");
    state.teamPlayers.push(created);
    state.selectedTeamPlayerId = created.id;
    render();
  }

  function removeSelectedPlayer() {
    if (state.mode !== MODES.TEAM || state.teamPlayers.length <= TEAM_MIN_PLAYERS) {
      return;
    }

    const selectedIndex = state.teamPlayers.findIndex((player) => player.id === state.selectedTeamPlayerId);

    if (selectedIndex === -1) {
      return;
    }

    state.teamPlayers.splice(selectedIndex, 1);

    const safeIndex = Math.min(selectedIndex, state.teamPlayers.length - 1);
    state.selectedTeamPlayerId = state.teamPlayers[safeIndex].id;

    render();
  }

  function selectPlayer(playerId) {
    if (state.mode !== MODES.TEAM) {
      return;
    }

    state.selectedTeamPlayerId = playerId;
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

  function renderAvatar(player) {
    if (!avatarPreview) {
      return;
    }

    avatarPreview.src = getAvatarSource(player);
  }

  function renderBattingButtons(player) {
    const rightActive = player.battingStyle !== STYLE.LEFT;

    if (battingRightButton) {
      battingRightButton.classList.toggle("active", rightActive);
      battingRightButton.setAttribute("aria-checked", String(rightActive));
    }

    if (battingLeftButton) {
      battingLeftButton.classList.toggle("active", !rightActive);
      battingLeftButton.setAttribute("aria-checked", String(!rightActive));
    }
  }

  function renderTitlesAndNotes() {
    const selected = getSelectedPlayer();

    if (!selected) {
      return;
    }

    const inTeamMode = state.mode === MODES.TEAM;
    const selectedIndex = inTeamMode
      ? state.teamPlayers.findIndex((player) => player.id === selected.id) + 1
      : 1;

    if (playerCardTitle) {
      playerCardTitle.textContent = inTeamMode ? "Player " + selectedIndex + " Details" : "Player 1 Details";
    }

    if (playerFormNote) {
      playerFormNote.textContent = inTeamMode
        ? "Editing " + (selected.name || "Player " + selectedIndex) + ". Team must stay between " + TEAM_MIN_PLAYERS + " and " + TEAM_MAX_PLAYERS + " players."
        : "Individual mode is active.";
    }
  }

  function renderRosterControls() {
    const inTeamMode = state.mode === MODES.TEAM;
    const activePlayers = getActivePlayers();

    if (rosterCount) {
      rosterCount.textContent = inTeamMode
        ? "Players: " + activePlayers.length + " / " + TEAM_MAX_PLAYERS
        : "Players: 1 / 1";
    }

    if (rosterNote) {
      rosterNote.textContent = inTeamMode
        ? "Select a player card to edit that player."
        : "Switch to Team Mode to manage up to 11 players.";
    }

    if (addPlayerButton) {
      addPlayerButton.disabled = !inTeamMode || activePlayers.length >= TEAM_MAX_PLAYERS;
    }

    if (removePlayerButton) {
      removePlayerButton.disabled = !inTeamMode || activePlayers.length <= TEAM_MIN_PLAYERS;
    }

    if (confirmContinueButton) {
      const disabled = !canConfirmCurrentSetup();
      confirmContinueButton.disabled = disabled;
      confirmContinueButton.classList.toggle("disabled-btn", disabled);
      confirmContinueButton.setAttribute("aria-disabled", String(disabled));
    }
  }

  function renderRoster() {
    if (!playerList) {
      return;
    }

    const activePlayers = getActivePlayers();
    const inTeamMode = state.mode === MODES.TEAM;

    playerList.innerHTML = "";

    activePlayers.forEach((player) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "player-item";
      item.setAttribute("role", "option");

      const isSelected = inTeamMode ? player.id === state.selectedTeamPlayerId : true;
      item.classList.toggle("active", isSelected);
      item.setAttribute("aria-selected", String(isSelected));

      const avatar = document.createElement("img");
      avatar.className = "player-item-avatar";
      avatar.src = getAvatarSource(player);
      avatar.alt = "Player avatar";

      const meta = document.createElement("span");
      meta.className = "player-item-meta";

      const name = document.createElement("span");
      name.className = "player-item-name";
      name.textContent = player.name || "Enter your name here";

      const style = document.createElement("span");
      style.className = "player-item-style";
      style.textContent = getStyleLabel(player.battingStyle);

      meta.appendChild(name);
      meta.appendChild(style);
      item.appendChild(avatar);
      item.appendChild(meta);

      if (inTeamMode) {
        item.addEventListener("click", () => selectPlayer(player.id));
      } else {
        item.disabled = true;
      }

      playerList.appendChild(item);
    });
  }

  function renderForm() {
    const selected = getSelectedPlayer();

    if (!selected) {
      return;
    }

    if (playerNameInput && playerNameInput.value !== selected.name) {
      playerNameInput.value = selected.name || "";
      playerNameInput.placeholder = "Enter your name here";
      playerNameInput.autocomplete = "off";
    }

    renderAvatar(selected);
    renderBattingButtons(selected);
  }

  function render() {
    renderForm();
    renderTitlesAndNotes();
    renderRosterControls();
    renderRoster();
  }

  function bindEvents() {
    if (modeIndividualButton) {
      modeIndividualButton.addEventListener("click", () => setMode(MODES.INDIVIDUAL));
    }

    if (modeTeamButton) {
      modeTeamButton.addEventListener("click", () => setMode(MODES.TEAM));
    }

    if (addPlayerButton) {
      addPlayerButton.addEventListener("click", addPlayer);
    }

    if (removePlayerButton) {
      removePlayerButton.addEventListener("click", removeSelectedPlayer);
    }

    if (playerNameInput) {
      playerNameInput.addEventListener("input", (event) => updatePlayerName(event.target.value));
    }

    if (battingRightButton) {
      battingRightButton.addEventListener("click", () => updateBattingStyle(STYLE.RIGHT));
    }

    if (battingLeftButton) {
      battingLeftButton.addEventListener("click", () => updateBattingStyle(STYLE.LEFT));
    }

    if (avatarInput) {
      avatarInput.addEventListener("change", async (event) => {
        const file = event.target?.files?.[0];

        if (!file) {
          return;
        }

        try {
          const imageDataUrl = await readImageFile(file);
          updateAvatar(imageDataUrl);
        } catch {
          updateAvatar("");
        }
      });
    }

    if (clearAvatarButton) {
      clearAvatarButton.addEventListener("click", () => {
        if (avatarInput) {
          avatarInput.value = "";
        }

        updateAvatar("");
      });
    }

    if (confirmContinueButton) {
      confirmContinueButton.addEventListener("click", confirmAndContinue);
    }
  }

  function init() {
    initializeSetup();
    bindEvents();
    render();
  }

  waitForAuth(init);
})();
