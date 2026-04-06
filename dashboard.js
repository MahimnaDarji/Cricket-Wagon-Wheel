const modePresetButton = document.getElementById("mode-preset");
const modeCustomButton = document.getElementById("mode-custom");

const presetControls = document.getElementById("preset-controls");
const customControls = document.getElementById("custom-controls");

const stadiumPreset = document.getElementById("stadium-preset");
const applyCustomBoundariesButton = document.getElementById("apply-custom-boundaries");

const liveMode = document.getElementById("live-mode");
const liveStadium = document.getElementById("live-stadium");
const liveBoundaries = document.getElementById("live-boundaries");

const groundStage = document.querySelector(".ground-stage");
const groundCircle = document.querySelector(".ground-circle");
const pitchStrip = document.querySelector(".pitch-strip");
const strikerCrease = document.querySelector(".crease.top");

const boundaryFieldConfig = [
  { name: "Third Man", angle: -135, inputId: "custom-fine-leg" },
  { name: "Long Stop", angle: -90, inputId: "custom-straight" },
  { name: "Fine Leg", angle: -45, inputId: "custom-extra-cover" },
  { name: "Deep Square Leg", angle: 0, inputId: "custom-cover-point" },
  { name: "Cow Corner", angle: 45, inputId: "custom-deep-point" },
  { name: "Straight Down Ground", angle: 90, inputId: "custom-straight-down" },
  { name: "Extra Cover", angle: 135, inputId: "custom-deep-midwicket" },
  { name: "Deep Point", angle: 180, inputId: "custom-square-leg" },
];

const presets = {
  mcg: { name: "Melbourne Cricket Ground", boundaries: [69, 83, 72, 70, 78, 84, 80, 74] },
  lords: { name: "Lord's", boundaries: [59, 72, 65, 69, 73, 76, 67, 62] },
  wankhede: { name: "Wankhede Stadium", boundaries: [63, 70, 66, 63, 69, 74, 71, 64] },
  eden: { name: "Eden Gardens", boundaries: [61, 74, 68, 67, 72, 76, 70, 65] },
};

const customBoundaryInputs = boundaryFieldConfig.map((field) => {
  return document.getElementById(field.inputId);
});

let activeMode = "preset";
let currentStadiumName = presets[stadiumPreset.value].name;
let activeBoundaryValues = [...presets[stadiumPreset.value].boundaries];
let activeBoundaryLabels = activeBoundaryValues.map((value) => `${Math.round(value)}M`);
let activeBoundaryScale = activeBoundaryValues.map(() => 1);
let boundaryReplayLayer = null;
let boundaryReplayRunId = 0;

function saveGroundSetup() {
  const payload = {
    mode: activeMode,
    stadiumName: currentStadiumName,
    boundaries: boundaryFieldConfig.map((field, index) => ({
      name: field.name,
      value: activeBoundaryValues[index],
      label: activeBoundaryLabels[index] || "",
    })),
    savedAt: new Date().toISOString(),
  };

  localStorage.setItem("groundSetup", JSON.stringify(payload));
}

function clampBoundary(value) {
  if (!Number.isFinite(value)) {
    return NaN;
  }

  return Math.min(90, Math.max(55, value));
}

function clearCustomBoundaryInputs() {
  customBoundaryInputs.forEach((input) => {
    if (!input) {
      return;
    }

    input.value = "";
    input.setCustomValidity("");
  });
}

function getCustomBoundaryValues() {
  return customBoundaryInputs.map((input) => {
    const raw = input?.value?.trim() || "";
    if (!input || raw.length === 0) {
      if (input) {
        input.setCustomValidity("");
      }
      return null;
    }

    const numericValue = Number(raw);
    const value = clampBoundary(numericValue);
    if (!Number.isFinite(numericValue) || !Number.isFinite(value) || value !== numericValue) {
      input.setCustomValidity("Enter a value from 55 to 90.");
      return null;
    }

    input.setCustomValidity("");
    return value;
  });
}

function setCustomBoundaryValues(values) {
  customBoundaryInputs.forEach((input, index) => {
    if (!input) {
      return;
    }

    input.value = values[index];
  });
}

function syncInputsFromPreset() {
  const selectedPreset = presets[stadiumPreset.value] || presets.mcg;
  setCustomBoundaryValues(selectedPreset.boundaries);
  currentStadiumName = selectedPreset.name;
}

function updateBoundaryStateFromMode() {
  if (activeMode === "preset") {
    const selectedPreset = presets[stadiumPreset.value] || presets.mcg;
    activeBoundaryValues = [...selectedPreset.boundaries];
  } else {
    activeBoundaryValues = getCustomBoundaryValues();
  }

  activeBoundaryScale = activeBoundaryValues.map((value) => {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return 1;
  });
  activeBoundaryLabels = activeBoundaryValues.map((value) => {
    if (!Number.isFinite(value)) {
      return "";
    }

    return `${Math.round(value)}M`;
  });
}

