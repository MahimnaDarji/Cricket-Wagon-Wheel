const playerSelectorBlock = document.getElementById("player-selector-block");
const playerSelectorDropdown = document.getElementById("player-selector-dropdown");
const modeLine = document.getElementById("mode-line");
const playerCountLine = document.getElementById("player-count-line");

const selectedAvatar = document.getElementById("selected-avatar");
const selectedName = document.getElementById("selected-name");
const selectedStyle = document.getElementById("selected-style");

const stadiumName = document.getElementById("stadium-name");
const groundMode = document.getElementById("ground-mode");
const dimensionList = document.getElementById("dimension-list");
const wagonWheelToggle = document.getElementById("wagon-wheel-toggle");
const runSelectionStatus = document.getElementById("run-selection-status");
const runOptionsPanel = document.getElementById("run-options-panel");
const runChipList = document.getElementById("run-chip-list");
const nextBallButton = document.getElementById("next-ball-btn");
const completeInningsButton = document.getElementById("complete-innings-btn");
const inningsConfirmModal = document.getElementById("innings-confirm-modal");
const inningsConfirmMessage = document.getElementById("innings-confirm-message");
const confirmInningsNoButton = document.getElementById("confirm-innings-no");
const confirmInningsYesButton = document.getElementById("confirm-innings-yes");
const summaryAvatar = document.getElementById("summary-avatar");
const summaryName = document.getElementById("summary-name");
const summaryRuns = document.getElementById("summary-runs");
const summaryBalls = document.getElementById("summary-balls");
const teamSummaryCard = document.getElementById("team-summary-card");
const teamSummaryRuns = document.getElementById("team-summary-runs");
const teamSummaryBalls = document.getElementById("team-summary-balls");

const REVIEW_GROUND_OVERLAY_ENABLED = false;
const RUN_VALUES = [1, 2, 3, 4, 5, 6];
const RUN_COLOR_MAP = {
  1: "#3b82f6",
  2: "#0f766e",
  3: "#eab308",
  4: "#f97316",
  5: "#8b5cf6",
  6: "#dc2626",
};

const groundCircle = document.querySelector(".ground-circle");
const pitchStrip = document.querySelector(".pitch-strip");
const strikerCrease = document.querySelector(".crease.top");

const boundaryFieldConfig = [
  { name: "Third Man", angle: -135 },
  { name: "Long Stop", angle: -90 },
  { name: "Fine Leg", angle: -45 },
  { name: "Deep Square Leg", angle: 0 },
  { name: "Cow Corner", angle: 45 },
  { name: "Straight Down Ground", angle: 90 },
  { name: "Extra Cover", angle: 135 },
  { name: "Deep Point", angle: 180 },
];

const DEFAULT_BOUNDARY_CONFIG = [
  { name: "Third Man", value: 69 },
  { name: "Long Stop", value: 83 },
  { name: "Fine Leg", value: 72 },
  { name: "Deep Square Leg", value: 70 },
  { name: "Cow Corner", value: 78 },
  { name: "Straight Down Ground", value: 84 },
  { name: "Extra Cover", value: 80 },
  { name: "Deep Point", value: 74 },
];

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
  players: [],
  selectedPlayerId: null,
  wagonWheel: {
    enabled: false,
    selectedRun: null,
    runColors: { ...RUN_COLOR_MAP },
    inningsBallsByPlayer: {},
  },
  ground: {
    mode: "preset",
    stadiumName: "Melbourne Cricket Ground",
    boundaries: DEFAULT_BOUNDARY_CONFIG.map((item) => ({
      name: item.name,
      value: item.value,
      label: `${item.value}M`,
    })),
  },
};

let boundaryReplayLayer = null;
let boundaryReplayRunId = 0;

function safeParse(jsonValue) {
  try {
    return JSON.parse(jsonValue);
  } catch {
    return null;
  }
}

