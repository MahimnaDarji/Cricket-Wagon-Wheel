const app = require("../app");
const { connectDatabase } = require("../config/db");

module.exports = async (req, res) => {
  try {
    await connectDatabase();
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
  }

  return app(req, res);
};
