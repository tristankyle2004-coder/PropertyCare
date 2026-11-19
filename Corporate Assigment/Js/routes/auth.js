// ======================================================
// AUTHENTICATION ROUTES
// Provides registration and login for the frontend.
// ======================================================

// =========================
// routes/auth.js
// =========================

const express = require("express");
const jwt = require("jsonwebtoken");
const { User } = require("../models");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await User.findOne({
      where: { email: email.trim().toLowerCase() }
    });
    if (!user || !(await user.validatePassword(password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET || "secret_key",
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
    return res.status(500).json({ error: "Server error during login" });
  }
});

module.exports = router;