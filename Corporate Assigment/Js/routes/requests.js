// routes/requests.js
// Maintenance request API endpoints.
// Handles listing, detail view, create, update, assign, status change, and delete.

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");

const { MaintenanceRequest, Property, User, Photo } = require("../models");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---------------------------
// File upload configuration
// ---------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    cb(null, `${Date.now()}-${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only image uploads are allowed"));
  }
});

// ---------------------------
// Get all maintenance requests
// ---------------------------
router.get("/", authenticateToken, async (req, res) => {
  try {
    const {
      propertyId,
      status,
      tenantId,
      assignedWorkerId,
      q,
      sortBy = "createdAt",
      order = "DESC",
      page = 1,
      limit = 20
    } = req.query;

    const where = {};
    const pageNum = Math.max(Number(page), 1);
    const limitNum = Math.min(Math.max(Number(limit), 1), 50);

    if (propertyId) where.propertyId = propertyId;
    if (status) where.status = status;
    if (tenantId) where.tenantId = tenantId;
    if (assignedWorkerId) where.assignedWorkerId = assignedWorkerId;

    if (q) {
      where[Op.or] = [
        { title: { [Op.like]: `%${q}%` } },
        { description: { [Op.like]: `%${q}%` } },
        { "$Property.name$": { [Op.like]: `%${q}%` } },
        { "$tenant.name$": { [Op.like]: `%${q}%` } }
      ];
    }

    const { count, rows } = await MaintenanceRequest.findAndCountAll({
      where,
      include: [
        { model: Property, attributes: ["id", "name", "address"] },
        { model: User, as: "tenant", attributes: ["id", "name", "email", "phone"] },
        { model: User, as: "worker", attributes: ["id", "name", "email", "phone"] },
        { model: Photo, attributes: ["id", "imageUrl"] }
      ],
      order: [[sortBy, order]],
      limit: limitNum,
      offset: (pageNum - 1) * limitNum
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: pageNum,
        pages: Math.ceil(count / limitNum),
        limit: limitNum
      }
    });
  } catch (err) {
    console.error("Error fetching requests:", err);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

// ---------------------------
// Get a single request by ID
// ---------------------------
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const request = await MaintenanceRequest.findByPk(req.params.id, {
      include: [
        { model: Property, attributes: ["id", "name", "address"] },
        { model: User, as: "tenant", attributes: ["id", "name", "email", "phone"] },
        { model: User, as: "worker", attributes: ["id", "name", "email", "phone"] },
        { model: Photo }
      ]
    });

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    res.json({ success: true, data: request });
  } catch (err) {
    console.error("Error fetching request:", err);
    res.status(500).json({ error: "Failed to fetch request" });
  }
});

// ---------------------------
// Create a maintenance request
// ---------------------------
router.post("/", authenticateToken, upload.array("photos", 5), async (req, res) => {
  try {
    const { title, description, category, priority, propertyId } = req.body;

    if (!title || !description || !propertyId) {
      return res.status(400).json({ error: "Title, description, and propertyId are required" });
    }

    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    const maintenanceRequest = await MaintenanceRequest.create({
      title,
      description,
      category,
      priority: priority || "medium",
      status: "open",
      propertyId,
      tenantId: req.user.id
    });

    if (req.files && req.files.length) {
      const photoRecords = req.files.map(file => ({
        requestId: maintenanceRequest.id,
        imageUrl: `/uploads/${file.filename}`
      }));

      await Photo.bulkCreate(photoRecords);
    }

    res.status(201).json({
      success: true,
      message: "Request created successfully",
      data: maintenanceRequest
    });
  } catch (err) {
    console.error("Error creating request:", err);
    res.status(500).json({ error: "Failed to create request" });
  }
});

// ---------------------------
// Update a maintenance request
// ---------------------------
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const request = await MaintenanceRequest.findByPk(req.params.id);

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.tenantId !== req.user.id && req.user.role !== "admin") {
      const property = await Property.findByPk(request.propertyId);
      if (!property || property.ownerId !== req.user.id) {
        return res.status(403).json({ error: "You don't have permission to update this request" });
      }
    }

    const { title, description, category, priority } = req.body;
    await request.update({ title, description, category, priority });

    res.json({ success: true, data: request });
  } catch (err) {
    console.error("Error updating request:", err);
    res.status(500).json({ error: "Failed to update request" });
  }
});

// ---------------------------
// Update request status
// ---------------------------
router.patch("/:id/status", authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["open", "assigned", "in_progress", "completed", "closed"];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const request = await MaintenanceRequest.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    const property = await Property.findByPk(request.propertyId);

    if (
      request.assignedWorkerId !== req.user.id &&
      property.ownerId !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ error: "You don't have permission to update this status" });
    }

    await request.update({ status });

    res.json({ success: true, data: request });
  } catch (err) {
    console.error("Error updating status:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// ---------------------------
// Assign a worker to a request
// ---------------------------
router.patch("/:id/assign", authenticateToken, async (req, res) => {
  try {
    const { assignedWorkerId } = req.body;

    if (!assignedWorkerId) {
      return res.status(400).json({ error: "assignedWorkerId is required" });
    }

    const request = await MaintenanceRequest.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    const property = await Property.findByPk(request.propertyId);
    if (property.ownerId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "You don't have permission to assign workers" });
    }

    const worker = await User.findByPk(assignedWorkerId);
    if (!worker || worker.role !== "worker") {
      return res.status(404).json({ error: "Worker not found" });
    }

    await request.update({ assignedWorkerId, status: "assigned" });

    res.json({ success: true, data: request });
  } catch (err) {
    console.error("Error assigning worker:", err);
    res.status(500).json({ error: "Failed to assign worker" });
  }
});

// ---------------------------
// Delete a maintenance request
// ---------------------------
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const request = await MaintenanceRequest.findByPk(req.params.id);

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.tenantId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ error: "You don't have permission to delete this request" });
    }

    await request.destroy();

    res.json({ success: true, message: "Request deleted successfully" });
  } catch (err) {
    console.error("Error deleting request:", err);
    res.status(500).json({ error: "Failed to delete request" });
  }
});

module.exports = router;

// Mark a request as completed
router.patch("/:id/complete", authenticateToken, async (req, res) => {
  try {
    const request = await MaintenanceRequest.findByPk(req.params.id);

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    await request.update({ status: "completed" });

    res.json({
      success: true,
      data: request
    });
  } catch (err) {
    console.error("Error completing request:", err);
    res.status(500).json({ error: "Failed to complete request" });
  }
});