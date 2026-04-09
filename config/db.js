const mongoose = require("mongoose");

let connectPromise = null;

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
      console.log("MongoDB connected");
      return connection;
    })
    .catch((error) => {
      connectPromise = null;
      throw error;
    });

  return connectPromise;
}

function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

module.exports = {
  connectDatabase,
  isDatabaseReady,
};
