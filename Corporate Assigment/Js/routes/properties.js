// routes/properties.js
// Get properties for the frontend.

const express = require("express");
const { Property } = require("../models");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

router.get("/", authenticateToken, async (req, res) => {
  try {
    const properties = await Property.findAll({
      order: [["name", "ASC"]]
    });

    res.json(properties);
  } catch (err) {
    console.error("Error fetching properties:", err);
    res.status(500).json({ error: "Failed to fetch properties" });
  }
});

module.exports = router;