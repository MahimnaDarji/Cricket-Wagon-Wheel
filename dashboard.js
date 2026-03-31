const modePresetButton = document.getElementById("mode-preset");
const modeCustomButton = document.getElementById("mode-custom");

const presetControls = document.getElementById("preset-controls");
const customControls = document.getElementById("custom-controls");

const stadiumPreset = document.getElementById("stadium-preset");
const straightBoundaryInput = document.getElementById("straight-boundary");
const squareBoundaryInput = document.getElementById("square-boundary");

const liveMode = document.getElementById("live-mode");
const liveStadium = document.getElementById("live-stadium");
const liveBoundaries = document.getElementById("live-boundaries");

const groundStage = document.querySelector(".ground-stage");
const straightMarker = document.getElementById("straight-marker");
const squareMarker = document.getElementById("square-marker");

const presets = {
  mcg: { name: "Melbourne Cricket Ground", straight: 72, square: 67 },
  lords: { name: "Lord's Cricket Ground", straight: 69, square: 64 },
  wankhede: { name: "Wankhede Stadium", straight: 74, square: 67 },
  eden: { name: "Eden Gardens", straight: 71, square: 66 },
};

let activeMode = "preset";
let currentStadiumName = presets[stadiumPreset.value].name;

function clampBoundary(value) {
  if (!Number.isFinite(value)) {
    return 65;
  }

  return Math.min(90, Math.max(55, value));
}

function metersToInset(value) {
  const minMeters = 55;
  const maxMeters = 90;
  const maxInset = 16;
  const minInset = 5;
  const ratio = (clampBoundary(value) - minMeters) / (maxMeters - minMeters);
  return maxInset - ratio * (maxInset - minInset);
}

function updateGroundBoundary(straight, square) {
  const insetY = metersToInset(straight);
  const insetX = metersToInset(square);

  groundStage.style.setProperty("--boundary-inset-y", `${insetY.toFixed(2)}%`);
  groundStage.style.setProperty("--boundary-inset-x", `${insetX.toFixed(2)}%`);

  const innerInsetY = Math.min(34, insetY + 12.8);
  const innerInsetX = Math.min(34, insetX + 13.2);

  groundStage.style.setProperty("--inner-inset-y", `${innerInsetY.toFixed(2)}%`);
  groundStage.style.setProperty("--inner-inset-x", `${innerInsetX.toFixed(2)}%`);

  straightMarker.textContent = `Straight ${Math.round(straight)}m`;
  squareMarker.textContent = `Square ${Math.round(square)}m`;
}

function updateLiveArea(straight, square) {
  const modeLabel = activeMode === "preset" ? "Preset" : "Custom";

  liveMode.textContent = `Mode: ${modeLabel}`;
  liveStadium.textContent = `Stadium: ${currentStadiumName}`;
  liveBoundaries.textContent = `Straight: ${Math.round(straight)}m | Square: ${Math.round(square)}m`;
}

function getCurrentBoundaryValues() {
  return {
    straight: clampBoundary(Number(straightBoundaryInput.value)),
    square: clampBoundary(Number(squareBoundaryInput.value)),
  };
}

function syncInputsFromPreset() {
  const selectedPreset = presets[stadiumPreset.value];
  if (!selectedPreset) {
    return;
  }

  straightBoundaryInput.value = selectedPreset.straight;
  squareBoundaryInput.value = selectedPreset.square;
  currentStadiumName = selectedPreset.name;
}

function applyActiveState() {
  const usePreset = activeMode === "preset";

  modePresetButton.classList.toggle("active", usePreset);
  modePresetButton.setAttribute("aria-selected", String(usePreset));

  modeCustomButton.classList.toggle("active", !usePreset);
  modeCustomButton.setAttribute("aria-selected", String(!usePreset));

  presetControls.classList.toggle("is-hidden", !usePreset);
  customControls.classList.toggle("is-hidden", usePreset);

  if (usePreset) {
    syncInputsFromPreset();
  } else {
    currentStadiumName = "Custom Ground";
  }

  const { straight, square } = getCurrentBoundaryValues();
  updateGroundBoundary(straight, square);
  updateLiveArea(straight, square);
}

function handleBoundaryInput(inputElement) {
  const clampedValue = clampBoundary(Number(inputElement.value));
  inputElement.value = clampedValue;

  const { straight, square } = getCurrentBoundaryValues();
  updateGroundBoundary(straight, square);
  updateLiveArea(straight, square);
}

modePresetButton.addEventListener("click", () => {
  activeMode = "preset";
  applyActiveState();
});

modeCustomButton.addEventListener("click", () => {
  activeMode = "custom";
  applyActiveState();
});

stadiumPreset.addEventListener("change", () => {
  if (activeMode !== "preset") {
    return;
  }

  syncInputsFromPreset();
  const { straight, square } = getCurrentBoundaryValues();
  updateGroundBoundary(straight, square);
  updateLiveArea(straight, square);
});

straightBoundaryInput.addEventListener("input", () => {
  if (activeMode !== "custom") {
    return;
  }

  handleBoundaryInput(straightBoundaryInput);
});

squareBoundaryInput.addEventListener("input", () => {
  if (activeMode !== "custom") {
    return;
  }

  handleBoundaryInput(squareBoundaryInput);
});

applyActiveState();
