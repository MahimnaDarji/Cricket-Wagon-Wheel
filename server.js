const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const session = require("express-session");
const passport = require("passport");

const { connectDatabase, isDatabaseReady } = require("./config/db");
const { configurePassport } = require("./config/passport");
const authRoutes = require("./routes/authRoutes");

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 5000;

configurePassport();

function getMissingEnvVars() {
  const requiredKeys = ["MONGODB_URI", "SESSION_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
  return requiredKeys.filter((key) => {
    const value = process.env[key] || "";
    return value.trim().length === 0 || value.startsWith("REPLACE_WITH_");
  });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "development_secret_change_me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(authRoutes);
app.use(express.static(path.join(__dirname)));

app.get("/health", (_req, res) => {
  const missing = getMissingEnvVars();
  res.status(200).json({
    ok: true,
    envReady: missing.length === 0,
    dbReady: isDatabaseReady(),
  });
});

app.get("/health/env", (_req, res) => {
  const missing = getMissingEnvVars();

  res.status(200).json({
    ok: true,
    envReady: missing.length === 0,
    dbReady: isDatabaseReady(),
    missing,
    message:
      missing.length === 0
        ? "All required environment variables are set."
        : "Some required environment variables are missing.",
  });
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error." });
});

async function startServer() {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });

  try {
    await connectDatabase();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    console.error("App is running in limited mode. Configure .env and database, then restart.");
  }
}

startServer();
