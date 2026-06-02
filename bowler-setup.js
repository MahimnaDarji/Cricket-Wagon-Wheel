function safeParseJson(value, fallback) {
  try {
    const parsed = value ? JSON.parse(value) : fallback;
    return parsed || fallback;
  } catch {
    return fallback;
  }
}

function cleanIdentityName(value) {
  const name = String(value || "").trim();
  const blocked = [
    "abc",
    "bowler",
    "bowler 1",
    "player",
    "player 1",
    "melbourne cricket ground",
    "custom ground",
    "practice session"
  ];

  if (!name || blocked.includes(name.toLowerCase())) {
    return "";
  }

  return name;
}

function getProfileIdentityOnly() {
  const keys = [
    "cww_session_user",
    "creasevisionUserProfile",
    "currentUser"
  ];

  for (const key of keys) {
    const value = safeParseJson(localStorage.getItem(key), null);

    if (value && typeof value === "object") {
      const name = cleanIdentityName(value.name);
      const avatar = String(value.profileImageUrl || value.avatar || "").trim();

      if (name || avatar) {
        return { name, avatar };
      }
    }
  }

  return {
    name: cleanIdentityName(localStorage.getItem("profileName")),
    avatar: String(localStorage.getItem("profileImageUrl") || "").trim()
  };
}

function saveIdentityToPlayerAndBowlerSetup(identity, battingStyle, bowlingStyle) {
  const finalName = cleanIdentityName(identity && identity.name) || "Player";
  const finalAvatar = String(identity && identity.avatar || "").trim();

  const playerSetup = {
    mode: "individual",
    players: [
      {
        id: "player-1",
        name: finalName,
        battingStyle: battingStyle || "right",
        avatar: finalAvatar
      }
    ],
    confirmedAt: new Date().toISOString()
  };

  const bowlerSetup = [
    {
      id: "bowler-1",
      name: finalName,
      style: bowlingStyle || "Right Arm Bowler",
      avatar: finalAvatar
    }
  ];

  localStorage.setItem("playerSetup", JSON.stringify(playerSetup));
  localStorage.setItem("creasevisionBowlerMode", "individual");
  localStorage.setItem("creasevisionSelectedBowlerIndex", "0");
  localStorage.setItem("creasevisionBowlers", JSON.stringify(bowlerSetup));
}


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

function getSavedBowlerStyle() {
  try {
    const bowlers = JSON.parse(localStorage.getItem("creasevisionBowlers") || "[]");
    const selectedIndex = Number(localStorage.getItem("creasevisionSelectedBowlerIndex") || "0");
    const savedStyle = String(bowlers[selectedIndex]?.style || bowlers[0]?.style || "").trim();

    if (savedStyle === "Left Arm Bowler" || savedStyle === "Right Arm Bowler") {
      return savedStyle;
    }
  } catch {}

  return "Right Arm Bowler";
}

const state = {
  mode: "individual",
  selectedIndex: 0,
  bowlers: []
};

function getBowlerIdentity() {
  const profile = getProfileIdentityOnly();

  if (profile.name || profile.avatar) {
    return profile;
  }

  const playerSetup = safeParseJson(localStorage.getItem("playerSetup"), {});
  const firstPlayer = Array.isArray(playerSetup.players) ? playerSetup.players[0] : null;

  return {
    name: cleanIdentityName(firstPlayer?.name) || "Bowler",
    avatar: String(firstPlayer?.avatar || "").trim()
  };
}

function loadState() {
  const identity = getBowlerIdentity();

  state.mode = localStorage.getItem("creasevisionBowlerMode") === "team" ? "team" : "individual";
  state.selectedIndex = 0;

  const firstBowler = {
    id: "bowler-1",
    name: identity.name || "Bowler",
    style: getSavedBowlerStyle(),
    avatar: identity.avatar || ""
  };

  if (state.mode === "team") {
    const saved = safeParseJson(localStorage.getItem("creasevisionBowlers"), []);
    const savedList = Array.isArray(saved) ? saved : [];
    state.bowlers = savedList.length > 0 ? savedList : [firstBowler];
    state.bowlers[0] = {
      ...state.bowlers[0],
      name: firstBowler.name,
      avatar: firstBowler.avatar
    };
  } else {
    state.bowlers = [firstBowler];
  }

  saveState();
}

