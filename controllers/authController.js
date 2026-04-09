const bcrypt = require("bcrypt");
const User = require("../models/User");

function isDatabaseUnavailableError(error) {
  if (!error) {
    return false;
  }

  const message = String(error.message || "").toLowerCase();
  return (
    message.includes("timed out") ||
    message.includes("server selection") ||
    message.includes("topology") ||
    message.includes("buffering timed out") ||
    message.includes("connection")
  );
}

function isValidEmail(email) {
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
}

function passwordErrors(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push("Use at least 8 characters.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Add at least one uppercase letter.");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Add at least one lowercase letter.");
  }
  if (!/\d/.test(password)) {
    errors.push("Add at least one number.");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Add at least one special character.");
  }

  return errors;
}

async function signup(req, res) {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const errors = [];

    if (!name) {
      errors.push("Name is required.");
    }

    if (!email) {
      errors.push("Email is required.");
    } else if (!isValidEmail(email)) {
      errors.push("Please enter a valid email address.");
    }

    if (!password) {
      errors.push("Password is required.");
    } else {
      errors.push(...passwordErrors(password));
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: "Validation failed.", errors });
    }

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await User.create({
      name,
      email,
      password: hashedPassword,
      authProvider: "local",
    });

    return res.status(201).json({ success: true, message: "Account created successfully." });
  } catch (error) {
    console.error("Signup error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ success: false, message: "Database is not connected right now. Please try again in a moment." });
    }

    return res.status(500).json({ success: false, message: "Unable to create account right now." });
  }
}

async function login(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    if (!user.password) {
      return res.status(400).json({ success: false, message: "This account uses Google sign-in. Please continue with Google." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid email or password." });
    }

    req.login(user, (sessionError) => {
      if (sessionError) {
        console.error("Session login error:", sessionError);
        return res.status(500).json({ success: false, message: "Unable to establish session." });
      }

      return res.status(200).json({
        success: true,
        message: "Login successful.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          authProvider: user.authProvider,
        },
      });
    });
  } catch (error) {
    console.error("Login error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ success: false, message: "Database is not connected right now. Please try again in a moment." });
    }

    return res.status(500).json({ success: false, message: "Unable to login right now." });
  }
}

function currentUser(req, res) {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ success: false, message: "Not authenticated." });
  }

  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      authProvider: req.user.authProvider,
    },
  });
}

function logout(req, res) {
  req.logout((logoutError) => {
    if (logoutError) {
      console.error("Logout error:", logoutError);
      return res.status(500).json({ success: false, message: "Logout failed." });
    }

    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      return res.status(200).json({ success: true, message: "Logged out." });
    });
  });
}

module.exports = {
  signup,
  login,
  currentUser,
  logout,
};
