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
const undoShotButton = document.getElementById("undo-shot-btn");
const clearShotsButton = document.getElementById("clear-shots-btn");
const completeInningsButton = document.getElementById("complete-innings-btn");
const downloadExportBlock = document.getElementById("download-export-block");
const downloadImageButton = document.getElementById("download-image-btn");
const returnDashboardButton = document.getElementById("return-dashboard-btn");
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
const fieldSideLeftLabel = document.getElementById("field-side-left");
const fieldSideRightLabel = document.getElementById("field-side-right");

const REVIEW_GROUND_OVERLAY_ENABLED = false;
const SHOT_START_POINT = Object.freeze({ xRatio: 0.5, yRatio: 0.363 });
const RUN_VALUES = [1, 2, 3, 4, 5, 6];
const RUN_COLOR_MAP = {
  1: "#1d4ed8",
  2: "#facc15",
  3: "#ffffff",
  4: "#f97316",
  5: "#7c3aed",
  6: "#ef4444",
};

const DEBUG_HISTORY = false;
const HISTORY_VIEW_RECORD_KEY = "cww_history_view_record_id";
const HISTORY_AUTO_EXPORT_KEY = "cww_history_auto_export";
const HISTORY_EXPORT_EVENT = "cww-history-export-ready";

const groundCircle = document.querySelector(".ground-circle");
const groundStage = document.querySelector(".ground-stage");
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
  isHistoryDetailView: false,
  viewedInningsSavedAt: "",
  players: [],
  selectedPlayerId: null,
  wagonWheel: {
    enabled: false,
    selectedRun: null,
    runColors: { ...RUN_COLOR_MAP },
    inningsBallsByPlayer: {},
    shotsByPlayer: {},
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
let shotArrowLayer = null;
let lastShotClickSignature = null;
let exportRootNode = null;

function getHistoryRecordForView() {
  const requestedId = String(localStorage.getItem(HISTORY_VIEW_RECORD_KEY) || "").trim();
  if (!requestedId) {
    return null;
  }

  const historyList = safeParse(localStorage.getItem("wagonWheelHistory") || "[]");
  if (!Array.isArray(historyList)) {
    localStorage.removeItem(HISTORY_VIEW_RECORD_KEY);
    return null;
  }

  const selectedRecord = historyList.find((entry) => String(entry?.id || "") === requestedId);
  localStorage.removeItem(HISTORY_VIEW_RECORD_KEY);
  return selectedRecord && typeof selectedRecord === "object" ? selectedRecord : null;
}

function normalizeHistoryGround(record) {
  const fallbackBoundaries = DEFAULT_BOUNDARY_CONFIG.map((item) => ({
    name: item.name,
    value: item.value,
    label: `${item.value}M`,
  }));

  const savedBoundaries = Array.isArray(record?.boundaries)
    ? record.boundaries.map((item, index) => {
        const fallback = DEFAULT_BOUNDARY_CONFIG[index] || DEFAULT_BOUNDARY_CONFIG[0];
        const value = Number(item?.value);
        const finalValue = Number.isFinite(value) ? value : fallback.value;
        return {
          name: String(item?.name || fallback.name),
          value: finalValue,
          label: String(item?.label || `${Math.round(finalValue)}M`),
        };
      })
    : fallbackBoundaries;

  return {
    mode: record?.groundMode === "custom" ? "custom" : "preset",
    stadiumName: String(record?.groundName || "Melbourne Cricket Ground"),
    boundaries: savedBoundaries,
  };
}

function applyHistoryRecordToState(record) {
  const rosterById = record?.playerRosterNameById && typeof record.playerRosterNameById === "object"
    ? record.playerRosterNameById
    : {};
  const shotsByPlayer = record?.shotsByPlayer && typeof record.shotsByPlayer === "object"
    ? record.shotsByPlayer
    : {};
  const ballsByPlayer = record?.ballsByPlayer && typeof record.ballsByPlayer === "object"
    ? record.ballsByPlayer
    : {};

  const preferredPlayerId = String(record?.playerId || "").trim();
  const availableIds = Array.from(
    new Set([
      ...Object.keys(shotsByPlayer),
      ...Object.keys(ballsByPlayer),
      ...Object.keys(rosterById),
    ].filter((value) => String(value || "").trim().length > 0))
  );

  const selectedHistoryPlayerId = availableIds.includes(preferredPlayerId)
    ? preferredPlayerId
    : (availableIds[0] || "player-1");

  const selectedHistoryName = String(
    rosterById[selectedHistoryPlayerId] || record?.playerName || "Player"
  ).trim() || "Player";

  state.mode = "individual";
  state.isHistoryDetailView = true;
  state.viewedInningsSavedAt = String(record?.savedAt || "");
  state.players = [normalizePlayer({
    id: selectedHistoryPlayerId,
    name: selectedHistoryName,
    battingStyle: record?.playerBattingStyle || "right",
    avatar: record?.playerAvatar || "",
  }, 0)];
  state.selectedPlayerId = state.players[0].id;

  state.ground = normalizeHistoryGround(record);

  state.wagonWheel.runColors = {
    ...RUN_COLOR_MAP,
    ...(record?.runColors && typeof record.runColors === "object" ? record.runColors : {}),
  };

  const sourceBalls = Array.isArray(ballsByPlayer[selectedHistoryPlayerId])
    ? ballsByPlayer[selectedHistoryPlayerId]
    : (Array.isArray(record?.balls) ? record.balls : []);

  state.wagonWheel.inningsBallsByPlayer = {
    [selectedHistoryPlayerId]: sourceBalls
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
      .filter(Boolean),
  };

  const sourceShots = Array.isArray(shotsByPlayer[selectedHistoryPlayerId])
    ? shotsByPlayer[selectedHistoryPlayerId]
    : [];

  state.wagonWheel.shotsByPlayer = {
    [selectedHistoryPlayerId]: sourceShots
      .map((shot) => {
        const runValue = Number(shot?.runValue);
        if (!Number.isInteger(runValue)) {
          return null;
        }

        const start = shot?.start && typeof shot.start === "object" ? shot.start : null;
        const end = shot?.end && typeof shot.end === "object" ? shot.end : null;
        if (!start || !end) {
          return null;
        }

        return {
          runValue,
          color: String(shot?.color || state.wagonWheel.runColors[runValue] || RUN_COLOR_MAP[runValue] || "#f4f2ea"),
          start: {
            x: Number(start.x) || 0,
            y: Number(start.y) || 0,
            xRatio: Number(start.xRatio),
            yRatio: Number(start.yRatio),
          },
          end: {
            x: Number(end.x) || 0,
            y: Number(end.y) || 0,
            xRatio: Number(end.xRatio),
            yRatio: Number(end.yRatio),
          },
        };
      })
      .filter(Boolean),
  };
}

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
  const historyRecord = getHistoryRecordForView();
  if (historyRecord) {
    applyHistoryRecordToState(historyRecord);
    return;
  }

  state.isHistoryDetailView = false;
  state.viewedInningsSavedAt = "";
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
      state.wagonWheel.shotsByPlayer = {};
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

      state.wagonWheel.shotsByPlayer = {};
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

      state.wagonWheel.shotsByPlayer = {};
    }

    const maybeShotsByPlayer = inningsSetup.shotsByPlayer;
    if (maybeShotsByPlayer && typeof maybeShotsByPlayer === "object") {
      state.wagonWheel.shotsByPlayer = Object.entries(maybeShotsByPlayer).reduce((acc, [playerId, shots]) => {
        if (!Array.isArray(shots)) {
          return acc;
        }

        acc[playerId] = shots
          .map((shot) => {
            const runValue = Number(shot?.runValue);
            if (!Number.isInteger(runValue)) {
              return null;
            }

            const start = shot?.start && typeof shot.start === "object" ? shot.start : null;
            const end = shot?.end && typeof shot.end === "object" ? shot.end : null;
            if (!start || !end) {
              return null;
            }

            return {
              runValue,
              color: String(shot?.color || state.wagonWheel.runColors[runValue] || RUN_COLOR_MAP[runValue] || "#f4f2ea"),
              start: {
                x: Number(start.x) || 0,
                y: Number(start.y) || 0,
                xRatio: Number(start.xRatio),
                yRatio: Number(start.yRatio),
              },
              end: {
                x: Number(end.x) || 0,
                y: Number(end.y) || 0,
                xRatio: Number(end.xRatio),
                yRatio: Number(end.yRatio),
              },
            };
          })
          .filter(Boolean);

        return acc;
      }, {});
    }
  }
}

