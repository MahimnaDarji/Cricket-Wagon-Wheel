const tabs = {
  login: {
    tab: document.getElementById("tab-login"),
    panel: document.getElementById("panel-login"),
  },
  signup: {
    tab: document.getElementById("tab-signup"),
    panel: document.getElementById("panel-signup"),
  },
};

const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const guestButton = document.getElementById("guest-btn");

const loginFeedback = document.getElementById("login-feedback");
const signupFeedback = document.getElementById("signup-feedback");
const guestFeedback = document.getElementById("guest-feedback");
const signupEmailInput = document.getElementById("signup-email");
const signupPasswordInput = document.getElementById("signup-password");
const signupEmailError = document.getElementById("signup-email-error");
const signupPasswordError = document.getElementById("signup-password-error");
const fieldStage = document.querySelector(".field-stage");
const pitchStrip = document.querySelector(".pitch-strip");
const outerFieldRing = document.querySelector(".outer-field-ring");
const strikerCrease = document.querySelector(".crease.top");

const AUTH_BACKEND_ORIGIN =
  window.location.origin === "http://localhost:5000"
    ? ""
    : "http://localhost:5000";

function toAuthUrl(path) {
  return `${AUTH_BACKEND_ORIGIN}${path}`;
}

function switchTab(target) {
  Object.entries(tabs).forEach(([key, value]) => {
    const isActive = key === target;
    value.tab.classList.toggle("active", isActive);
    value.tab.setAttribute("aria-selected", String(isActive));
    value.panel.classList.toggle("active", isActive);

    if (isActive) {
      value.panel.removeAttribute("hidden");
    } else {
      value.panel.setAttribute("hidden", "true");
    }
  });
}

function clearFieldStates(form) {
  form.querySelectorAll("input").forEach((input) => {
    input.classList.remove("input-error", "input-success");
  });
}

function markFields(form, invalidNames) {
  form.querySelectorAll("input").forEach((input) => {
    const invalid = invalidNames.includes(input.name);
    input.classList.toggle("input-error", invalid);
    input.classList.toggle("input-success", !invalid && input.value.trim().length > 0);
  });
}

function setFeedback(target, type, messages) {
  target.className = `feedback state ${type}`;
  target.innerHTML = messages.map((message) => `<div>${message}</div>`).join("");
}

function clearFeedback(target) {
  target.className = "feedback";
  target.textContent = "";
}

