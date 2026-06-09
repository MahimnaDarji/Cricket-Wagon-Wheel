(() => {
  "use strict";

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

  const authToggle = document.querySelector(".auth-toggle");

  const forgotRequestPanel = document.getElementById("panel-forgot-request");
  const forgotVerifyPanel = document.getElementById("panel-forgot-verify");
  const forgotResetPanel = document.getElementById("panel-forgot-reset");

  const forgotTrigger = document.getElementById("forgot-password-trigger");
  const forgotRequestBack = document.getElementById("forgot-request-back");
  const forgotVerifyBack = document.getElementById("forgot-verify-back");
  const forgotResetBack = document.getElementById("forgot-reset-back");
  const forgotResendOtp = document.getElementById("forgot-resend-otp");

  const forgotRequestForm = document.getElementById("forgot-request-form");
  const forgotVerifyForm = document.getElementById("forgot-verify-form");
  const forgotResetForm = document.getElementById("forgot-reset-form");

  const forgotEmailInput = document.getElementById("forgot-email");
  const forgotOtpInput = document.getElementById("forgot-otp");
  const forgotNewPasswordInput = document.getElementById("forgot-new-password");

  const forgotFeedback = document.getElementById("forgot-feedback");
  const forgotVerifyFeedback = document.getElementById("forgot-verify-feedback");
  const forgotResetFeedback = document.getElementById("forgot-reset-feedback");

  const signupEmailInput = document.getElementById("signup-email");
  const signupPasswordInput = document.getElementById("signup-password");
  const signupEmailError = document.getElementById("signup-email-error");
  const signupPasswordError = document.getElementById("signup-password-error");

  const fieldStage = document.querySelector(".field-stage");
  const pitchStrip = document.querySelector(".pitch-strip");
  const outerFieldRing = document.querySelector(".outer-field-ring");
  const strikerCrease = document.querySelector(".crease.top");

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

    target.innerHTML = messages.map((message) => "<div>" + message + "</div>").join("");
  }

  function clearFeedback(target) {
    if (!target) {
      return;
    }

    target.className = "feedback";
    target.textContent = "";
  }

  function setFeedback(target, type, messages) {
    if (!target) {
      return;
    }

    target.className = "feedback state " + type;
    target.innerHTML = messages.map((message) => "<div>" + message + "</div>").join("");
  }

  function switchTab(target) {
    Object.entries(tabs).forEach(([key, value]) => {
      if (!value.tab || !value.panel) {
        return;
      }

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

  function switchAuthView(view) {
    const viewPanels = {
      login: tabs.login.panel,
      signup: tabs.signup.panel,
      forgotRequest: forgotRequestPanel,
      forgotVerify: forgotVerifyPanel,
      forgotReset: forgotResetPanel,
    };

    Object.values(viewPanels).forEach((panel) => {
      if (!panel) {
        return;
      }

      panel.classList.remove("active");
      panel.setAttribute("hidden", "true");
    });

    if (viewPanels[view]) {
      viewPanels[view].classList.add("active");
      viewPanels[view].removeAttribute("hidden");
    }

    const showingPrimary = view === "login" || view === "signup";

    if (authToggle) {
      authToggle.hidden = !showingPrimary;
    }

    if (showingPrimary) {
      switchTab(view);
    }
  }

  function setupSignupRealtimeValidation() {
    if (signupEmailInput) {
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
    }

    if (signupPasswordInput) {
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
  }

  function resetForgotFlowState() {
    forgotRequestForm?.reset();
    forgotVerifyForm?.reset();
    forgotResetForm?.reset();

    clearFeedback(forgotFeedback);
    clearFeedback(forgotVerifyFeedback);
    clearFeedback(forgotResetFeedback);
  }

  function setupForgotPasswordFlow() {
    if (forgotTrigger) {
      forgotTrigger.addEventListener("click", () => {
        resetForgotFlowState();
        switchAuthView("forgotRequest");
        forgotEmailInput?.focus();
      });
    }

    if (forgotRequestBack) {
      forgotRequestBack.addEventListener("click", () => {
        resetForgotFlowState();
        switchAuthView("login");
      });
    }

    if (forgotVerifyBack) {
      forgotVerifyBack.addEventListener("click", () => {
        clearFeedback(forgotVerifyFeedback);
        switchAuthView("forgotRequest");
        forgotEmailInput?.focus();
      });
    }

    if (forgotResetBack) {
      forgotResetBack.addEventListener("click", () => {
        clearFeedback(forgotResetFeedback);
        switchAuthView("forgotVerify");
        forgotOtpInput?.focus();
      });
    }

    if (forgotResendOtp) {
      forgotResendOtp.addEventListener("click", () => {
        setFeedback(forgotVerifyFeedback, "error", [
          "Forgot password is not connected in static mode yet."
        ]);
      });
    }

    if (forgotRequestForm) {
      forgotRequestForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const email = String(new FormData(forgotRequestForm).get("email") || "").trim().toLowerCase();

        if (!email) {
          setFeedback(forgotFeedback, "error", ["Email is required."]);
          return;
        }

        if (!validateEmail(email)) {
          setFeedback(forgotFeedback, "error", ["Please enter a valid email address."]);
          return;
        }

        setFeedback(forgotFeedback, "error", [
          "Forgot password is not connected in static mode yet."
        ]);
      });
    }

    if (forgotVerifyForm) {
      forgotVerifyForm.addEventListener("submit", (event) => {
        event.preventDefault();
        setFeedback(forgotVerifyFeedback, "error", [
          "OTP verification is not connected in static mode yet."
        ]);
      });
    }

    if (forgotResetForm) {
      forgotResetForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const formData = new FormData(forgotResetForm);
        const newPassword = String(formData.get("newPassword") || "");
        const confirmNewPassword = String(formData.get("confirmNewPassword") || "");

        const issues = validatePassword(newPassword);

        if (issues.length > 0) {
          setFeedback(forgotResetFeedback, "error", issues);
          return;
        }

        if (newPassword !== confirmNewPassword) {
          setFeedback(forgotResetFeedback, "error", [
            "Password mismatch. Please confirm your new password."
          ]);
          return;
        }

        setFeedback(forgotResetFeedback, "error", [
          "Password reset is not connected in static mode yet."
        ]);
      });
    }
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
    return "M " + path.start.x.toFixed(2) + " " + path.start.y.toFixed(2) +
      " Q " + path.control.x.toFixed(2) + " " + path.control.y.toFixed(2) +
      " " + path.end.x.toFixed(2) + " " + path.end.y.toFixed(2);
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

        pathLayer.ball.style.left = head.x + "px";
        pathLayer.ball.style.top = head.y + "px";
        pathLayer.activeTrail.setAttribute(
          "d",
          "M " + tail.x.toFixed(2) + " " + tail.y.toFixed(2) +
          " L " + head.x.toFixed(2) + " " + head.y.toFixed(2)
        );

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
    if (!fieldStage || !pitchStrip || !outerFieldRing) {
      return;
    }

    if (fieldStage.querySelector(".shot-overlay") || fieldStage.querySelector(".wagon-ball")) {
      return;
    }

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
      while (document.body.contains(fieldStage)) {
        await replayShotsSequentially(pathLayer, shotQueue, pauseBetweenShots, targetCycleDuration);
      }
    }

    runLoop();
  }

  function init() {
    setupSignupRealtimeValidation();
    setupForgotPasswordFlow();
    setupShotReplay();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