function normalizePlayer(player, index) {
  const rawName = String(player?.name || "").trim();
  const style = String(player?.battingStyle || "right").toLowerCase() === "left" ? "left" : "right";

  return {
    id: String(player?.id || `player-${index + 1}`),
    name: rawName || `Player ${index + 1}`,
    battingStyle: style,
    avatar: String(player?.avatar || ""),
  };
}

function loadState() {
  const playerSetup = safeParse(localStorage.getItem("playerSetup") || "");
  const groundSetup = safeParse(localStorage.getItem("groundSetup") || "");
  const inningsSetup = safeParse(localStorage.getItem("wagonWheelInnings") || "");

  let playerConfirmedAtMs = 0;
  if (playerSetup?.confirmedAt) {
    const parsed = Date.parse(String(playerSetup.confirmedAt));
    playerConfirmedAtMs = Number.isFinite(parsed) ? parsed : 0;
  }

  if (playerSetup && Array.isArray(playerSetup.players) && playerSetup.players.length > 0) {
    const mode = playerSetup.mode === "team" ? "team" : "individual";
    const players = playerSetup.players.map((player, index) => normalizePlayer(player, index));

    state.mode = mode;
    state.players = mode === "individual" ? [players[0]] : players;
    state.selectedPlayerId = state.players[0]?.id || null;
  } else {
    state.mode = "individual";
    state.players = [normalizePlayer({ id: "player-1", name: "Player 1", battingStyle: "right" }, 0)];
    state.selectedPlayerId = state.players[0].id;
  }

  if (groundSetup) {
    state.ground = {
      mode: groundSetup.mode === "custom" ? "custom" : "preset",
      stadiumName: String(groundSetup.stadiumName || "Melbourne Cricket Ground"),
      boundaries: Array.isArray(groundSetup.boundaries) && groundSetup.boundaries.length > 0
        ? groundSetup.boundaries.map((item, index) => {
            const value = Number(item?.value);
            const fallback = DEFAULT_BOUNDARY_CONFIG[index] || DEFAULT_BOUNDARY_CONFIG[0];
            const finalValue = Number.isFinite(value) ? value : fallback.value;

            return {
              name: String(item?.name || fallback.name),
              value: finalValue,
              label: String(item?.label || `${Math.round(finalValue)}M`),
            };
          })
        : state.ground.boundaries,
    };
  }

  if (inningsSetup && typeof inningsSetup === "object") {
    let inningsSavedAtMs = 0;
    if (inningsSetup.savedAt) {
      const parsed = Date.parse(String(inningsSetup.savedAt));
      inningsSavedAtMs = Number.isFinite(parsed) ? parsed : 0;
    }

    if (playerConfirmedAtMs > 0 && inningsSavedAtMs > 0 && playerConfirmedAtMs > inningsSavedAtMs) {
      state.wagonWheel.inningsBallsByPlayer = {};
      return;
    }

    const rosterNameById = state.players.reduce((acc, player) => {
      acc[player.id] = player.name;
      return acc;
    }, {});
    const savedRosterNameById = inningsSetup.playerRosterNameById && typeof inningsSetup.playerRosterNameById === "object"
      ? inningsSetup.playerRosterNameById
      : null;

    const maybeByPlayer = inningsSetup.ballsByPlayer;
    if (maybeByPlayer && typeof maybeByPlayer === "object") {
      state.wagonWheel.inningsBallsByPlayer = Object.entries(maybeByPlayer).reduce((acc, [playerId, balls]) => {
        if (!Array.isArray(balls)) {
          return acc;
        }

        const currentName = String(rosterNameById[playerId] || "").trim();
        if (!currentName) {
          return acc;
        }

        if (savedRosterNameById) {
          const savedName = String(savedRosterNameById[playerId] || "").trim();
          if (!savedName || savedName !== currentName) {
            return acc;
          }
        }

        acc[playerId] = balls
          .map((ball, index) => {
            const run = Number(ball?.run);
            if (!Number.isInteger(run)) {
              return null;
            }

            return {
              ballNumber: Number.isInteger(Number(ball?.ballNumber)) ? Number(ball.ballNumber) : index + 1,
              run,
              color: String(ball?.color || state.wagonWheel.runColors[run] || ""),
            };
          })
          .filter(Boolean);

        return acc;
      }, {});
    } else if (Array.isArray(inningsSetup.balls) && state.selectedPlayerId) {
      state.wagonWheel.inningsBallsByPlayer[state.selectedPlayerId] = inningsSetup.balls
        .map((ball, index) => {
          const run = Number(ball?.run);
          if (!Number.isInteger(run)) {
            return null;
          }

          return {
            ballNumber: Number.isInteger(Number(ball?.ballNumber)) ? Number(ball.ballNumber) : index + 1,
            run,
            color: String(ball?.color || state.wagonWheel.runColors[run] || ""),
          };
        })
        .filter(Boolean);
    }
  }
}

