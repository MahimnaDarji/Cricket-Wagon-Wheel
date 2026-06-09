(() => {
  "use strict";

  const loginTab = document.getElementById("tab-login");
  const signupTab = document.getElementById("tab-signup");

  const loginPanel = document.getElementById("panel-login");
  const signupPanel = document.getElementById("panel-signup");
  const forgotRequestPanel = document.getElementById("panel-forgot-request");
  const forgotVerifyPanel = document.getElementById("panel-forgot-verify");
  const forgotResetPanel = document.getElementById("panel-forgot-reset");

  const loginForm = document.getElementById("login-form");
  const signupForm = document.getElementById("signup-form");

  const loginEmailInput = document.getElementById("login-email");
  const loginPasswordInput = document.getElementById("login-password");

  const signupNameInput = document.getElementById("signup-name");
  const signupEmailInput = document.getElementById("signup-email");
  const signupPasswordInput = document.getElementById("signup-password");
  const signupConfirmPasswordInput = document.getElementById("signup-confirm-password");

  const loginFeedback = document.getElementById("login-feedback");
  const signupFeedback = document.getElementById("signup-feedback");

  const googleLoginButton = document.querySelector('[data-google-action="login"]');
  const googleSignupButton = document.querySelector('[data-google-action="signup"]');

  const forgotPasswordTrigger = document.getElementById("forgot-password-trigger");
  const forgotRequestBack = document.getElementById("forgot-request-back");
  const forgotVerifyBack = document.getElementById("forgot-verify-back");
  const forgotResetBack = document.getElementById("forgot-reset-back");

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeName(value) {
    return String(value || "").trim();
  }

  function clearFeedback() {
    if (loginFeedback) loginFeedback.textContent = "";
    if (signupFeedback) signupFeedback.textContent = "";

    [
      "signup-email-error",
      "signup-password-error",
      "forgot-feedback",
      "forgot-verify-feedback",
      "forgot-reset-feedback"
    ].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.textContent = "";
    });
  }

  function showFeedback(target, message, type = "error") {
    const element = target === "signup" ? signupFeedback : loginFeedback;

    if (!element) {
      alert(message);
      return;
    }

    element.textContent = message;
    element.className = "feedback " + type;
  }

  function hideAllPanels() {
    [loginPanel, signupPanel, forgotRequestPanel, forgotVerifyPanel, forgotResetPanel].forEach((panel) => {
      if (!panel) return;
      panel.hidden = true;
      panel.classList.remove("active");
    });
  }

  function showPanel(panel) {
    hideAllPanels();

    if (!panel) return;

    panel.hidden = false;
    panel.classList.add("active");
  }

  function setActiveTab(mode) {
    const isLogin = mode === "login";

    if (loginTab) {
      loginTab.classList.toggle("active", isLogin);
      loginTab.setAttribute("aria-selected", String(isLogin));
    }

    if (signupTab) {
      signupTab.classList.toggle("active", !isLogin);
      signupTab.setAttribute("aria-selected", String(!isLogin));
    }

    showPanel(isLogin ? loginPanel : signupPanel);
    clearFeedback();
  }

  function ensureAuthReady(target = "login") {
    if (!window.CWWAuth) {
      showFeedback(target, "Auth system is not ready. Hard refresh the page and try again.");
      return false;
    }

    return true;
  }

  function setupDoneKey(email) {
    return "cv_profile_setup_done::" + normalizeEmail(email);
  }

  function goAfterAuth(user, forceSetup = false) {
    const email = normalizeEmail(user && user.email);

    if (!email) {
      window.location.href = "profile-setup.html";
      return;
    }

    const setupDone = localStorage.getItem(setupDoneKey(email)) === "1";

    if (forceSetup || !setupDone) {
      window.location.href = "profile-setup.html";
      return;
    }

    window.location.href = "dashboard.html";
  }

  function handleLogin(event) {
    event.preventDefault();
    clearFeedback();

    if (!ensureAuthReady("login")) return;

    const email = normalizeEmail(loginEmailInput && loginEmailInput.value);
    const password = String((loginPasswordInput && loginPasswordInput.value) || "");

    if (!email) {
      showFeedback("login", "Please enter your email.");
      return;
    }

    if (!password) {
      showFeedback("login", "Please enter your password.");
      return;
    }

    const result = window.CWWAuth.loginUser({ email, password });

    if (!result.ok) {
      showFeedback("login", result.message || "Unable to login.");
      return;
    }

    window.CWWAuth.clearActiveWork();
    sessionStorage.removeItem("cv_profile_setup_done");

    showFeedback("login", "Login successful.", "success");
    goAfterAuth(result.user, false);
  }

  function handleSignup(event) {
    event.preventDefault();
    clearFeedback();

    if (!ensureAuthReady("signup")) return;

    const name = normalizeName(signupNameInput && signupNameInput.value);
    const email = normalizeEmail(signupEmailInput && signupEmailInput.value);
    const password = String((signupPasswordInput && signupPasswordInput.value) || "");
    const confirmPassword = String((signupConfirmPasswordInput && signupConfirmPasswordInput.value) || "");

    if (!name) {
      showFeedback("signup", "Please enter your name.");
      return;
    }

    if (!email) {
      showFeedback("signup", "Please enter your email.");
      return;
    }

    if (!password) {
      showFeedback("signup", "Please create a password.");
      return;
    }

    if (password !== confirmPassword) {
      showFeedback("signup", "Passwords do not match.");
      return;
    }

    const result = window.CWWAuth.registerUser({ name, email, password });

    if (!result.ok) {
      showFeedback("signup", result.message || "Unable to create account.");
      return;
    }

    window.CWWAuth.clearActiveWork();
    sessionStorage.removeItem("cv_profile_setup_done");

    showFeedback("signup", "Account created successfully.", "success");
    goAfterAuth(result.user, true);
  }

  function handleGoogleAuth(mode) {
    clearFeedback();

    if (!ensureAuthReady(mode === "signup" ? "signup" : "login")) return;

    const email = normalizeEmail(prompt("Enter Google account email"));

    if (!email) return;

    const users = JSON.parse(localStorage.getItem("cv_users_v1") || "{}");
    const existing = users[email];

    if (existing) {
      const result = window.CWWAuth.loginUser({
        email,
        password: existing.password || "__google__"
      });

      if (!result.ok) {
        showFeedback("login", result.message || "Unable to login with Google.");
        return;
      }

      window.CWWAuth.clearActiveWork();
      sessionStorage.removeItem("cv_profile_setup_done");
      goAfterAuth(result.user, false);
      return;
    }

    const name = normalizeName(prompt("Enter your full name")) || email.split("@")[0];

    const result = window.CWWAuth.registerUser({
      name,
      email,
      password: "__google__"
    });

    if (!result.ok) {
      showFeedback("signup", result.message || "Unable to sign up with Google.");
      return;
    }

    window.CWWAuth.clearActiveWork();
    sessionStorage.removeItem("cv_profile_setup_done");
    goAfterAuth(result.user, true);
  }

  function bindForgotPasswordBasicNavigation() {
    if (forgotPasswordTrigger) {
      forgotPasswordTrigger.addEventListener("click", () => {
        hideAllPanels();
        if (forgotRequestPanel) {
          forgotRequestPanel.hidden = false;
          forgotRequestPanel.classList.add("active");
        }
      });
    }

    [forgotRequestBack, forgotVerifyBack, forgotResetBack].forEach((button) => {
      if (!button) return;
      button.addEventListener("click", () => setActiveTab("login"));
    });
  }

  function bindEvents() {
    if (loginTab) {
      loginTab.addEventListener("click", () => setActiveTab("login"));
    }

    if (signupTab) {
      signupTab.addEventListener("click", () => setActiveTab("signup"));
    }

    if (loginForm) {
      loginForm.addEventListener("submit", handleLogin);
    }

    if (signupForm) {
      signupForm.addEventListener("submit", handleSignup);
    }

    if (googleLoginButton) {
      googleLoginButton.addEventListener("click", () => handleGoogleAuth("login"));
    }

    if (googleSignupButton) {
      googleSignupButton.addEventListener("click", () => handleGoogleAuth("signup"));
    }

    bindForgotPasswordBasicNavigation();
  }

  function init() {
    bindEvents();
    setActiveTab("login");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
