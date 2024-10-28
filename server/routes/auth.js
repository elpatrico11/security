const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

// Login route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find the user by username
    const user = await User.findOne({ username });

    // If the user is not found, return an error
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if the user is blocked
    if (user.blocked) {
      return res.status(403).json({
        message: "Your account is blocked, please contact the administrator",
      });
    }

    // Compare the provided password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate a JWT token if the credentials are valid
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Return the token and role in the response
    res.json({ token, role: user.role });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// Token verification route
router.get("/verify", async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the user by ID extracted from the token
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check if the user is blocked
    if (user.blocked) {
      return res.status(403).json({
        message: "Your account is blocked, please contact the administrator",
      });
    }

    // Return the user's role
    res.json({ role: user.role });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({ message: "Invalid token" });
  }
});

module.exports = router;
