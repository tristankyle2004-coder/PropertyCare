// =========================
// Server bootstrap
// =========================
require("dotenv").config();
const { app, startDatabase } = require("./app");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await startDatabase();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Server failed to start:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };