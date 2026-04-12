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
  TEAM: "team",
};

const STYLE = {
  RIGHT: "right",
  LEFT: "left",
};

const TEAM_MIN_PLAYERS = 3;
const TEAM_MAX_PLAYERS = 11;
let nextPlayerId = 1;
let profileDefaultName = "";
let profileDefaultImageUrl = "";
let hasManualIndividualNameEdit = false;
let hasManualIndividualAvatarEdit = false;

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
  mode: MODES.INDIVIDUAL,
  individualPlayer: createPlayer("Player 1"),
  teamPlayers: [createPlayer("Player 1"), createPlayer("Player 2"), createPlayer("Player 3")],
  selectedTeamPlayerId: null,
};

state.selectedTeamPlayerId = state.teamPlayers[0].id;

function createPlayer(defaultName) {
  const player = {
    id: `player-${nextPlayerId}`,
    name: defaultName,
    battingStyle: STYLE.RIGHT,
    avatar: "",
  };

  nextPlayerId += 1;
  return player;
}

function getActivePlayers() {
  if (state.mode === MODES.INDIVIDUAL) {
    return [state.individualPlayer];
  }

  return state.teamPlayers;
}

function getSelectedPlayer() {
  if (state.mode === MODES.INDIVIDUAL) {
    return state.individualPlayer;
  }

  const selected = state.teamPlayers.find((player) => player.id === state.selectedTeamPlayerId);
  return selected || state.teamPlayers[0];
}

function getAvatarSource(player) {
  return player.avatar || DEFAULT_AVATAR;
}

function sanitizeProfileName(value) {
  return String(value || "").trim();
}

function sanitizeProfileImage(value) {
  return String(value || "").trim();
}

function isInitialIndividualName(value) {
  const name = String(value || "").trim();
  return name === "" || /^player\s*1$/i.test(name);
}

function applyProfileNameToIndividualIfEligible() {
  if (!profileDefaultName || hasManualIndividualNameEdit) {
    return;
  }

  const currentName = String(state.individualPlayer?.name || "").trim();
  if (!isInitialIndividualName(currentName) && currentName !== profileDefaultName) {
    return;
  }

  state.individualPlayer.name = profileDefaultName;
}

function applyProfileAvatarToIndividualIfEligible() {
  if (!profileDefaultImageUrl || hasManualIndividualAvatarEdit) {
    return;
  }

  const currentAvatar = String(state.individualPlayer?.avatar || "").trim();
  if (currentAvatar && currentAvatar !== profileDefaultImageUrl) {
    return;
  }

  state.individualPlayer.avatar = profileDefaultImageUrl;
}

async function loadProfileDefaults() {
  const user = await window.CWWAuth?.getSessionUser?.();
  profileDefaultName = sanitizeProfileName(user?.name);
  profileDefaultImageUrl = sanitizeProfileImage(user?.profileImageUrl);

  applyProfileNameToIndividualIfEligible();
  applyProfileAvatarToIndividualIfEligible();
}

function getStyleLabel(style) {
  return style === STYLE.LEFT ? "Left-Handed Batter" : "Right-Handed Batter";
}

function isValidBattingStyle(style) {
  return style === STYLE.RIGHT || style === STYLE.LEFT;
}

function isPlayerComplete(player) {
  if (!player) {
    return false;
  }

  const hasName = String(player.name || "").trim().length > 0;
  return hasName && isValidBattingStyle(player.battingStyle);
}

function canConfirmCurrentSetup() {
  if (state.mode === MODES.INDIVIDUAL) {
    return isPlayerComplete(state.individualPlayer);
  }

  const hasMinimumPlayers = state.teamPlayers.length >= TEAM_MIN_PLAYERS;
  if (!hasMinimumPlayers) {
    return false;
  }

  return state.teamPlayers.every((player) => isPlayerComplete(player));
}

function getNextPagePath() {
  const params = new URLSearchParams(window.location.search);
  const next = String(params.get("next") || "").trim();
  return next || "review.html";
}

function savePlayerSetup() {
  const payload = {
    mode: state.mode,
    players:
      state.mode === MODES.INDIVIDUAL
        ? [state.individualPlayer]
        : state.teamPlayers,
    confirmedAt: new Date().toISOString(),
  };

  localStorage.setItem("playerSetup", JSON.stringify(payload));
}

function confirmAndContinue() {
  if (!canConfirmCurrentSetup()) {
    return;
  }

  savePlayerSetup();
  window.location.href = getNextPagePath();
}

function setMode(nextMode) {
  state.mode = nextMode;

  const individualActive = nextMode === MODES.INDIVIDUAL;
  modeIndividualButton.classList.toggle("active", individualActive);
  modeIndividualButton.setAttribute("aria-selected", String(individualActive));
  modeTeamButton.classList.toggle("active", !individualActive);
  modeTeamButton.setAttribute("aria-selected", String(!individualActive));

  if (!individualActive && !state.teamPlayers.some((player) => player.id === state.selectedTeamPlayerId)) {
    state.selectedTeamPlayerId = state.teamPlayers[0]?.id || null;
  }

  if (individualActive) {
    applyProfileNameToIndividualIfEligible();
    applyProfileAvatarToIndividualIfEligible();
  }

  render();
}

