// ========================================================
// PropertyCare Maintenance System
// Single-file Express + SQLite app
// ========================================================

// --- Setup ---
require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";

const __ROOT = __dirname;
const PUBLIC_DIR = path.join(__ROOT, "public");
const UPLOAD_DIR = path.join(__ROOT, "uploads");
const DB_DIR = path.join(__ROOT, "data");
const DB_PATH = path.join(DB_DIR, "maintenance.db");

// Make sure folders exist
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

// --- Express middleware ---
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(PUBLIC_DIR));
app.use("/uploads", express.static(UPLOAD_DIR));

// --- SQLite ---
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error("Failed to connect to SQLite DB:", err.message);
    process.exit(1);
  }
  console.log("Connected to SQLite database.");
  initializeDatabase();
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function getOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function getAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// --- Database initialization ---
async function initializeDatabase() {
  try {
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'tenant',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS properties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        property_id INTEGER NOT NULL,
        tenant_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT,
        priority TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'open',
        worker_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (property_id) REFERENCES properties(id),
        FOREIGN KEY (tenant_id) REFERENCES users(id),
        FOREIGN KEY (worker_id) REFERENCES users(id)
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS request_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES requests(id)
      )
    `);

    // Seed default admin user
    const existingAdmin = await getOne("SELECT * FROM users WHERE email = ?", ["admin@propertycare.com"]);
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash("admin123", 10);
      await run(
        "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)",
        ["System Admin", "admin@propertycare.com", passwordHash, "admin"]
      );
    }

    // Seed default property
    const existingProperty = await getOne("SELECT * FROM properties WHERE name = ?", ["Oak Street Apartments"]);
    if (!existingProperty) {
      await run(
        "INSERT INTO properties (name, address) VALUES (?, ?)",
        ["Oak Street Apartments", "123 Oak St, Springfield"]
      );
    }

    console.log("Database tables initialized successfully.");
    console.log("Admin login: admin@propertycare.com / admin123");
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
}

// --- Auth ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }

    req.user = decoded;
    next();
  });
}

// --- Upload config ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${unique}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Only JPG, JPEG, PNG, and WEBP images are allowed."));
    }
    cb(null, true);
  }
});

// --- Routes ---

// Convenience redirect for old link patterns
app.get("/new-request.html", (req, res) => {
  res.redirect("/public-request.html" + (req.url.includes("?") ? req.url.replace("/new-request.html", "") : ""));
});

app.get("/request", (req, res) => {
  res.redirect("/public-request.html");
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", database: "sqlite" });
});

// Main pages
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// --- Auth API ---
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await getOne("SELECT * FROM users WHERE email = ?", [email.trim().toLowerCase()]);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const passwordMatches = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed." });
  }
});

// --- Properties API ---
app.get("/api/properties", authenticateToken, async (req, res) => {
  try {
    const rows = await getAll("SELECT * FROM properties ORDER BY name ASC");
    return res.json(rows);
  } catch (error) {
    console.error("Property fetch error:", error);
    return res.status(500).json({ error: "Failed to load properties." });
  }
});

// --- Request list API ---
app.get("/api/requests", authenticateToken, async (req, res) => {
  try {
    const { status, q } = req.query;
    let sql = `
      SELECT r.*, p.name AS property_name, p.address AS property_address,
             t.name AS tenant_name, w.name AS worker_name
      FROM requests r
      LEFT JOIN properties p ON p.id = r.property_id
      LEFT JOIN users t ON t.id = r.tenant_id
      LEFT JOIN users w ON w.id = r.worker_id
      WHERE 1 = 1
    `;
    const params = [];

    if (status) {
      sql += " AND r.status = ?";
      params.push(status);
    }

    if (q) {
      sql += " AND (LOWER(r.title) LIKE LOWER(?) OR LOWER(p.name) LIKE LOWER(?))";
      params.push(`%${q}%`, `%${q}%`);
    }

    sql += " ORDER BY r.created_at DESC";

    const rows = await getAll(sql, params);

    const requests = await Promise.all(
      rows.map(async (row) => {
        const photos = await getAll(
          "SELECT * FROM request_photos WHERE request_id = ? ORDER BY created_at ASC",
          [row.id]
        );

        return {
          ...row,
          Photos: photos.map((photo) => ({
            ...photo,
            imageUrl: `/uploads/${photo.filename}`
          })),
          Property: {
            id: row.property_id,
            name: row.property_name,
            address: row.property_address
          },
          tenant: {
            id: row.tenant_id,
            name: row.tenant_name
          },
          worker: {
            id: row.worker_id,
            name: row.worker_name
          }
        };
      })
    );

    return res.json(requests);
  } catch (error) {
    console.error("Request fetch error:", error);
    return res.status(500).json({ error: "Failed to load requests." });
  }
});

// --- Create request API ---
app.post("/api/requests", authenticateToken, upload.array("photos", 10), async (req, res) => {
  try {
    const { propertyId, title, description, category, priority } = req.body;

    if (!propertyId || !title || !description) {
      return res.status(400).json({ error: "Property, title, and description are required." });
    }

    const requestResult = await run(
      `
        INSERT INTO requests (property_id, tenant_id, title, description, category, priority, status)
        VALUES (?, ?, ?, ?, ?, ?, 'open')
      `,
      [Number(propertyId), req.user.id, title.trim(), description.trim(), category || "", priority || "medium"]
    );

    const requestId = requestResult.lastID;

    const uploadedFiles = Array.isArray(req.files) ? req.files : [];
    for (const file of uploadedFiles) {
      await run(
        "INSERT INTO request_photos (request_id, filename, original_name) VALUES (?, ?, ?)",
        [requestId, file.filename, file.originalname]
      );
    }

    return res.status(201).json({
      message: "Request created successfully.",
      id: requestId
    });
  } catch (error) {
    console.error("Create request error:", error);
    return res.status(500).json({ error: "Unable to create request." });
  }
});

// --- Request detail API ---
app.get("/api/requests/:id", authenticateToken, async (req, res) => {
  try {
    const request = await getOne(
      `
        SELECT r.*, p.name AS property_name, p.address AS property_address,
               t.name AS tenant_name, w.name AS worker_name
        FROM requests r
        LEFT JOIN properties p ON p.id = r.property_id
        LEFT JOIN users t ON t.id = r.tenant_id
        LEFT JOIN users w ON w.id = r.worker_id
        WHERE r.id = ?
      `,
      [req.params.id]
    );

    if (!request) {
      return res.status(404).json({ error: "Request not found." });
    }

    const photos = await getAll(
      "SELECT * FROM request_photos WHERE request_id = ? ORDER BY created_at ASC",
      [request.id]
    );

    const formatted = {
      ...request,
      Photos: photos.map((photo) => ({
        ...photo,
        imageUrl: `/uploads/${photo.filename}`
      })),
      Property: {
        id: request.property_id,
        name: request.property_name,
        address: request.property_address
      },
      tenant: {
        id: request.tenant_id,
        name: request.tenant_name
      },
      worker: {
        id: request.worker_id,
        name: request.worker_name
      }
    };

    return res.json(formatted);
  } catch (error) {
    console.error("Request detail error:", error);
    return res.status(500).json({ error: "Unable to load request details." });
  }
});

// Complete or update a maintenance request status
app.patch("/api/requests/:id/status", authenticateToken, async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const { status } = req.body;

    const validStatuses = [
      "open",
      "assigned",
      "in_progress",
      "completed",
      "closed"
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const request = await getOne(
      "SELECT * FROM requests WHERE id = ?",
      [requestId]
    );

    if (!request) {
      return res.status(404).json({ error: "Request not found." });
    }

    const canComplete =
      req.user.role === "admin" ||
      req.user.role === "worker" ||
      req.user.role === "owner";

    if (!canComplete) {
      return res.status(403).json({
        error: "You don't have permission to update this status."
      });
    }

    await run(
      "UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [status, requestId]
    );

    const updatedRequest = await getOne(
      "SELECT * FROM requests WHERE id = ?",
      [requestId]
    );

    return res.json({
      success: true,
      data: updatedRequest
    });
  } catch (error) {
    console.error("Request status update error:", error);
    return res.status(500).json({
      error: "Failed to update request status."
    });
  }
});

// --- Catch-all static fallback ---
app.use((req, res, next) => {
 const file = path.join(PUBLIC_DIR, req.path.replace(/^\/+/, ""));
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    return res.sendFile(file);
  }
  next();
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`PropertyCare app running on http://localhost:${PORT}`);
});

// =========================
// config/database.js
// =========================

const path = require("path");
const { Sequelize } = require("sequelize");

const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "data", "app.sqlite");

const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: dbPath,
  logging: false,
  define: {
    timestamps: true
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log(" SQLite connection successful");
  } catch (error) {
    console.error(" SQLite connection failed:", error.message);
    throw error;
  }
}

module.exports = {
  sequelize,
  testConnection
};