function updateLiveArea() {
  const modeLabel = activeMode === "preset" ? "Preset" : "Custom";
  liveMode.textContent = `Mode: ${modeLabel}`;
  liveStadium.textContent = `Stadium: ${currentStadiumName}`;

  const lines = boundaryFieldConfig.map((field, index) => {
    return `${field.name}: ${activeBoundaryLabels[index] || ""}`;
  });
  liveBoundaries.innerHTML = lines.join("<br>");
  saveGroundSetup();
}

function refreshVisibleBoundaryLabels() {
  if (!boundaryReplayLayer) {
    return;
  }

  boundaryReplayLayer.settledGroup.querySelectorAll(".boundary-arrow-label").forEach((label) => {
    const index = Number(label.dataset.index);
    if (Number.isFinite(index) && activeBoundaryLabels[index]) {
      label.textContent = activeBoundaryLabels[index];
    }
  });
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
  marker.setAttribute("id", "boundary-arrow-head");
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
  settledGroup.classList.add("shot-settled-group");

  const activePath = document.createElementNS(namespace, "path");
  activePath.classList.add("boundary-arrow-active");
  activePath.setAttribute("marker-end", "url(#boundary-arrow-head)");

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
      settledPath.setAttribute("marker-end", "url(#boundary-arrow-head)");
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

async function playBoundaryArrowsOnce(layer, directions, runId) {
  layer.settledGroup.innerHTML = "";
  layer.activePath.setAttribute("d", "");
  layer.activePath.style.opacity = "0";

  for (let index = 0; index < directions.length; index += 1) {
    if (runId !== boundaryReplayRunId) {
      return;
    }

    const directionInfo = directions[index];
    const geometry = getGroundGeometry();
    const scaleFactor = activeBoundaryScale[index] ?? 1;
    const labelText = activeBoundaryLabels[index] || "";

    if (scaleFactor <= 0 || labelText.length === 0) {
      continue;
    }

    const path = buildArrowPath(geometry, directionInfo.angle, scaleFactor);
    await animateArrow(layer, path, 780, index, labelText, runId);
    await wait(220);
  }
}

function rerenderBoundaryReplay() {
  if (!boundaryReplayLayer) {
    return;
  }

  boundaryReplayRunId += 1;
  const runId = boundaryReplayRunId;
  playBoundaryArrowsOnce(boundaryReplayLayer, boundaryFieldConfig, runId);
}

function clearRenderedArrows() {
  boundaryReplayRunId += 1;
  if (!boundaryReplayLayer) {
    return;
  }

  boundaryReplayLayer.settledGroup.innerHTML = "";
  boundaryReplayLayer.activePath.setAttribute("d", "");
  boundaryReplayLayer.activePath.style.opacity = "0";
}

function setupBoundaryReplay() {
  if (!groundCircle || !pitchStrip || !strikerCrease) {
    return;
  }

  boundaryReplayLayer = createArrowLayer(groundCircle);
  rerenderBoundaryReplay();
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
    updateBoundaryStateFromMode();
    refreshVisibleBoundaryLabels();
    updateLiveArea();
    rerenderBoundaryReplay();
  } else {
    currentStadiumName = "Custom Ground";
    clearCustomBoundaryInputs();
    updateBoundaryStateFromMode();
    refreshVisibleBoundaryLabels();
    updateLiveArea();
    clearRenderedArrows();
  }
}

function applyCustomBoundaries() {
  if (activeMode !== "custom") {
    return;
  }

  updateBoundaryStateFromMode();

  const invalidInput = customBoundaryInputs.find((input) => {
    if (!input) {
      return false;
    }

    if (input.value.trim().length === 0) {
      return true;
    }

    return !input.checkValidity();
  });
  if (invalidInput) {
    invalidInput.reportValidity();
    clearRenderedArrows();
    updateLiveArea();
    return;
  }

  refreshVisibleBoundaryLabels();
  updateLiveArea();
  rerenderBoundaryReplay();
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
  updateBoundaryStateFromMode();
  refreshVisibleBoundaryLabels();
  updateLiveArea();
  rerenderBoundaryReplay();
});

if (applyCustomBoundariesButton) {
  applyCustomBoundariesButton.addEventListener("click", () => {
    applyCustomBoundaries();
  });
}

customBoundaryInputs.forEach((input) => {
  if (!input) {
    return;
  }

  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    applyCustomBoundaries();
  });
});

syncInputsFromPreset();
updateBoundaryStateFromMode();
updateLiveArea();
setupBoundaryReplay();
