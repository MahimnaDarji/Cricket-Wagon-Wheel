const mongoose = require("mongoose");

let connectPromise = null;
let lastConnectionError = null;

async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectPromise) {
    return connectPromise;
  }

  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not set. Add it to your .env file.");
  }

  connectPromise = mongoose
    .connect(uri)
    .then((connection) => {
      lastConnectionError = null;
      console.log("MongoDB connected");
      return connection;
    })
    .catch((error) => {
      connectPromise = null;
      lastConnectionError = error;
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