function updatePlayerName(name) {
  const selected = getSelectedPlayer();
  if (!selected) {
    return;
  }

  selected.name = name;
  render();
}

function updateBattingStyle(style) {
  const selected = getSelectedPlayer();
  if (!selected) {
    return;
  }

  selected.battingStyle = style;
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

  const created = createPlayer(`Player ${state.teamPlayers.length + 1}`);
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
    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.readAsDataURL(file);
  });
}

function renderAvatar(player) {
  avatarPreview.src = getAvatarSource(player);
}

function renderBattingButtons(player) {
  const rightActive = player.battingStyle !== STYLE.LEFT;
  battingRightButton.classList.toggle("active", rightActive);
  battingRightButton.setAttribute("aria-checked", String(rightActive));
  battingLeftButton.classList.toggle("active", !rightActive);
  battingLeftButton.setAttribute("aria-checked", String(!rightActive));
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
  const label = inTeamMode ? `Player ${selectedIndex} Details` : "Player 1 Details";

  playerCardTitle.textContent = label;
  playerFormNote.textContent = inTeamMode
    ? `Editing ${selected.name || `Player ${selectedIndex}`}. Team must stay between ${TEAM_MIN_PLAYERS} and ${TEAM_MAX_PLAYERS} players.`
    : "Individual mode is active.";
}

function renderRosterControls() {
  const inTeamMode = state.mode === MODES.TEAM;
  const activePlayers = getActivePlayers();

  rosterCount.textContent = inTeamMode
    ? `Players: ${activePlayers.length} / ${TEAM_MAX_PLAYERS}`
    : "Players: 1 / 1";

  rosterNote.textContent = inTeamMode
    ? "Select a player card to edit that player."
    : "Switch to Team Mode to manage up to 11 players.";

  addPlayerButton.disabled = !inTeamMode || activePlayers.length >= TEAM_MAX_PLAYERS;
  removePlayerButton.disabled = !inTeamMode || activePlayers.length <= TEAM_MIN_PLAYERS;
  confirmContinueButton.disabled = !canConfirmCurrentSetup();
}

function renderRoster() {
  const activePlayers = getActivePlayers();
  const inTeamMode = state.mode === MODES.TEAM;

  playerList.innerHTML = "";

  activePlayers.forEach((player, index) => {
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
    avatar.alt = `${player.name || `Player ${index + 1}`} avatar`;

    const meta = document.createElement("span");
    meta.className = "player-item-meta";

    const name = document.createElement("span");
    name.className = "player-item-name";
    name.textContent = player.name || `Player ${index + 1}`;

    const style = document.createElement("span");
    style.className = "player-item-style";
    style.textContent = getStyleLabel(player.battingStyle);

    meta.appendChild(name);
    meta.appendChild(style);
    item.appendChild(avatar);
    item.appendChild(meta);

    if (inTeamMode) {
      item.addEventListener("click", () => {
        selectPlayer(player.id);
      });
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

  playerNameInput.value = selected.name;
  renderAvatar(selected);
  renderBattingButtons(selected);
}

function render() {
  renderForm();
  renderTitlesAndNotes();
  renderRosterControls();
  renderRoster();
}

modeIndividualButton.addEventListener("click", () => {
  setMode(MODES.INDIVIDUAL);
});

modeTeamButton.addEventListener("click", () => {
  setMode(MODES.TEAM);
});

addPlayerButton.addEventListener("click", () => {
  addPlayer();
});

removePlayerButton.addEventListener("click", () => {
  removeSelectedPlayer();
});

playerNameInput.addEventListener("input", (event) => {
  const target = event.target;
  if (!target) {
    return;
  }

  if (state.mode === MODES.INDIVIDUAL) {
    hasManualIndividualNameEdit = true;
  }

  updatePlayerName(target.value);
});

battingRightButton.addEventListener("click", () => {
  updateBattingStyle(STYLE.RIGHT);
});

battingLeftButton.addEventListener("click", () => {
  updateBattingStyle(STYLE.LEFT);
});

avatarInput.addEventListener("change", async (event) => {
  const target = event.target;
  const file = target?.files?.[0];

  if (!file) {
    return;
  }

  try {
    const imageDataUrl = await readImageFile(file);
    if (state.mode === MODES.INDIVIDUAL) {
      hasManualIndividualAvatarEdit = true;
    }
    updateAvatar(imageDataUrl);
  } catch (_error) {
    updateAvatar("");
  }
});

clearAvatarButton.addEventListener("click", () => {
  avatarInput.value = "";
  if (state.mode === MODES.INDIVIDUAL) {
    hasManualIndividualAvatarEdit = true;
  }
  updateAvatar("");
});

confirmContinueButton.addEventListener("click", () => {
  confirmAndContinue();
});

async function init() {
  await loadProfileDefaults();
  render();
}

init();
