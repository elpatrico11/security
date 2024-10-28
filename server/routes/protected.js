const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/auth"); // Adjust the path as necessary

// Example protected route
router.get("/protected", protect, (req, res) => {
  console.log("Protected route accessed");
  res.json({ message: "This is a protected route" });
});

module.exports = router;
