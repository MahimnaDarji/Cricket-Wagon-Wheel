const dotenv = require("dotenv");

const { connectDatabase } = require("./config/db");
const app = require("./app");

dotenv.config();

const port = Number(process.env.PORT) || 5000;

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