function getStyleLabel(style) {
  return style === "left" ? "Left-Handed Batter" : "Right-Handed Batter";
}

function getAvatarSource(player) {
  return player?.avatar || DEFAULT_AVATAR;
}

function getSelectedPlayer() {
  const selected = state.players.find((player) => player.id === state.selectedPlayerId);
  return selected || state.players[0] || null;
}

function selectPlayer(playerId) {
  state.selectedPlayerId = playerId;
  renderPlayerPanel();
  renderTopRightSummaryCard();
}

function renderPlayerPanel() {
  const inTeamMode = state.mode === "team";
  if (modeLine) {
    modeLine.textContent = `Mode: ${inTeamMode ? "Team" : "Individual"}`;
  }
  if (playerCountLine) {
    playerCountLine.textContent = `Players: ${state.players.length}`;
  }

  const player = getSelectedPlayer();
  selectedAvatar.src = getAvatarSource(player);
  selectedName.textContent = player?.name || "Player";
  selectedStyle.textContent = getStyleLabel(player?.battingStyle || "right");

  if (playerSelectorBlock) {
    playerSelectorBlock.classList.toggle("is-hidden", !inTeamMode);
  }

  if (!playerSelectorDropdown || !inTeamMode) {
    if (playerSelectorDropdown) {
      playerSelectorDropdown.innerHTML = "";
    }
    return;
  }

  playerSelectorDropdown.innerHTML = "";

  state.players.forEach((entry) => {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.name;
    if (entry.id === state.selectedPlayerId) {
      option.selected = true;
    }
    playerSelectorDropdown.appendChild(option);
  });
}

function renderGroundDetails() {
  stadiumName.textContent = state.ground.stadiumName;
  groundMode.textContent = `Ground Mode: ${state.ground.mode === "custom" ? "Custom" : "Preset"}`;

  if (!dimensionList) {
    return;
  }

  dimensionList.innerHTML = "";
  state.ground.boundaries.forEach((dimension) => {
    const row = document.createElement("div");
    row.className = "dimension-row";

    const name = document.createElement("span");
    name.className = "dimension-name";
    name.textContent = dimension.name;

    const value = document.createElement("span");
    value.className = "dimension-value";
    value.textContent = dimension.label || `${Math.round(dimension.value)}M`;

    row.appendChild(name);
    row.appendChild(value);
    dimensionList.appendChild(row);
  });
}

function getPlayerBalls(playerId) {
  const balls = state.wagonWheel.inningsBallsByPlayer[playerId];
  return Array.isArray(balls) ? balls : [];
}