async function postJson(url, payload) {
  const response = await fetch(toAuthUrl(url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  let responseData = null;
  try {
    responseData = await response.json();
  } catch {
    responseData = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data: responseData,
  };
}

function validateEmail(email) {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
}

function validatePassword(password) {
  const issues = [];

  if (password.length < 8) {
    issues.push("Use at least 8 characters.");
  }
  if (!/[A-Z]/.test(password)) {
    issues.push("Add at least one uppercase letter.");
  }
  if (!/[a-z]/.test(password)) {
    issues.push("Add at least one lowercase letter.");
  }
  if (!/\d/.test(password)) {
    issues.push("Add at least one number.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    issues.push("Add at least one special character.");
  }

  return issues;
}

function setInlineFieldError(target, messages) {
  if (!target) {
    return;
  }

  if (!messages || messages.length === 0) {
    target.textContent = "";
    return;
  }

  target.innerHTML = messages.map((message) => `<div>${message}</div>`).join("");
}

function setupSignupRealtimeValidation() {
  if (!signupEmailInput || !signupPasswordInput) {
    return;
  }

  signupEmailInput.addEventListener("input", () => {
    const email = signupEmailInput.value.trim();

    if (!email) {
      signupEmailInput.classList.remove("input-error", "input-success");
      setInlineFieldError(signupEmailError, []);
      return;
    }

    if (!validateEmail(email)) {
      signupEmailInput.classList.add("input-error");
      signupEmailInput.classList.remove("input-success");
      setInlineFieldError(signupEmailError, ["Please enter a valid email address."]);
      return;
    }

    signupEmailInput.classList.remove("input-error");
    signupEmailInput.classList.add("input-success");
    setInlineFieldError(signupEmailError, []);
  });

  signupPasswordInput.addEventListener("input", () => {
    const password = signupPasswordInput.value;

    if (!password) {
      signupPasswordInput.classList.remove("input-error", "input-success");
      setInlineFieldError(signupPasswordError, []);
      return;
    }

    const issues = validatePassword(password);
    if (issues.length > 0) {
      signupPasswordInput.classList.add("input-error");
      signupPasswordInput.classList.remove("input-success");
      setInlineFieldError(signupPasswordError, issues);
      return;
    }

    signupPasswordInput.classList.remove("input-error");
    signupPasswordInput.classList.add("input-success");
    setInlineFieldError(signupPasswordError, []);
  });
}

function setupTabs() {
  tabs.login.tab.addEventListener("click", () => switchTab("login"));
  tabs.signup.tab.addEventListener("click", () => switchTab("signup"));
}

function setupLoginValidation() {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFieldStates(loginForm);
    clearFeedback(loginFeedback);

    const formData = new FormData(loginForm);
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");

    const errors = [];
    const invalidNames = [];

    if (!email) {
      errors.push("Email is required.");
      invalidNames.push("email");
    } else if (!validateEmail(email)) {
      errors.push("Please enter a valid email address.");
      invalidNames.push("email");
    }

    if (!password) {
      errors.push("Password is required.");
      invalidNames.push("password");
    }

    if (errors.length > 0) {
      markFields(loginForm, invalidNames);
      setFeedback(loginFeedback, "error", errors);
      return;
    }

    markFields(loginForm, []);

    try {
      const result = await postJson("/login", { email, password });
      if (!result.ok) {
        const message = result.data?.message || "Login failed. Please try again.";
        setFeedback(loginFeedback, "error", [message]);
        return;
      }

      setFeedback(loginFeedback, "success", [result.data?.message || "Login successful."]);
      window.setTimeout(() => {
        window.location.href = toAuthUrl("/dashboard.html");
      }, 350);
    } catch (_error) {
      setFeedback(loginFeedback, "error", ["Unable to connect to the server. Please try again."]);
    }
  });
}

function setupSignupValidation() {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFieldStates(signupForm);
    clearFeedback(signupFeedback);
    setInlineFieldError(signupEmailError, []);
    setInlineFieldError(signupPasswordError, []);

    const formData = new FormData(signupForm);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    const errors = [];
    const invalidNames = [];

    if (!name) {
      errors.push("Name is required.");
      invalidNames.push("name");
    }

    if (!email) {
      errors.push("Email is required.");
      invalidNames.push("email");
    } else if (!validateEmail(email)) {
      errors.push("Please enter a valid email address.");
      invalidNames.push("email");
      setInlineFieldError(signupEmailError, ["Please enter a valid email address."]);
    }

    if (!password) {
      errors.push("Password is required.");
      invalidNames.push("password");
    } else {
      const passwordIssues = validatePassword(password);
      if (passwordIssues.length > 0) {
        errors.push(...passwordIssues);
        invalidNames.push("password");
        setInlineFieldError(signupPasswordError, passwordIssues);
      }
    }

    if (!confirmPassword) {
      errors.push("Confirm your password.");
      invalidNames.push("confirmPassword");
    } else if (password !== confirmPassword) {
      errors.push("Passwords do not match.");
      invalidNames.push("confirmPassword");
    }

    if (errors.length > 0) {
      markFields(signupForm, invalidNames);
      setFeedback(signupFeedback, "error", errors);
      return;
    }

    markFields(signupForm, []);

    try {
      const result = await postJson("/signup", { name, email, password });
      if (!result.ok) {
        const responseErrors = Array.isArray(result.data?.errors) ? result.data.errors : [];
        const fallbackMessage = result.data?.message || "Unable to create account. Please try again.";
        setFeedback(signupFeedback, "error", responseErrors.length > 0 ? responseErrors : [fallbackMessage]);
        return;
      }

      setFeedback(signupFeedback, "success", [result.data?.message || `Welcome, ${name}! Your account setup is complete.`]);
      signupForm.reset();
      clearFieldStates(signupForm);
      setInlineFieldError(signupEmailError, []);
      setInlineFieldError(signupPasswordError, []);
    } catch (_error) {
      setFeedback(signupFeedback, "error", ["Unable to connect to the server. Please try again."]);
    }
  });
}

