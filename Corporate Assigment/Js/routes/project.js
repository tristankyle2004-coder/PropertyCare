const express = require("express");
const { Property, MaintenanceRequest, User } = require("../models");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// Get all properties (with optional filtering by owner)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { ownerId } = req.query;
    const where = ownerId ? { ownerId } : {};

    const properties = await Property.findAll({
      where,
      include: [{ model: User, attributes: ["id", "name", "email"] }]
    });

    res.json(properties);
  } catch (err) {
    console.error("Error fetching properties:", err);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

// Get a specific property
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id, {
      include: [
        { model: User, attributes: ["id", "name", "email"] },
        { model: MaintenanceRequest, attributes: ["id", "title", "status", "priority"] }
      ]
    });

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    res.json(property);
  } catch (err) {
    console.error("Error fetching property:", err);
    res.status(500).json({ error: "Failed to fetch property" });
  }
});

// Create a new property (owner only)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, address, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Property name is required" });
    }

    const property = await Property.create({
      name,
      address,
      description,
      ownerId: req.user.id
    });

    res.status(201).json(property);
  } catch (err) {
    console.error("Error creating property:", err);
    res.status(500).json({ error: "Failed to create property" });
  }
});

// Update a property
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Check if user is the owner
    if (property.ownerId !== req.user.id) {
      return res.status(403).json({ error: "You can only update your own properties" });
    }

    const { name, address, description } = req.body;
    await property.update({ name, address, description });

    res.json(property);
  } catch (err) {
    console.error("Error updating property:", err);
    res.status(500).json({ error: "Failed to update property" });
  }
});

// Delete a property
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);

    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }

    // Check if user is the owner
    if (property.ownerId !== req.user.id) {
      return res.status(403).json({ error: "You can only delete your own properties" });
    }

    await property.destroy();
    res.json({ message: "Property deleted successfully" });
  } catch (err) {
    console.error("Error deleting property:", err);
    res.status(500).json({ error: "Failed to delete property" });
  }
});

module.exports = router;