function renderTopRightSummaryCard() {
  if (!summaryAvatar || !summaryName || !summaryRuns || !summaryBalls) {
    return;
  }

  const player = getSelectedPlayer();
  const playerId = player?.id || "";
  const playerBalls = getPlayerBalls(playerId);
  const totalRuns = playerBalls.reduce((sum, ball) => sum + (Number(ball.run) || 0), 0);
  const totalBalls = playerBalls.length;

  summaryAvatar.src = getAvatarSource(player);
  summaryName.textContent = player?.name || "Player";
  summaryRuns.textContent = `${totalRuns} Run${totalRuns === 1 ? "" : "s"}`;
  summaryBalls.textContent = `${totalBalls} Ball${totalBalls === 1 ? "" : "s"}`;

  if (!teamSummaryCard || !teamSummaryRuns || !teamSummaryBalls) {
    return;
  }

  const inTeamMode = state.mode === "team";
  teamSummaryCard.classList.toggle("is-hidden", !inTeamMode);

  if (!inTeamMode) {
    teamSummaryRuns.textContent = "0 Runs";
    teamSummaryBalls.textContent = "0 Balls";
    return;
  }

  const teamTotals = state.players.reduce(
    (totals, teamPlayer) => {
      const balls = getPlayerBalls(teamPlayer.id);
      totals.balls += balls.length;
      totals.runs += balls.reduce((sum, ball) => sum + (Number(ball.run) || 0), 0);
      return totals;
    },
    { runs: 0, balls: 0 }
  );

  teamSummaryRuns.textContent = `${teamTotals.runs} Run${teamTotals.runs === 1 ? "" : "s"}`;
  teamSummaryBalls.textContent = `${teamTotals.balls} Ball${teamTotals.balls === 1 ? "" : "s"}`;
}

function renderRunSelection() {
  if (!wagonWheelToggle || !runSelectionStatus || !runOptionsPanel || !runChipList) {
    return;
  }

  const isEnabled = state.wagonWheel.enabled;
  const selectedRun = state.wagonWheel.selectedRun;

  wagonWheelToggle.classList.toggle("active", isEnabled);
  wagonWheelToggle.setAttribute("aria-pressed", String(isEnabled));
  runOptionsPanel.classList.toggle("is-hidden", !isEnabled);

  if (!isEnabled) {
    runSelectionStatus.textContent = "Neutral: Run selection is not enabled yet.";
  } else if (!Number.isInteger(selectedRun)) {
    runSelectionStatus.textContent = "Neutral: No run selected yet.";
  } else {
    runSelectionStatus.textContent = `Selected Run: ${selectedRun}`;
  }

  runChipList.querySelectorAll(".run-chip").forEach((chip) => {
    const runValue = Number(chip.dataset.runValue);
    const isActive = isEnabled && runValue === selectedRun;
    chip.classList.toggle("active", isActive);
    chip.setAttribute("aria-checked", String(isActive));
  });
}

function setSelectedRun(runValue) {
  if (!state.wagonWheel.enabled || !RUN_VALUES.includes(runValue)) {
    return;
  }

  state.wagonWheel.selectedRun = runValue;
  renderRunSelection();
}

function getPlayerNameForPrompt() {
  const player = getSelectedPlayer();
  return player?.name || "Player";
}

function saveInningsState() {
  const selectedPlayer = getSelectedPlayer();
  const playerRosterNameById = state.players.reduce((acc, player) => {
    acc[player.id] = player.name;
    return acc;
  }, {});

  const payload = {
    playerId: selectedPlayer?.id || null,
    playerName: selectedPlayer?.name || "Player",
    playerRosterNameById,
    groundName: state.ground.stadiumName,
    groundMode: state.ground.mode,
    runColors: { ...state.wagonWheel.runColors },
    ballsByPlayer: Object.entries(state.wagonWheel.inningsBallsByPlayer).reduce((acc, [playerId, balls]) => {
      acc[playerId] = (balls || []).map((ball) => ({ ...ball }));
      return acc;
    }, {}),
    balls: (() => {
      const activePlayerBalls = getPlayerBalls(selectedPlayer?.id || "");
      return activePlayerBalls.map((ball) => ({ ...ball }));
    })(),
    savedAt: new Date().toISOString(),
  };

  localStorage.setItem("wagonWheelInnings", JSON.stringify(payload));
}