function setupGoogleButtons() {
  document.querySelectorAll("[data-google-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.getAttribute("data-google-action") === "signup" ? "signup" : "login";
      window.location.href = toAuthUrl(`/auth/google?mode=${action}`);
    });
  });
}

async function checkAuthenticatedUser() {
  try {
    const response = await fetch(toAuthUrl("/auth/me"), { method: "GET", credentials: "include" });
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user || null;
  } catch (_error) {
    return null;
  }
}

async function setupOAuthResultFeedback() {
  const params = new URLSearchParams(window.location.search);
  const auth = params.get("auth");
  const mode = params.get("mode") === "signup" ? "signup" : "login";

  if (!auth) {
    return;
  }

  const target = mode === "signup" ? signupFeedback : loginFeedback;
  clearFeedback(target);

  if (auth === "success") {
    const user = await checkAuthenticatedUser();
    if (user) {
      setFeedback(target, "success", [`Google authentication successful. Welcome ${user.name}.`]);
    } else {
      setFeedback(target, "error", ["Google authentication finished, but session was not found."]);
    }
  } else {
    setFeedback(target, "error", ["Google authentication failed. Please try again."]);
  }

  window.history.replaceState({}, document.title, window.location.pathname);
}

function setupGuestAction() {
  guestButton.addEventListener("click", () => {
    clearFeedback(guestFeedback);
    setFeedback(guestFeedback, "success", ["Guest mode enabled. Opening read-only dashboards..."]);
  });
}

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function createShotLayer(stage) {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  svg.classList.add("shot-overlay");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");

  const referencePath = document.createElementNS(namespace, "path");
  referencePath.classList.add("shot-reference-path");

  const activeTrail = document.createElementNS(namespace, "path");
  activeTrail.classList.add("shot-active-trail");

  svg.appendChild(referencePath);
  svg.appendChild(activeTrail);

  const ball = document.createElement("div");
  ball.classList.add("wagon-ball");

  stage.appendChild(svg);
  stage.appendChild(ball);

  return { svg, referencePath, activeTrail, ball };
}

function getReplayGeometry() {
  const stageRect = fieldStage.getBoundingClientRect();
  const pitchRect = pitchStrip.getBoundingClientRect();
  const ringRect = outerFieldRing.getBoundingClientRect();
  const creaseRect = strikerCrease?.getBoundingClientRect();

  const startX = creaseRect
    ? creaseRect.left + creaseRect.width / 2 - stageRect.left
    : pitchRect.left + pitchRect.width / 2 - stageRect.left;

  const startY = creaseRect
    ? creaseRect.top + creaseRect.height / 2 - stageRect.top
    : pitchRect.top + pitchRect.height * 0.14 - stageRect.top;

  return {
    width: stageRect.width,
    height: stageRect.height,
    startX,
    startY,
    ringCenterX: ringRect.left + ringRect.width / 2 - stageRect.left,
    ringCenterY: ringRect.top + ringRect.height / 2 - stageRect.top,
    ringRadiusX: ringRect.width / 2,
    ringRadiusY: ringRect.height / 2,
  };
}

function normalizeDistance(distance) {
  if (!Number.isFinite(distance)) {
    return 1;
  }

  if (distance > 1) {
    return Math.min(Math.max(distance / 100, 0), 1);
  }

  return Math.min(Math.max(distance, 0), 1);
}

function getBoundaryIntersectionDistance(start, direction, geometry) {
  const offsetX = start.x - geometry.ringCenterX;
  const offsetY = start.y - geometry.ringCenterY;

  const a =
    (direction.x * direction.x) / (geometry.ringRadiusX * geometry.ringRadiusX) +
    (direction.y * direction.y) / (geometry.ringRadiusY * geometry.ringRadiusY);
  const b =
    (2 * offsetX * direction.x) / (geometry.ringRadiusX * geometry.ringRadiusX) +
    (2 * offsetY * direction.y) / (geometry.ringRadiusY * geometry.ringRadiusY);
  const c =
    (offsetX * offsetX) / (geometry.ringRadiusX * geometry.ringRadiusX) +
    (offsetY * offsetY) / (geometry.ringRadiusY * geometry.ringRadiusY) -
    1;

  const discriminant = b * b - 4 * a * c;
  if (!Number.isFinite(discriminant) || discriminant < 0) {
    return 0;
  }

  const sqrtDiscriminant = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDiscriminant) / (2 * a);
  const t2 = (-b + sqrtDiscriminant) / (2 * a);
  const candidates = [t1, t2].filter((value) => Number.isFinite(value) && value > 0);

  if (candidates.length === 0) {
    return 0;
  }

  return Math.max(...candidates);
}