function formatFileDate(value) {
  const date = new Date(String(value || ""));
  if (Number.isNaN(date.getTime())) {
    return "unknown_date";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function shouldAutoDownloadHistoryExport() {
  const params = new URLSearchParams(window.location.search);
  const wantsAutoDownload = params.get("autodownload") === "1";
  const hasExportRequest = localStorage.getItem(HISTORY_AUTO_EXPORT_KEY) === "1";
  return wantsAutoDownload && hasExportRequest && state.isHistoryDetailView;
}

function getEmbeddedHistoryExportRequestId() {
  const params = new URLSearchParams(window.location.search);
  const mode = String(params.get("exportmode") || "").trim();
  const requestId = String(params.get("requestId") || "").trim();

  if (mode !== "embedded" || !requestId) {
    return "";
  }

  return requestId;
}

function applyHistoryDetailReadOnlyMode() {
  if (!state.isHistoryDetailView) {
    return;
  }

  state.wagonWheel.enabled = false;
  state.wagonWheel.selectedRun = null;

  if (downloadExportBlock) {
    downloadExportBlock.classList.add("is-hidden");
  }

  if (runSelectionStatus) {
    runSelectionStatus.textContent = "History detail view: innings data loaded in read-only mode.";
  }

  if (wagonWheelToggle) {
    wagonWheelToggle.disabled = true;
  }
  if (nextBallButton) {
    nextBallButton.disabled = true;
  }
  if (undoShotButton) {
    undoShotButton.disabled = true;
  }
  if (clearShotsButton) {
    clearShotsButton.disabled = true;
  }
  if (completeInningsButton) {
    completeInningsButton.disabled = true;
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
  renderShotArrows();
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
  renderFieldSideLabels(player?.battingStyle || "right");

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

function renderFieldSideLabels(battingStyle) {
  if (!fieldSideLeftLabel || !fieldSideRightLabel) {
    return;
  }

  const isLeftHanded = String(battingStyle || "right").toLowerCase() === "left";
  fieldSideLeftLabel.textContent = isLeftHanded ? "Leg Side" : "Off Side";
  fieldSideRightLabel.textContent = isLeftHanded ? "Off Side" : "Leg Side";
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

function getPlayerShots(playerId) {
  const shots = state.wagonWheel.shotsByPlayer[playerId];
  return Array.isArray(shots) ? shots : [];
}

function renderTopRightSummaryCard() {
  if (!summaryAvatar || !summaryName || !summaryRuns || !summaryBalls) {
    return;
  }

  const player = getSelectedPlayer();
  const playerId = player?.id || "";
  const playerShots = getPlayerShots(playerId);
  const totalRuns = playerShots.reduce((sum, shot) => sum + (Number(shot.runValue) || 0), 0);
  const totalBalls = playerShots.length;

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
      const shots = getPlayerShots(teamPlayer.id);
      totals.balls += shots.length;
      totals.runs += shots.reduce((sum, shot) => sum + (Number(shot.runValue) || 0), 0);
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

function getSelectedPlayerCompletedBalls() {
  const selectedPlayer = getSelectedPlayer();
  const playerId = selectedPlayer?.id || "";

  const savedBalls = (getPlayerBalls(playerId) || []).map((ball, index) => ({
    ballNumber: Number.isInteger(Number(ball?.ballNumber)) ? Number(ball.ballNumber) : index + 1,
    run: Number(ball?.run) || 0,
    color: String(ball?.color || state.wagonWheel.runColors[Number(ball?.run)] || ""),
  }));

  const shotBalls = (getPlayerShots(playerId) || []).map((shot, index) => {
    const run = Number(shot?.runValue) || 0;
    return {
      ballNumber: index + 1,
      run,
      color: String(shot?.color || state.wagonWheel.runColors[run] || ""),
    };
  });

  // If shots capture more balls than explicit Next Ball commits, trust shot capture as source of truth.
  if (shotBalls.length > savedBalls.length) {
    return shotBalls;
  }

  return savedBalls;
}

function buildCompletedInningsRecord() {
  const selectedPlayer = getSelectedPlayer();
  const completedBalls = getSelectedPlayerCompletedBalls();
  const runsSequence = completedBalls.map((ball) => Number(ball.run) || 0);
  const totalRuns = runsSequence.reduce((sum, run) => sum + run, 0);
  const totalBalls = completedBalls.length;
  const savedAt = new Date().toISOString();

  if (DEBUG_HISTORY) {
    console.log("[History Debug] completedBalls", completedBalls);
    console.log("[History Debug] totals", { totalRuns, totalBalls, runsSequence });
  }

  return {
    id: `${selectedPlayer?.id || "player"}-${savedAt}-${Math.random().toString(36).slice(2, 7)}`,
    playerId: selectedPlayer?.id || null,
    playerName: selectedPlayer?.name || "Player",
    playerRosterNameById: {
      [selectedPlayer?.id || "player"]: selectedPlayer?.name || "Player",
    },
    groundName: state.ground.stadiumName,
    groundMode: state.ground.mode,
    runColors: { ...state.wagonWheel.runColors },
    runsSequence,
    totalRuns,
    totalBalls,
    ballsByPlayer: {
      [selectedPlayer?.id || "player"]: completedBalls.map((ball) => ({ ...ball })),
    },
    shotsByPlayer: {
      [selectedPlayer?.id || "player"]: (getPlayerShots(selectedPlayer?.id || "") || []).map((shot) => ({
        runValue: Number(shot.runValue) || 0,
        color: String(shot.color || ""),
        start: { ...shot.start },
        end: { ...shot.end },
      })),
    },
    balls: completedBalls.map((ball) => ({ ...ball })),
    savedAt,
  };
}

function saveInningsState() {
  const payload = buildCompletedInningsRecord();

  localStorage.setItem("wagonWheelInnings", JSON.stringify(payload));

  return payload;
}

function appendInningsToHistory(record) {
  if (!record || typeof record !== "object") {
    return;
  }

  const history = (() => {
    try {
      const existing = JSON.parse(localStorage.getItem("wagonWheelHistory") || "[]");
      return Array.isArray(existing) ? existing : [];
    } catch {
      return [];
    }
  })();

  const normalized = {
    ...record,
    id: String(record.id || `${record.playerId || "player"}-${record.savedAt || Date.now()}`),
    savedAt: record.savedAt || new Date().toISOString(),
    runsSequence: Array.isArray(record.runsSequence) ? record.runsSequence.map((run) => Number(run) || 0) : [],
    totalRuns: Number(record.totalRuns) || 0,
    totalBalls: Number(record.totalBalls) || 0,
  };

  const deduped = history.filter((entry) => String(entry?.id || "") !== normalized.id);
  deduped.unshift(normalized);

  if (DEBUG_HISTORY) {
    console.log("[History Debug] saving record", normalized);
  }

  localStorage.setItem("wagonWheelHistory", JSON.stringify(deduped.slice(0, 50)));
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

  const completedRecord = saveInningsState();
  appendInningsToHistory(completedRecord);
  if (downloadExportBlock) {
    downloadExportBlock.classList.remove("is-hidden");
  }
}

function sanitizeFileName(value) {
  const trimmed = String(value || "player").trim().toLowerCase();
  const safe = trimmed.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return safe || "player";
}

function removeExportRootNode() {
  if (!exportRootNode) {
    return;
  }

  exportRootNode.remove();
  exportRootNode = null;
}

function createExportContainer() {
  removeExportRootNode();

  const player = getSelectedPlayer();
  const playerId = player?.id || "";
  const playerShots = getPlayerShots(playerId);
  const totalRuns = playerShots.reduce((sum, shot) => sum + (Number(shot.runValue) || 0), 0);
  const totalBalls = playerShots.length;

  const root = document.createElement("div");
  root.className = "export-canvas-root";

  const header = document.createElement("div");
  header.className = "export-header";

  const avatar = document.createElement("img");
  avatar.className = "export-avatar";
  avatar.src = getAvatarSource(player);
  avatar.alt = "Player avatar";

  const headerMeta = document.createElement("div");
  const name = document.createElement("p");
  name.className = "export-player-name";
  name.textContent = player?.name || "Player";

  const style = document.createElement("p");
  style.className = "export-player-style";
  style.textContent = getStyleLabel(player?.battingStyle || "right");

  headerMeta.appendChild(name);
  headerMeta.appendChild(style);
  header.appendChild(avatar);
  header.appendChild(headerMeta);

  const groundWrap = document.createElement("div");
  groundWrap.className = "export-ground-wrap";
  const groundClone = groundCircle.cloneNode(true);
  groundClone
    .querySelectorAll(".boundary-overlay, .shot-overlay")
    .forEach((overlayNode) => overlayNode.remove());
  const exportShotLayer = createShotArrowLayer(groundClone);
  groundWrap.appendChild(groundClone);

  const legend = document.createElement("div");
  legend.className = "export-legend";

  RUN_VALUES.forEach((runValue) => {
    const item = document.createElement("div");
    item.className = "export-legend-item";

    const swatch = document.createElement("span");
    swatch.className = "export-legend-swatch";
    swatch.style.backgroundColor =
      state.wagonWheel.runColors[runValue] || RUN_COLOR_MAP[runValue] || "#f4f2ea";

    const label = document.createElement("span");
    label.className = "export-legend-label";
    label.textContent = runValue === 1 ? "1 Run" : `${runValue} Runs`;

    item.appendChild(swatch);
    item.appendChild(label);
    legend.appendChild(item);
  });

  const summary = document.createElement("p");
  summary.className = "export-summary";
  summary.textContent = `${totalRuns} Run${totalRuns === 1 ? "" : "s"} | ${totalBalls} Ball${totalBalls === 1 ? "" : "s"}`;

  root.appendChild(header);
  root.appendChild(groundWrap);
  root.appendChild(legend);
  root.appendChild(summary);

  document.body.appendChild(root);
  const exportGroundRect = groundClone.getBoundingClientRect();
  renderShotLinesForLayer(exportShotLayer, exportGroundRect, playerShots);
  exportRootNode = root;
  return root;
}

async function downloadWagonWheelImage() {
  if (typeof window.html2canvas !== "function") {
    return;
  }

  const exportContainer = createExportContainer();
  const canvas = await window.html2canvas(exportContainer, {
    scale: 3,
    useCORS: true,
    backgroundColor: null,
  });

  const selected = getSelectedPlayer();
  const safePlayerName = sanitizeFileName(selected?.name || "player");
  const safeDate = formatFileDate(state.viewedInningsSavedAt || new Date().toISOString());
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/jpeg", 0.92);
  link.download = `${safePlayerName}_${safeDate}_wagon_wheel.jpg`;
  link.click();
  removeExportRootNode();
}

async function exportWagonWheelImageDataForHistory(requestId) {
  if (typeof window.html2canvas !== "function" || !requestId) {
    return;
  }

  const exportContainer = createExportContainer();
  const canvas = await window.html2canvas(exportContainer, {
    scale: 3,
    useCORS: true,
    backgroundColor: null,
  });

  const selected = getSelectedPlayer();
  const safePlayerName = sanitizeFileName(selected?.name || "player");
  const safeDate = formatFileDate(state.viewedInningsSavedAt || new Date().toISOString());
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const fileName = `${safePlayerName}_${safeDate}_wagon_wheel.jpg`;
  removeExportRootNode();

  if (window.parent && window.parent !== window) {
    window.parent.postMessage(
      {
        type: HISTORY_EXPORT_EVENT,
        requestId,
        dataUrl,
        fileName,
      },
      window.location.origin
    );
  }
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

  if (undoShotButton) {
    undoShotButton.addEventListener("click", () => {
      undoLastShot();
    });
  }

  if (clearShotsButton) {
    clearShotsButton.addEventListener("click", () => {
      clearAllShots();
    });
  }

  if (downloadImageButton) {
    downloadImageButton.addEventListener("click", async () => {
      await downloadWagonWheelImage();
    });
  }

  if (returnDashboardButton) {
    returnDashboardButton.addEventListener("click", () => {
      window.location.href = "dashboard.html";
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

function createShotArrowLayer(stage) {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.classList.add("shot-overlay");
  svg.setAttribute("preserveAspectRatio", "none");
  stage.appendChild(svg);
  return svg;
}

function getFixedShotStart(groundRect) {
  return {
    x: groundRect.width * SHOT_START_POINT.xRatio,
    y: groundRect.height * SHOT_START_POINT.yRatio,
  };
}

function toNormalizedPoint(point, rect) {
  return {
    x: point.x,
    y: point.y,
    xRatio: rect.width > 0 ? point.x / rect.width : 0,
    yRatio: rect.height > 0 ? point.y / rect.height : 0,
  };
}

function fromNormalizedPoint(point, rect) {
  const hasRatios = Number.isFinite(Number(point?.xRatio)) && Number.isFinite(Number(point?.yRatio));
  if (hasRatios) {
    return {
      x: Number(point.xRatio) * rect.width,
      y: Number(point.yRatio) * rect.height,
    };
  }

  return {
    x: Number(point?.x) || 0,
    y: Number(point?.y) || 0,
  };
}

function isInsideGroundCircle(point, groundRect) {
  const centerX = groundRect.width / 2;
  const centerY = groundRect.height / 2;
  const radius = Math.min(groundRect.width, groundRect.height) / 2;
  const dx = point.x - centerX;
  const dy = point.y - centerY;
  return dx * dx + dy * dy <= radius * radius;
}

function getBoundaryDistanceAlongDirection(start, direction, groundRect) {
  const centerX = groundRect.width / 2;
  const centerY = groundRect.height / 2;
  const radius = Math.min(groundRect.width, groundRect.height) / 2;
  const dx = start.x - centerX;
  const dy = start.y - centerY;

  const a = direction.x * direction.x + direction.y * direction.y;
  const b = 2 * (dx * direction.x + dy * direction.y);
  const c = dx * dx + dy * dy - radius * radius;
  const discriminant = b * b - 4 * a * c;

  if (!Number.isFinite(discriminant) || discriminant < 0) {
    return 0;
  }

  const sqrtDiscriminant = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDiscriminant) / (2 * a);
  const t2 = (-b + sqrtDiscriminant) / (2 * a);
  const positive = [t1, t2].filter((value) => Number.isFinite(value) && value > 0);
  if (positive.length === 0) {
    return 0;
  }

  return Math.max(...positive);
}

function computeShotEndpointByRun(runValue, clickPoint, groundRect) {
  const start = getFixedShotStart(groundRect);
  const vectorX = clickPoint.x - start.x;
  const vectorY = clickPoint.y - start.y;
  const rawDistance = Math.hypot(vectorX, vectorY);

  const unitDirection = rawDistance > 0
    ? { x: vectorX / rawDistance, y: vectorY / rawDistance }
    : { x: 0, y: -1 };

  const boundaryDistance = getBoundaryDistanceAlongDirection(start, unitDirection, groundRect);
  const safeInsideDistance = Math.max(boundaryDistance * 0.995, 0);
  const minOutsideDistance = boundaryDistance;
  const maxOutsideDistance = boundaryDistance * 1.1;

  let endpointDistance = rawDistance;

  if (runValue === 4 || runValue === 6) {
    endpointDistance = Math.min(Math.max(rawDistance, minOutsideDistance), maxOutsideDistance);
  } else {
    endpointDistance = Math.min(rawDistance, safeInsideDistance);
  }

  return {
    start,
    end: {
      x: start.x + unitDirection.x * endpointDistance,
      y: start.y + unitDirection.y * endpointDistance,
    },
  };
}

function appendShot(runValue, endPoint, groundRect) {
  const color = state.wagonWheel.runColors[runValue] || RUN_COLOR_MAP[runValue] || "#f4f2ea";
  const shotPath = computeShotEndpointByRun(runValue, endPoint, groundRect);
  const selectedPlayer = getSelectedPlayer();
  const playerId = selectedPlayer?.id || "player-1";

  if (!Array.isArray(state.wagonWheel.shotsByPlayer[playerId])) {
    state.wagonWheel.shotsByPlayer[playerId] = [];
  }

  const playerShots = state.wagonWheel.shotsByPlayer[playerId];

  playerShots.push({
    runValue,
    color,
    start: toNormalizedPoint(shotPath.start, groundRect),
    end: toNormalizedPoint(shotPath.end, groundRect),
  });
}

function undoLastShot() {
  const selectedPlayer = getSelectedPlayer();
  const playerId = selectedPlayer?.id || "player-1";
  const playerShots = getPlayerShots(playerId);

  if (playerShots.length === 0) {
    return;
  }

  playerShots.pop();
  renderShotArrows();
  renderTopRightSummaryCard();
  saveInningsState();
}

function clearAllShots() {
  state.wagonWheel.shotsByPlayer = {};
  renderShotArrows();
  renderTopRightSummaryCard();
  saveInningsState();
}

function renderShotArrows() {
  if (!shotArrowLayer || !groundCircle) {
    return;
  }

  const groundRect = groundCircle.getBoundingClientRect();
  const selectedPlayer = getSelectedPlayer();
  const playerId = selectedPlayer?.id || "";
  const playerShots = getPlayerShots(playerId);

  renderShotLinesForLayer(shotArrowLayer, groundRect, playerShots);
}

function renderShotLinesForLayer(targetLayer, groundRect, shots) {
  if (!targetLayer || !groundRect) {
    return;
  }

  const width = Number(groundRect.width) || 0;
  const height = Number(groundRect.height) || 0;
  if (width <= 0 || height <= 0) {
    return;
  }

  targetLayer.setAttribute("viewBox", `0 0 ${width} ${height}`);
  targetLayer.innerHTML = "";

  shots.forEach((shot, index) => {
    const start = fromNormalizedPoint(shot.start, groundRect);
    const end = fromNormalizedPoint(shot.end, groundRect);
    const color = String(shot?.color || "");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.classList.add("shot-arrow-path");
    path.dataset.shotIndex = String(index);
    path.setAttribute("d", `M ${start.x} ${start.y} L ${end.x} ${end.y}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", color || RUN_COLOR_MAP[Number(shot?.runValue)] || "#f4f2ea");
    path.setAttribute("stroke-width", "2.8");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("opacity", "0.94");
    targetLayer.appendChild(path);
  });
}

function setupShotCapture() {
  if (!groundCircle || !groundStage) {
    return;
  }

  shotArrowLayer = createShotArrowLayer(groundCircle);
  renderShotArrows();

  groundStage.addEventListener("click", (event) => {
    const runValue = state.wagonWheel.selectedRun;
    if (!state.wagonWheel.enabled || !Number.isInteger(runValue)) {
      return;
    }

    const groundRect = groundCircle.getBoundingClientRect();
    const clickPoint = {
      x: event.clientX - groundRect.left,
      y: event.clientY - groundRect.top,
    };

    const clickedInsideBoundary = isInsideGroundCircle(clickPoint, groundRect);
    const isBoundaryRun = runValue === 4 || runValue === 6;

    if (isBoundaryRun && clickedInsideBoundary) {
      return;
    }

    if (!isBoundaryRun && !clickedInsideBoundary) {
      return;
    }

    const clickSignature = `${runValue}:${clickPoint.x.toFixed(2)}:${clickPoint.y.toFixed(2)}`;
    const now = performance.now();
    if (
      lastShotClickSignature &&
      lastShotClickSignature.signature === clickSignature &&
      now - lastShotClickSignature.time < 90
    ) {
      return;
    }

    lastShotClickSignature = {
      signature: clickSignature,
      time: now,
    };

    appendShot(runValue, clickPoint, groundRect);
    renderShotArrows();
    renderTopRightSummaryCard();
    saveInningsState();
  });

  window.addEventListener("resize", renderShotArrows);
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
setupShotCapture();
applyHistoryDetailReadOnlyMode();
render();

if (shouldAutoDownloadHistoryExport()) {
  const embeddedRequestId = getEmbeddedHistoryExportRequestId();
  localStorage.removeItem(HISTORY_AUTO_EXPORT_KEY);

  if (embeddedRequestId) {
    window.setTimeout(async () => {
      await exportWagonWheelImageDataForHistory(embeddedRequestId);
    }, 120);
  } else {
    window.setTimeout(async () => {
      await downloadWagonWheelImage();
      if (window.opener) {
        window.close();
      }
    }, 120);
  }
}

if (REVIEW_GROUND_OVERLAY_ENABLED) {
  window.addEventListener("resize", rerenderGroundOverlay);
}