function saveCurrentBallAndResetSelection() {
  const runValue = state.wagonWheel.selectedRun;
  if (!Number.isInteger(runValue)) {
    renderRunSelection();
    renderTopRightSummaryCard();
    return;
  }

  const selectedPlayer = getSelectedPlayer();
  const playerId = selectedPlayer?.id || "player-1";
  if (!Array.isArray(state.wagonWheel.inningsBallsByPlayer[playerId])) {
    state.wagonWheel.inningsBallsByPlayer[playerId] = [];
  }

  const currentBalls = state.wagonWheel.inningsBallsByPlayer[playerId];

  currentBalls.push({
    ballNumber: currentBalls.length + 1,
    run: runValue,
    color: state.wagonWheel.runColors[runValue],
  });

  state.wagonWheel.selectedRun = null;
  renderRunSelection();
  renderTopRightSummaryCard();
  saveInningsState();
}

function showCompleteInningsModal() {
  if (!inningsConfirmModal || !inningsConfirmMessage) {
    return;
  }

  inningsConfirmMessage.textContent = `Are you sure you want to complete the innings for ${getPlayerNameForPrompt()}?`;
  inningsConfirmModal.classList.remove("is-hidden");
}

function hideCompleteInningsModal() {
  if (!inningsConfirmModal) {
    return;
  }

  inningsConfirmModal.classList.add("is-hidden");
}

function completeInningsAndContinue() {
  if (Number.isInteger(state.wagonWheel.selectedRun)) {
    saveCurrentBallAndResetSelection();
  }

  saveInningsState();
  window.location.href = "dashboard.html";
}

function setupRunSelection() {
  if (!wagonWheelToggle || !runChipList) {
    return;
  }

  wagonWheelToggle.addEventListener("click", () => {
    state.wagonWheel.enabled = !state.wagonWheel.enabled;
    renderRunSelection();
  });

  runChipList.innerHTML = "";
  RUN_VALUES.forEach((runValue) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `run-chip run-chip-${runValue}`;
    chip.dataset.runValue = String(runValue);
    chip.setAttribute("role", "radio");
    chip.setAttribute("aria-checked", "false");
    chip.textContent = `${runValue} Run${runValue > 1 ? "s" : ""}`;
    chip.style.setProperty("--run-color", state.wagonWheel.runColors[runValue]);
    chip.addEventListener("click", () => {
      setSelectedRun(runValue);
    });
    runChipList.appendChild(chip);
  });

  if (nextBallButton) {
    nextBallButton.addEventListener("click", () => {
      saveCurrentBallAndResetSelection();
    });
  }

  if (completeInningsButton) {
    completeInningsButton.addEventListener("click", () => {
      showCompleteInningsModal();
    });
  }

  if (confirmInningsNoButton) {
    confirmInningsNoButton.addEventListener("click", () => {
      hideCompleteInningsModal();
    });
  }

  if (confirmInningsYesButton) {
    confirmInningsYesButton.addEventListener("click", () => {
      hideCompleteInningsModal();
      completeInningsAndContinue();
    });
  }

  if (inningsConfirmModal) {
    inningsConfirmModal.addEventListener("click", (event) => {
      if (event.target === inningsConfirmModal) {
        hideCompleteInningsModal();
      }
    });
  }

  if (playerSelectorDropdown) {
    playerSelectorDropdown.addEventListener("change", (event) => {
      const nextPlayerId = String(event.target.value || "");
      if (!nextPlayerId) {
        return;
      }

      selectPlayer(nextPlayerId);
    });
  }

  renderRunSelection();
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function createArrowLayer(stage) {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.classList.add("boundary-overlay", "shot-overlay");

  const defs = document.createElementNS(namespace, "defs");
  const marker = document.createElementNS(namespace, "marker");
  marker.setAttribute("id", "boundary-arrow-head-review");
  marker.setAttribute("markerWidth", "8");
  marker.setAttribute("markerHeight", "8");
  marker.setAttribute("refX", "6.2");
  marker.setAttribute("refY", "3");
  marker.setAttribute("orient", "auto");

  const arrowShape = document.createElementNS(namespace, "path");
  arrowShape.setAttribute("d", "M 0 0 L 6 3 L 0 6 z");
  arrowShape.setAttribute("class", "boundary-arrow-head-shape");
  marker.appendChild(arrowShape);
  defs.appendChild(marker);
  svg.appendChild(defs);

  const settledGroup = document.createElementNS(namespace, "g");
  const activePath = document.createElementNS(namespace, "path");
  activePath.classList.add("boundary-arrow-active");
  activePath.setAttribute("marker-end", "url(#boundary-arrow-head-review)");

  svg.appendChild(settledGroup);
  svg.appendChild(activePath);
  stage.appendChild(svg);

  return { svg, settledGroup, activePath };
}

