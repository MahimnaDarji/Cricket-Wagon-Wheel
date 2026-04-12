const bcrypt = require("bcrypt");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const OTP_LENGTH = 6;
const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES) || 10;

let mailTransporterPromise = null;

function generateNumericOtp(length = OTP_LENGTH) {
  const max = 10 ** length;
  const min = 10 ** (length - 1);
  return String(crypto.randomInt(min, max));
}

function hashOtp(otp) {
  const secret = process.env.OTP_SECRET || process.env.SESSION_SECRET || "fallback_otp_secret";
  return crypto.createHash("sha256").update(`${otp}:${secret}`).digest("hex");
}

function hasEmailConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function isProduction() {
  return String(process.env.NODE_ENV || "").toLowerCase() === "production";
}

async function getMailer() {
  if (mailTransporterPromise) {
    return mailTransporterPromise;
  }

  if (!hasEmailConfig()) {
    throw new Error("Email service is not configured on the server.");
  }

  mailTransporterPromise = (async () => {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.verify();
    return transporter;
  })().catch((error) => {
    mailTransporterPromise = null;
    throw error;
  });

  return mailTransporterPromise;
}

async function sendPasswordResetOtpEmail(toEmail, otp) {
  if (!hasEmailConfig()) {
    if (isProduction()) {
      throw new Error("Email service is not configured on the server.");
    }
    console.log(`DEV OTP for ${toEmail}: ${otp}`);
    return { devMode: true, otp };
  }

  const transporter = await getMailer();
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from: `"CreaseVision" <${fromEmail}>`,
    to: toEmail,
    subject: "CreaseVision — Your Password Reset OTP",
    text: `Your CreaseVision OTP is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes. Do not share this with anyone.`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;border:1px solid #e0e0e0;border-radius:8px">
        <h2 style="color:#1a1a2e;margin-bottom:8px">🏏 CreaseVision</h2>
        <p style="color:#444">Use the OTP below to reset your password:</p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#e63946;text-align:center;padding:16px 0">${otp}</div>
        <p style="color:#666;font-size:13px">This OTP expires in <strong>${OTP_TTL_MINUTES} minutes</strong>. Do not share it with anyone.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="color:#aaa;font-size:11px">If you did not request a password reset, you can safely ignore this email.</p>
      </div>
    `,
  });

  return { devMode: false };
}

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

function normalizeTheme(theme) {
  const normalized = String(theme || "system").trim().toLowerCase();
  if (["system", "light", "dark"].includes(normalized)) {
    return normalized;
  }

  return "system";
}

function normalizeProfileImageUrl(value) {
  const profileImageUrl = String(value || "").trim();

  if (!profileImageUrl) {
    return "";
  }

  const isHttpUrl = /^https?:\/\//i.test(profileImageUrl);
  const isImageDataUrl = /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(profileImageUrl);

  if (!isHttpUrl && !isImageDataUrl) {
    throw new Error("Profile image must be a valid image URL or image upload.");
  }

  if (profileImageUrl.length > 200000) {
    throw new Error("Profile image is too large. Please use a smaller image.");
  }

  return profileImageUrl;
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
          profileImageUrl: user.profileImageUrl || "",
          preferences: {
            theme: normalizeTheme(user.preferences?.theme),
          },
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
      profileImageUrl: req.user.profileImageUrl || "",
      preferences: {
        theme: normalizeTheme(req.user.preferences?.theme),
      },
    },
  });
}

async function updateProfile(req, res) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated." });
    }

    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const rawTheme = req.body.preferences?.theme;

    if (!name) {
      return res.status(400).json({ success: false, message: "Full name is required." });
    }

    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ success: false, message: "Name must be between 2 and 80 characters." });
    }

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }

    let profileImageUrl = "";
    try {
      profileImageUrl = normalizeProfileImageUrl(req.body.profileImageUrl);
    } catch (validationError) {
      return res.status(400).json({ success: false, message: validationError.message });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User account not found." });
    }

    if (user.email !== email) {
      const existingUser = await User.findOne({ email }).lean();
      if (existingUser) {
        return res.status(409).json({ success: false, message: "This email is already used by another account." });
      }
    }

    user.name = name;
    user.email = email;
    user.profileImageUrl = profileImageUrl;
    user.preferences = {
      ...(user.preferences || {}),
      theme: normalizeTheme(rawTheme),
    };

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        authProvider: user.authProvider,
        profileImageUrl: user.profileImageUrl || "",
        preferences: {
          theme: normalizeTheme(user.preferences?.theme),
        },
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ success: false, message: "Database is not connected right now. Please try again in a moment." });
    }

    return res.status(500).json({ success: false, message: "Unable to update profile right now." });
  }
}

async function updatePassword(req, res) {
  try {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated." });
    }

    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");
    const confirmNewPassword = String(req.body.confirmNewPassword || "");

    if (!newPassword || !confirmNewPassword) {
      return res.status(400).json({ success: false, message: "New password and confirmation are required." });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ success: false, message: "Password mismatch. Please confirm your new password." });
    }

    const issues = passwordErrors(newPassword);
    if (issues.length > 0) {
      return res.status(400).json({ success: false, message: "Validation failed.", errors: issues });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User account not found." });
    }

    if (user.password) {
      if (!currentPassword) {
        return res.status(400).json({ success: false, message: "Current password is required." });
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return res.status(401).json({ success: false, message: "Current password is incorrect." });
      }

      const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
      if (isSameAsCurrent) {
        return res.status(400).json({ success: false, message: "New password must be different from current password." });
      }
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
    user.password = await bcrypt.hash(newPassword, saltRounds);
    user.authProvider = "local";
    await user.save();

    return res.status(200).json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("Update password error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ success: false, message: "Database is not connected right now. Please try again in a moment." });
    }

    return res.status(500).json({ success: false, message: "Unable to update password right now." });
  }
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

async function requestPasswordResetOtp(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with this email." });
    }

    if (user.authProvider === "google" && !user.password) {
      return res.status(400).json({ success: false, message: "This account uses Google sign-in. Please continue with Google." });
    }

    const otp = generateNumericOtp();
    user.resetPasswordOtpHash = hashOtp(otp);
    user.resetPasswordOtpExpiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
    user.resetPasswordOtpVerified = false;
    await user.save();

    const delivery = await sendPasswordResetOtpEmail(user.email, otp);

    if (delivery?.devMode) {
      return res.status(200).json({
        success: true,
        message: "OTP generated in development mode. Check server logs.",
        devOtp: delivery.otp,
      });
    }

    return res.status(200).json({ success: true, message: "OTP sent to your email." });
  } catch (error) {
    console.error("Request OTP error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ success: false, message: "Database is not connected right now. Please try again in a moment." });
    }

    if (String(error.message || "").includes("Email service is not configured")) {
      return res.status(503).json({ success: false, message: "Email service is not configured on the server." });
    }

    return res.status(500).json({ success: false, message: "Unable to send OTP right now. Please try again." });
  }
}

async function verifyPasswordResetOtp(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const otp = String(req.body.otp || "").trim();

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required." });
    }

    const user = await User.findOne({ email });
    if (!user || !user.resetPasswordOtpHash || !user.resetPasswordOtpExpiresAt) {
      return res.status(400).json({ success: false, message: "OTP is invalid or expired." });
    }

    if (new Date() > user.resetPasswordOtpExpiresAt) {
      user.resetPasswordOtpHash = null;
      user.resetPasswordOtpExpiresAt = null;
      user.resetPasswordOtpVerified = false;
      await user.save();
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new OTP." });
    }

    const incomingHash = hashOtp(otp);
    if (incomingHash !== user.resetPasswordOtpHash) {
      return res.status(400).json({ success: false, message: "Wrong OTP. Please try again." });
    }

    user.resetPasswordOtpVerified = true;
    await user.save();

    return res.status(200).json({ success: true, message: "OTP verified. You can now reset your password." });
  } catch (error) {
    console.error("Verify OTP error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ success: false, message: "Database is not connected right now. Please try again in a moment." });
    }

    return res.status(500).json({ success: false, message: "Unable to verify OTP right now. Please try again." });
  }
}

async function resetPassword(req, res) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const newPassword = String(req.body.newPassword || "");
    const confirmNewPassword = String(req.body.confirmNewPassword || "");

    if (!email || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ success: false, message: "Email, new password and confirmation are required." });
    }

    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ success: false, message: "Password mismatch. Please confirm your new password." });
    }

    const issues = passwordErrors(newPassword);
    if (issues.length > 0) {
      return res.status(400).json({ success: false, message: "Validation failed.", errors: issues });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with this email." });
    }

    if (!user.resetPasswordOtpVerified || !user.resetPasswordOtpExpiresAt || new Date() > user.resetPasswordOtpExpiresAt) {
      return res.status(400).json({ success: false, message: "OTP is invalid or expired. Please verify OTP again." });
    }

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS) || 12;
    user.password = await bcrypt.hash(newPassword, saltRounds);
    user.authProvider = "local";
    user.resetPasswordOtpHash = null;
    user.resetPasswordOtpExpiresAt = null;
    user.resetPasswordOtpVerified = false;
    await user.save();

    return res.status(200).json({ success: true, message: "Password reset successful. You can now log in." });
  } catch (error) {
    console.error("Reset password error:", error);
    if (isDatabaseUnavailableError(error)) {
      return res.status(503).json({ success: false, message: "Database is not connected right now. Please try again in a moment." });
    }

    return res.status(500).json({ success: false, message: "Unable to reset password right now. Please try again." });
  }
}

module.exports = {
  signup,
  login,
  currentUser,
  updateProfile,
  updatePassword,
  logout,
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
  resetPassword,
};
