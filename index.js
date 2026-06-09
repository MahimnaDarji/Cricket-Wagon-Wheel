(() => {
  "use strict";

  const GOOGLE_CLIENT_ID = "1083768959991-0966srf94vcp2n2dn1m881dnbct3n1ii.apps.googleusercontent.com";
  const GOOGLE_SCOPE = "openid email profile";

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

  let googleTokenClient = null;
  let pendingGoogleAction = "login";

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeName(value) {
    return String(value || "").trim();
  }

  function setFeedback(target, type, messages) {
    if (!target) {
      return;
    }

    target.className = "feedback state " + type;
    target.innerHTML = messages.map((message) => "<div>" + message + "</div>").join("");
  }

  function clearFeedback(target) {
    if (!target) {
      return;
    }

    target.className = "feedback";
    target.innerHTML = "";
  }

  function clearAllFeedback() {
    clearFeedback(loginFeedback);
    clearFeedback(signupFeedback);
  }

  function getTargetFeedback(action) {
    return action === "signup" ? signupFeedback : loginFeedback;
  }

  function authReady() {
    return Boolean(window.CWWAuth);
  }

  function goNext() {
    sessionStorage.removeItem("cv_profile_setup_done");
    window.location.href = "profile-setup.html";
  }

  function saveGoogleUser(profile) {
    const email = normalizeEmail(profile.email);
    const name = normalizeName(profile.name) || email.split("@")[0];
    const profileImageUrl = String(profile.picture || "");

    if (!email) {
      return null;
    }

    const users = JSON.parse(localStorage.getItem("cv_users_v1") || "{}");

    users[email] = {
      ...(users[email] || {}),
      id: email,
      name,
      email,
      profileImageUrl,
      password: users[email]?.password || "__google_login__",
      savedAt: users[email]?.savedAt || new Date().toISOString()
    };

    localStorage.setItem("cv_users_v1", JSON.stringify(users));

    return {
      id: email,
      name,
      email,
      profileImageUrl,
      savedAt: users[email].savedAt
    };
  }

  async function fetchGoogleProfile(accessToken) {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: {
        Authorization: "Bearer " + accessToken
      }
    });

    if (!response.ok) {
      throw new Error("Unable to fetch Google profile.");
    }

    return response.json();
  }

  async function handleGoogleTokenResponse(response) {
    const feedback = getTargetFeedback(pendingGoogleAction);

    try {
      if (!response || !response.access_token) {
        setFeedback(feedback, "error", ["Google sign-in was cancelled or failed."]);
        return;
      }

      if (!authReady()) {
        setFeedback(feedback, "error", ["Auth system is not ready. Hard refresh and try again."]);
        return;
      }

      const profile = await fetchGoogleProfile(response.access_token);
      const user = saveGoogleUser(profile);

      if (!user) {
        setFeedback(feedback, "error", ["Google account email was not found."]);
        return;
      }

      window.CWWAuth.clearActiveWork();
      window.CWWAuth.setSessionUser(user);
      goNext();
    } catch (error) {
      console.error("Google sign-in failed:", error);
      setFeedback(feedback, "error", ["Google sign-in failed. Please try again."]);
    }
  }

  function initializeGoogleOAuth() {
    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      window.setTimeout(initializeGoogleOAuth, 300);
      return;
    }

    googleTokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_SCOPE,
      prompt: "select_account",
      callback: handleGoogleTokenResponse
    });
  }

  function handleGoogleButtonClick(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const button = event.currentTarget;
    pendingGoogleAction = button.dataset.googleAction === "signup" ? "signup" : "login";

    const feedback = getTargetFeedback(pendingGoogleAction);
    clearAllFeedback();

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_ID.includes(".apps.googleusercontent.com")) {
      setFeedback(feedback, "error", ["Google Client ID is missing."]);
      return;
    }

    if (!googleTokenClient) {
      setFeedback(feedback, "error", ["Google sign-in is still loading. Try again in 2 seconds."]);
      initializeGoogleOAuth();
      return;
    }

    googleTokenClient.requestAccessToken({
      prompt: "select_account"
    });
  }

  function bindGoogleButtons() {
    document.querySelectorAll("[data-google-action]").forEach((oldButton) => {
      const newButton = oldButton.cloneNode(true);
      oldButton.replaceWith(newButton);
      newButton.addEventListener("click", handleGoogleButtonClick, true);
    });
  }

  function handleLogin(event) {
    event.preventDefault();
    clearAllFeedback();

    if (!authReady()) {
      setFeedback(loginFeedback, "error", ["Auth system is not ready. Hard refresh and try again."]);
      return;
    }

    const email = normalizeEmail(loginEmailInput?.value);
    const password = String(loginPasswordInput?.value || "");

    if (!email) {
      setFeedback(loginFeedback, "error", ["Please enter your email."]);
      return;
    }

    if (!password) {
      setFeedback(loginFeedback, "error", ["Please enter your password."]);
      return;
    }

    const result = window.CWWAuth.loginUser({ email, password });

    if (!result.ok) {
      setFeedback(loginFeedback, "error", [result.message || "Unable to login."]);
      return;
    }

    window.CWWAuth.clearActiveWork();
    goNext();
  }

  function handleSignup(event) {
    event.preventDefault();
    clearAllFeedback();

    if (!authReady()) {
      setFeedback(signupFeedback, "error", ["Auth system is not ready. Hard refresh and try again."]);
      return;
    }

    const name = normalizeName(signupNameInput?.value);
    const email = normalizeEmail(signupEmailInput?.value);
    const password = String(signupPasswordInput?.value || "");
    const confirmPassword = String(signupConfirmPasswordInput?.value || "");

    if (!name) {
      setFeedback(signupFeedback, "error", ["Please enter your name."]);
      return;
    }

    if (!email) {
      setFeedback(signupFeedback, "error", ["Please enter your email."]);
      return;
    }

    if (!password) {
      setFeedback(signupFeedback, "error", ["Please create a password."]);
      return;
    }

    if (password !== confirmPassword) {
      setFeedback(signupFeedback, "error", ["Passwords do not match."]);
      return;
    }

    const result = window.CWWAuth.registerUser({ name, email, password });

    if (!result.ok) {
      setFeedback(signupFeedback, "error", [result.message || "Unable to create account."]);
      return;
    }

    window.CWWAuth.clearActiveWork();
    goNext();
  }

  function bindForms() {
    loginForm?.addEventListener("submit", handleLogin);
    signupForm?.addEventListener("submit", handleSignup);
  }

  function init() {
    bindForms();
    bindGoogleButtons();
    initializeGoogleOAuth();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();


/* CV_AUTH_TAB_SWITCH_FIX_START */
(() => {
  "use strict";

  function get(id) {
    return document.getElementById(id);
  }

  function clearFeedback() {
    ["login-feedback", "signup-feedback"].forEach((id) => {
      const element = get(id);
      if (!element) return;
      element.className = "feedback";
      element.innerHTML = "";
      element.textContent = "";
    });
  }

  function showPanel(mode) {
    const loginTab = get("tab-login");
    const signupTab = get("tab-signup");
    const loginPanel = get("panel-login");
    const signupPanel = get("panel-signup");

    const isLogin = mode === "login";

    if (loginTab) {
      loginTab.classList.toggle("active", isLogin);
      loginTab.setAttribute("aria-selected", String(isLogin));
    }

    if (signupTab) {
      signupTab.classList.toggle("active", !isLogin);
      signupTab.setAttribute("aria-selected", String(!isLogin));
    }

    if (loginPanel) {
      loginPanel.classList.toggle("active", isLogin);
      if (isLogin) {
        loginPanel.removeAttribute("hidden");
      } else {
        loginPanel.setAttribute("hidden", "true");
      }
    }

    if (signupPanel) {
      signupPanel.classList.toggle("active", !isLogin);
      if (!isLogin) {
        signupPanel.removeAttribute("hidden");
      } else {
        signupPanel.setAttribute("hidden", "true");
      }
    }

    ["panel-forgot-request", "panel-forgot-verify", "panel-forgot-reset"].forEach((id) => {
      const panel = get(id);
      if (!panel) return;
      panel.classList.remove("active");
      panel.setAttribute("hidden", "true");
    });

    const authToggle = document.querySelector(".auth-toggle");
    if (authToggle) {
      authToggle.hidden = false;
    }

    clearFeedback();
  }

  function bindAuthTabs() {
    const loginTab = get("tab-login");
    const signupTab = get("tab-signup");

    if (loginTab) {
      loginTab.onclick = (event) => {
        event.preventDefault();
        showPanel("login");
      };
    }

    if (signupTab) {
      signupTab.onclick = (event) => {
        event.preventDefault();
        showPanel("signup");
      };
    }

    const signupSubmit = document.querySelector('button[form="signup-form"]');
    const loginSubmit = document.querySelector('button[form="login-form"]');

    if (signupSubmit) {
      signupSubmit.disabled = false;
      signupSubmit.removeAttribute("disabled");
      signupSubmit.style.pointerEvents = "auto";
      signupSubmit.style.opacity = "1";
    }

    if (loginSubmit) {
      loginSubmit.disabled = false;
      loginSubmit.removeAttribute("disabled");
      loginSubmit.style.pointerEvents = "auto";
      loginSubmit.style.opacity = "1";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindAuthTabs);
  } else {
    bindAuthTabs();
  }
})();
/* CV_AUTH_TAB_SWITCH_FIX_END */