function getGroundGeometry() {
  const circleRect = groundCircle.getBoundingClientRect();
  const creaseRect = strikerCrease?.getBoundingClientRect();
  const pitchRect = pitchStrip.getBoundingClientRect();

  const startX = creaseRect
    ? creaseRect.left + creaseRect.width / 2 - circleRect.left
    : pitchRect.left + pitchRect.width / 2 - circleRect.left;
  const startY = creaseRect
    ? creaseRect.top + creaseRect.height / 2 - circleRect.top
    : pitchRect.top + pitchRect.height * 0.14 - circleRect.top;

  return {
    centerX: circleRect.width / 2,
    centerY: circleRect.height / 2,
    radius: Math.min(circleRect.width, circleRect.height) / 2,
    start: {
      x: startX,
      y: startY,
    },
  };
}

function getBoundaryDistance(start, direction, geometry) {
  const dx = start.x - geometry.centerX;
  const dy = start.y - geometry.centerY;

  const a = direction.x * direction.x + direction.y * direction.y;
  const b = 2 * (dx * direction.x + dy * direction.y);
  const c = dx * dx + dy * dy - geometry.radius * geometry.radius;
  const discriminant = b * b - 4 * a * c;

  if (!Number.isFinite(discriminant) || discriminant < 0) {
    return 0;
  }

  const sqrtDiscriminant = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDiscriminant) / (2 * a);
  const t2 = (-b + sqrtDiscriminant) / (2 * a);
  const positiveRoots = [t1, t2].filter((value) => Number.isFinite(value) && value > 0);

  if (positiveRoots.length === 0) {
    return 0;
  }

  return Math.max(...positiveRoots);
}

function buildArrowPath(geometry, angleDegrees, scaleFactor) {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  const direction = {
    x: Math.cos(angleRadians),
    y: Math.sin(angleRadians),
  };

  const maxTravel = getBoundaryDistance(geometry.start, direction, geometry);
  const travel = maxTravel * Math.min(Math.max(scaleFactor, 0), 1);
  const end = {
    x: geometry.start.x + direction.x * travel,
    y: geometry.start.y + direction.y * travel,
  };

  return {
    start: geometry.start,
    direction,
    end,
  };
}

function toLinePath(path) {
  return `M ${path.start.x.toFixed(2)} ${path.start.y.toFixed(2)} L ${path.end.x.toFixed(2)} ${path.end.y.toFixed(2)}`;
}

function createBoundaryLabel(path, index, labelText) {
  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.classList.add("boundary-arrow-label");
  text.dataset.index = String(index);
  text.textContent = labelText;

  const along = 0.7;
  const sideOffset = 16;
  const baseX = path.start.x + (path.end.x - path.start.x) * along;
  const baseY = path.start.y + (path.end.y - path.start.y) * along;
  const perpendicularX = -path.direction.y;
  const perpendicularY = path.direction.x;

  text.setAttribute("x", (baseX + perpendicularX * sideOffset).toFixed(2));
  text.setAttribute("y", (baseY + perpendicularY * sideOffset).toFixed(2));
  text.setAttribute("text-anchor", "middle");
  text.setAttribute("dominant-baseline", "middle");
  text.setAttribute("fill", "#e7edf6");
  text.setAttribute("stroke", "rgba(22, 30, 36, 0.9)");
  text.setAttribute("stroke-width", "0.8");
  text.setAttribute("paint-order", "stroke");
  text.setAttribute("font-size", "14");
  text.setAttribute("font-weight", "700");
  text.style.opacity = "1";

  return text;
}

