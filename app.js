const path = require("path");
const express = require("express");
const dotenv = require("dotenv");
const session = require("express-session");
const passport = require("passport");
const MongoStore = require("connect-mongo").default;

const { isDatabaseReady, getLastDatabaseError } = require("./config/db");
const { configurePassport } = require("./config/passport");
const authRoutes = require("./routes/authRoutes");

dotenv.config();

if (!global.__CWW_UNHANDLED_REJECTION_HANDLER__) {
  process.on("unhandledRejection", (error) => {
    console.error("Unhandled promise rejection:", error);
  });
  global.__CWW_UNHANDLED_REJECTION_HANDLER__ = true;
}

const app = express();

configurePassport();

function getMissingEnvVars() {
  const requiredKeys = ["MONGODB_URI", "SESSION_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
  return requiredKeys.filter((key) => {
    const value = process.env[key] || "";
    return value.trim().length === 0 || value.startsWith("REPLACE_WITH_");
  });
}

app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const mongoUri = process.env.MONGODB_URI || "";
const canUseMongoSessionStore = mongoUri.trim().length > 0 && !mongoUri.startsWith("REPLACE_WITH_");

let sessionStore;
if (canUseMongoSessionStore) {
  try {
    sessionStore = MongoStore.create({
      mongoUrl: mongoUri,
      collectionName: "sessions",
      ttl: 60 * 60 * 24 * 7,
      autoRemove: "native",
      stringify: false,
      touchAfter: 24 * 3600,
    });

    sessionStore.on("error", (error) => {
      console.error("Session store error:", error.message);
    });
  } catch (error) {
    console.error("Session store initialization failed, using in-memory store:", error.message);
    sessionStore = undefined;
  }
}

app.use(
  session({
    name: "cww.sid",
    secret: process.env.SESSION_SECRET || "development_secret_change_me",
    resave: false,
    saveUninitialized: false,
    proxy: process.env.NODE_ENV === "production",
    store: sessionStore,
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
  const dbError = getLastDatabaseError();

  res.status(200).json({
    ok: true,
    envReady: missing.length === 0,
    dbReady: isDatabaseReady(),
    dbError,
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

module.exports = app;