function buildShotPath(geometry, shot) {
  const angleRadians = (shot.angle * Math.PI) / 180;
  const direction = {
    x: Math.cos(angleRadians),
    y: Math.sin(angleRadians),
  };

  const start = {
    x: geometry.startX,
    y: geometry.startY,
  };

  const travel = getBoundaryIntersectionDistance(start, direction, geometry);

  const end = {
    x: start.x + direction.x * travel,
    y: start.y + direction.y * travel,
  };

  const control = {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2,
  };

  return { start, control, end };
}

function pointOnQuadratic(path, t) {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * path.start.x + 2 * inverse * t * path.control.x + t * t * path.end.x,
    y: inverse * inverse * path.start.y + 2 * inverse * t * path.control.y + t * t * path.end.y,
  };
}

function toPathD(path) {
  return `M ${path.start.x.toFixed(2)} ${path.start.y.toFixed(2)} Q ${path.control.x.toFixed(2)} ${path.control.y.toFixed(2)} ${path.end.x.toFixed(2)} ${path.end.y.toFixed(2)}`;
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function animateShot(pathLayer, path, durationMs) {
  return new Promise((resolve) => {
    const startTime = performance.now();
    pathLayer.referencePath.setAttribute("d", toPathD(path));
    pathLayer.activeTrail.style.opacity = "1";
    pathLayer.ball.style.opacity = "1";

    function frame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = easeOutCubic(progress);

      const head = pointOnQuadratic(path, easedProgress);
      const tailProgress = Math.max(0, easedProgress - 0.12);
      const tail = pointOnQuadratic(path, tailProgress);

      pathLayer.ball.style.left = `${head.x}px`;
      pathLayer.ball.style.top = `${head.y}px`;
      pathLayer.activeTrail.setAttribute("d", `M ${tail.x.toFixed(2)} ${tail.y.toFixed(2)} L ${head.x.toFixed(2)} ${head.y.toFixed(2)}`);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(frame);
  });
}

async function replayShotsSequentially(pathLayer, shots, pauseMs, targetCycleMs) {
  if (!fieldStage || !pitchStrip || !outerFieldRing || !Array.isArray(shots) || shots.length === 0) {
    return;
  }

  const availableMotionBudget = Math.max(3000, targetCycleMs - shots.length * pauseMs);
  const weightedDistances = shots.map((shot) => 0.65 + normalizeDistance(shot.distance) * 0.7);
  const totalWeight = weightedDistances.reduce((sum, value) => sum + value, 0);

  for (let index = 0; index < shots.length; index += 1) {
    const shot = shots[index];
    const geometry = getReplayGeometry();
    const path = buildShotPath(geometry, shot);

    const weightedShare = weightedDistances[index] / totalWeight;
    const duration = Math.max(500, Math.min(2200, availableMotionBudget * weightedShare));

    await animateShot(pathLayer, path, duration);
    await wait(pauseMs);
  }

  pathLayer.activeTrail.style.opacity = "0";
}

function setupShotReplay() {
  const sectorCount = 8;
  const sectorAngle = 360 / sectorCount;
  const firstSectorStart = -180;
  const shotQueue = Array.from({ length: sectorCount }, (_, index) => ({
    angle: firstSectorStart + sectorAngle * index + sectorAngle / 2,
    distance: 1,
    curve: 0,
  }));

  const pathLayer = createShotLayer(fieldStage);
  const pauseBetweenShots = 420;
  const targetCycleDuration = 10000;

  async function runLoop() {
    while (true) {
      await replayShotsSequentially(pathLayer, shotQueue, pauseBetweenShots, targetCycleDuration);
    }
  }

  runLoop();
}

setupTabs();
setupLoginValidation();
setupSignupValidation();
setupSignupRealtimeValidation();
setupGoogleButtons();
setupGuestAction();
setupOAuthResultFeedback();
setupShotReplay();
