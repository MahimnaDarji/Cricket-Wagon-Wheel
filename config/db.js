const mongoose = require("mongoose");

// Cached promise – reused across serverless invocations within the same container.
let connectPromise = null;
let lastConnectionError = null;

// Mongoose options tuned for Vercel serverless (short-lived containers).
const MONGOOSE_OPTIONS = {
  // Don't buffer operations when DB isn't ready — fail fast instead of hanging.
  bufferCommands: false,
  // Give up quickly so the user gets a clear error rather than a 30-second timeout.
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  // Keep the connection pool small for serverless.
  maxPoolSize: 10,
  minPoolSize: 0,
};

async function connectDatabase() {
  const state = mongoose.connection.readyState;

  // 1 = connected — reuse the existing live connection.
  if (state === 1) {
    return mongoose.connection;
  }

  // 2 = connecting — reuse the in-flight promise instead of starting a second attempt.
  if (state === 2 && connectPromise) {
    return connectPromise;
  }

  // 0 = disconnected / 3 = disconnecting — start fresh.
  // Only reuse connectPromise when mongoose is still mid-flight (state 2).
  if (connectPromise && state === 2) {
    return connectPromise;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri || uri.trim().length === 0) {
    const err = new Error(
      "MONGODB_URI environment variable is not set. " +
      "Add it to your Vercel project's Environment Variables."
    );
    lastConnectionError = err;
    throw err;
  }

  connectPromise = mongoose
    .connect(uri, MONGOOSE_OPTIONS)
    .then((connection) => {
      lastConnectionError = null;
      console.log("MongoDB connected successfully");
      return connection;
    })
    .catch((error) => {
      // Reset so the next request can retry.
      connectPromise = null;
      lastConnectionError = error;
      console.error("MongoDB connection failed:", error.message);
      throw error;
    });

  return connectPromise;
}

function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

function getLastDatabaseError() {
  if (!lastConnectionError) {
    return null;
  }

  return {
    message: String(lastConnectionError.message || "Unknown database error"),
    code: lastConnectionError.code || null,
  };
}

module.exports = {
  connectDatabase,
  isDatabaseReady,
  getLastDatabaseError,
};