function animateArrow(layer, path, durationMs, labelIndex, labelText, runId) {
  return new Promise((resolve) => {
    const pathD = toLinePath(path);
    layer.activePath.setAttribute("d", pathD);
    const length = layer.activePath.getTotalLength();
    const startTime = performance.now();

    layer.activePath.style.strokeDasharray = `${length}`;
    layer.activePath.style.strokeDashoffset = `${length}`;
    layer.activePath.style.opacity = "1";

    function frame(now) {
      if (runId !== boundaryReplayRunId) {
        layer.activePath.style.opacity = "0";
        layer.activePath.setAttribute("d", "");
        resolve();
        return;
      }

      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      layer.activePath.style.strokeDashoffset = `${length * (1 - eased)}`;

      if (progress < 1) {
        requestAnimationFrame(frame);
        return;
      }

      const settledPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      settledPath.classList.add("boundary-arrow-path");
      settledPath.setAttribute("d", pathD);
      settledPath.setAttribute("marker-end", "url(#boundary-arrow-head-review)");
      layer.settledGroup.appendChild(settledPath);

      const label = createBoundaryLabel(path, labelIndex, labelText);
      layer.settledGroup.appendChild(label);

      layer.activePath.style.opacity = "0";
      layer.activePath.setAttribute("d", "");
      resolve();
    }

    requestAnimationFrame(frame);
  });
}

async function playBoundaryArrowsOnce(layer, runId) {
  layer.settledGroup.innerHTML = "";
  layer.activePath.setAttribute("d", "");
  layer.activePath.style.opacity = "0";

  for (let index = 0; index < boundaryFieldConfig.length; index += 1) {
    if (runId !== boundaryReplayRunId) {
      return;
    }

    const field = boundaryFieldConfig[index];
    const boundary = state.ground.boundaries[index];
    const geometry = getGroundGeometry();
    const numericValue = Number(boundary?.value);
    const scaleFactor = Number.isFinite(numericValue) ? 1 : 0;
    const labelText = String(boundary?.label || (Number.isFinite(numericValue) ? `${Math.round(numericValue)}M` : ""));

    if (scaleFactor <= 0 || labelText.length === 0) {
      continue;
    }

    const path = buildArrowPath(geometry, field.angle, scaleFactor);
    await animateArrow(layer, path, 780, index, labelText, runId);
    await wait(220);
  }
}

function rerenderGroundOverlay() {
  if (!REVIEW_GROUND_OVERLAY_ENABLED) {
    return;
  }

  if (!boundaryReplayLayer) {
    return;
  }

  boundaryReplayRunId += 1;
  const runId = boundaryReplayRunId;
  playBoundaryArrowsOnce(boundaryReplayLayer, runId);
}

function setupGroundOverlay() {
  if (!REVIEW_GROUND_OVERLAY_ENABLED) {
    return;
  }

  if (!groundCircle || !pitchStrip || !strikerCrease) {
    return;
  }

  boundaryReplayLayer = createArrowLayer(groundCircle);
  rerenderGroundOverlay();
}

function render() {
  renderPlayerPanel();
  renderGroundDetails();
  renderTopRightSummaryCard();
  renderRunSelection();
  rerenderGroundOverlay();
}

loadState();
setupRunSelection();
setupGroundOverlay();
render();
if (REVIEW_GROUND_OVERLAY_ENABLED) {
  window.addEventListener("resize", rerenderGroundOverlay);
}
