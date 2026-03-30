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

  return issues;
}

function setupTabs() {
  tabs.login.tab.addEventListener("click", () => switchTab("login"));
  tabs.signup.tab.addEventListener("click", () => switchTab("signup"));
}

function setupLoginValidation() {
  loginForm.addEventListener("submit", (event) => {
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
    setFeedback(loginFeedback, "success", ["Login validated. Redirecting to your analysis dashboard..."]);
  });
}

function setupSignupValidation() {
  signupForm.addEventListener("submit", (event) => {
    event.preventDefault();
    clearFieldStates(signupForm);
    clearFeedback(signupFeedback);

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
    }

    if (!password) {
      errors.push("Password is required.");
      invalidNames.push("password");
    } else {
      const passwordIssues = validatePassword(password);
      if (passwordIssues.length > 0) {
        errors.push(...passwordIssues);
        invalidNames.push("password");
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
    setFeedback(signupFeedback, "success", [`Welcome, ${name}! Your account setup is complete.`]);
  });
}

function setupGoogleButtons() {
  document.querySelectorAll("[data-google-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.getAttribute("data-google-action") === "login" ? "Login" : "Sign up";
      const target = mode === "Login" ? loginFeedback : signupFeedback;
      clearFeedback(target);
      setFeedback(target, "success", [`${mode} with Google initiated. Connect this to your OAuth flow.`]);
    });
  });
}

function setupGuestAction() {
  guestButton.addEventListener("click", () => {
    clearFeedback(guestFeedback);
    setFeedback(guestFeedback, "success", ["Guest mode enabled. Opening read-only dashboards..."]);
  });
}

setupTabs();
setupLoginValidation();
setupSignupValidation();
setupGoogleButtons();
setupGuestAction();
