// =========================
// app.js
// =========================
require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const { sequelize } = require("./models");
const requestRoutes = require("./routes/requests");
const propertyRoutes = require("./routes/properties");
const authRoutes = require("./routes/auth");
const { authenticateToken } = require("./middleware");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const PUBLIC_DIR = path.join(__dirname, "public");
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}
app.use(express.static(PUBLIC_DIR));

const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
app.use("/uploads", express.static(UPLOAD_DIR));

app.use("/api/auth", authRoutes);

// Protect app routes
app.use("/api/requests", authenticateToken, requestRoutes);
app.use("/api/properties", authenticateToken, propertyRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

async function startDatabase() {
  try {
    await sequelize.authenticate();
    console.log("SQLite connected successfully");

    // Safe sync for SQLite:
    // - do not use alter: true on existing production/dev DB
    // - use sync() and let Sequelize create tables if missing
    await sequelize.sync();

    const Property = sequelize.models.Property;
    const sampleProperties = [
      { name: "Oak Street Apartments", address: "123 Oak Street, Springfield", ownerId: 1 },
      { name: "Maplewood Condos", address: "456 Maplewood Drive, Springfield", ownerId: 1 },
      { name: "Pinecrest Villas", address: "789 Pinecrest Lane, Springfield", ownerId: 1 },
      { name: "Cedar Grove Estates", address: "321 Cedar Grove Road, Springfield", ownerId: 1 },
      { name: "Willow Creek Residences", address: "654 Willow Creek Avenue, Springfield", ownerId: 1 }
    ];

    for (const property of sampleProperties) {
      await Property.findOrCreate({
        where: { name: property.name },
        defaults: property
      });
    }

    if (process.env.NODE_ENV !== "production") {
      const userCount = await sequelize.models.User.count();

      if (userCount === 0) {
        await sequelize.models.User.create({
          name: "System Admin",
          email: (process.env.ADMIN_EMAIL || "admin@propertycare.com").trim().toLowerCase(),
          passwordHash: process.env.ADMIN_PASSWORD || "admin123",
          role: "admin"
        });

        console.log("Created the development admin account");
      }
    }

    console.log("Database synced");
  } catch (error) {
    console.error("Database startup failed:", error);
    throw error;
  }
}

if (require.main === module) {
  startDatabase()
    .then(() => {
      const port = process.env.PORT || 3000;
      app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
      });
    })
    .catch((err) => {
      console.error("Server failed to start:", err);
      process.exit(1);
    });
}

module.exports = { app, sequelize, startDatabase };