function saveState() {
  localStorage.setItem("creasevisionBowlerMode", state.mode);
  localStorage.setItem("creasevisionSelectedBowlerIndex", String(state.selectedIndex));
  localStorage.setItem("creasevisionBowlers", JSON.stringify(state.bowlers));
}

function currentBowler() {
  return state.bowlers[state.selectedIndex] || state.bowlers[0];
}

function saveCurrentInput() {
  const bowler = currentBowler();
  bowler.name = cleanIdentityName(bowlerName.value) || "Bowler";
  saveState();
}

function renderAvatar(target, bowler) {
  if (!target) return;

  target.innerHTML = "";
  target.classList.toggle("has-image", Boolean(bowler.avatar));

  if (bowler.avatar) {
    const img = document.createElement("img");
    img.src = bowler.avatar;
    img.alt = bowler.name + " profile";
    target.appendChild(img);
  } else {
    target.appendChild(document.createElement("span"));
  }
}

function renderList() {
  bowlerList.innerHTML = "";

  state.bowlers.forEach((bowler, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "bowler-card" + (index === state.selectedIndex ? " active" : "");
    card.addEventListener("click", () => {
      saveCurrentInput();
      state.selectedIndex = index;
      saveState();
      render();
    });

    const avatar = document.createElement("div");
    avatar.className = "bowler-card-avatar" + (bowler.avatar ? " has-image" : "");
    renderAvatar(avatar, bowler);

    const meta = document.createElement("div");

    const name = document.createElement("p");
    name.className = "bowler-card-name";
    name.textContent = bowler.name;

    const style = document.createElement("p");
    style.className = "bowler-card-style";
    style.textContent = bowler.style;

    meta.appendChild(name);
    meta.appendChild(style);
    card.appendChild(avatar);
    card.appendChild(meta);
    bowlerList.appendChild(card);
  });
}

function render() {
  const bowler = currentBowler();

  bowlerName.value = bowler.name;
  detailsTitle.textContent = "Bowler " + (state.selectedIndex + 1) + " Details";

  individualMode.classList.toggle("active", state.mode === "individual");
  teamMode.classList.toggle("active", state.mode === "team");

  rightArmBtn.classList.toggle("active", bowler.style === "Right Arm Bowler");
  leftArmBtn.classList.toggle("active", bowler.style === "Left Arm Bowler");

  addBowlerBtn.disabled = state.mode !== "team" || state.bowlers.length >= MAX_BOWLERS;
  removeBowlerBtn.disabled = state.mode !== "team" || state.bowlers.length <= 1;
  addBowlerBtn.classList.toggle("disabled-btn", addBowlerBtn.disabled);
  removeBowlerBtn.classList.toggle("disabled-btn", removeBowlerBtn.disabled);

  bowlerCount.textContent = "Bowlers: " + state.bowlers.length + " / " + (state.mode === "team" ? MAX_BOWLERS : 1);
  modeStatus.textContent = state.mode === "team" ? "Team mode is active." : "Individual mode is active.";
  selectorHelp.textContent = state.mode === "team" ? "Add and manage up to 11 bowlers." : "Switch to Team Mode to manage up to 11 bowlers.";

  renderAvatar(avatarBox, bowler);
  renderList();
}

function setMode(mode) {
  saveCurrentInput();
  state.mode = mode;

  if (mode === "individual") {
    const identity = getBowlerIdentity();
    state.selectedIndex = 0;
    state.bowlers = [
      {
        id: "bowler-1",
        name: identity.name || "Bowler",
        style: currentBowler()?.style || "Right Arm Bowler",
        avatar: identity.avatar || ""
      }
    ];
  }

  saveState();
  render();
}

function setStyle(style) {
  currentBowler().style = style;
  saveState();
  render();
}

function addBowler() {
  saveCurrentInput();

  if (state.mode !== "team" || state.bowlers.length >= MAX_BOWLERS) return;

  state.bowlers.push({
    id: "bowler-" + (state.bowlers.length + 1),
    name: "Bowler " + (state.bowlers.length + 1),
    style: getSavedBowlerStyle(),
    avatar: ""
  });

  state.selectedIndex = state.bowlers.length - 1;
  saveState();
  render();
}

function removeBowler() {
  if (state.mode !== "team" || state.bowlers.length <= 1) return;

  state.bowlers.splice(state.selectedIndex, 1);
  state.selectedIndex = Math.max(0, state.selectedIndex - 1);
  saveState();
  render();
}

function uploadAvatar(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    currentBowler().avatar = String(reader.result || "");
    saveState();
    render();
  };
  reader.readAsDataURL(file);
}

function confirmAndContinue() {
  saveCurrentInput();

  if (state.mode === "individual") {
    state.bowlers = [currentBowler()];
    state.selectedIndex = 0;
  }

  saveState();
  window.location.href = "pitch-map.html";
}

individualMode.addEventListener("click", () => setMode("individual"));
teamMode.addEventListener("click", () => setMode("team"));
rightArmBtn.addEventListener("click", () => setStyle("Right Arm Bowler"));
leftArmBtn.addEventListener("click", () => setStyle("Left Arm Bowler"));
addBowlerBtn.addEventListener("click", addBowler);
removeBowlerBtn.addEventListener("click", removeBowler);
confirmBtn.addEventListener("click", confirmAndContinue);
uploadAvatarBtn.addEventListener("click", () => avatarInput.click());

resetAvatarBtn.addEventListener("click", () => {
  currentBowler().avatar = "";
  saveState();
  render();
});

avatarInput.addEventListener("change", (event) => uploadAvatar(event.target.files[0]));

bowlerName.addEventListener("input", () => {
  currentBowler().name = cleanIdentityName(bowlerName.value) || "Bowler";
  saveState();
  renderList();
});

loadState();
render();


function forceSaveBowlerStyle(style) {
  const finalStyle = style === "Left Arm Bowler" ? "Left Arm Bowler" : "Right Arm Bowler";

  let bowlers = [];
  try {
    const parsed = JSON.parse(localStorage.getItem("creasevisionBowlers") || "[]");
    bowlers = Array.isArray(parsed) ? parsed : [];
  } catch {
    bowlers = [];
  }

  const selectedIndex = Number(localStorage.getItem("creasevisionSelectedBowlerIndex") || "0");
  const safeIndex = Number.isInteger(selectedIndex) && selectedIndex >= 0 ? selectedIndex : 0;
  const existing = bowlers[safeIndex] || bowlers[0] || {};

  const nameInput = document.getElementById("bowler-name");
  const avatarImage = document.querySelector(".bowler-avatar img");

  bowlers[safeIndex] = {
    ...existing,
    id: String(existing.id || "bowler-1"),
    name: String(nameInput?.value || existing.name || "Bowler").trim(),
    style: finalStyle,
    avatar: String(avatarImage?.src || existing.avatar || "")
  };

  localStorage.setItem("creasevisionBowlerMode", localStorage.getItem("creasevisionBowlerMode") || "individual");
  localStorage.setItem("creasevisionSelectedBowlerIndex", String(safeIndex));
  localStorage.setItem("creasevisionBowlers", JSON.stringify(bowlers));

  const rightButton = document.getElementById("right-arm-btn");
  const leftButton = document.getElementById("left-arm-btn");

  if (rightButton) {
    rightButton.classList.toggle("active", finalStyle === "Right Arm Bowler");
  }

  if (leftButton) {
    leftButton.classList.toggle("active", finalStyle === "Left Arm Bowler");
  }

  document.querySelectorAll(".bowler-card-style").forEach((element, index) => {
    if (index === safeIndex || index === 0) {
      element.textContent = finalStyle.toUpperCase();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const rightButton = document.getElementById("right-arm-btn");
  const leftButton = document.getElementById("left-arm-btn");
  const confirmButton = document.getElementById("confirm-btn");

  const savedStyle = getSavedBowlerStyle();
  forceSaveBowlerStyle(savedStyle);

  if (rightButton) {
    rightButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      forceSaveBowlerStyle("Right Arm Bowler");
    }, true);
  }

  if (leftButton) {
    leftButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      forceSaveBowlerStyle("Left Arm Bowler");
    }, true);
  }

  if (confirmButton) {
    confirmButton.addEventListener("click", (event) => {
      const selectedStyle = document.getElementById("left-arm-btn")?.classList.contains("active")
        ? "Left Arm Bowler"
        : "Right Arm Bowler";

      event.preventDefault();
      event.stopImmediatePropagation();

      forceSaveBowlerStyle(selectedStyle);
      window.location.href = "pitch-map.html";
    }, true);
  }
});
