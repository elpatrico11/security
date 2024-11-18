const User = require("../models/User");

const sessionTimeout = async (req, res, next) => {
  const userId = req.user.id;
  const currentTime = Date.now();

  try {
    const user = await User.findById(userId);
    if (!user) return next();

    const sessionTimeoutDuration =
      user.sessionTimeoutDuration || 15 * 60 * 1000; // 15min

    // Initialize `lastActive` if it doesn't exist
    if (!req.session.lastActive) {
      req.session.lastActive = currentTime;
    }

    if (currentTime - req.session.lastActive > sessionTimeoutDuration) {
      console.log("Session expired due to inactivity for user:", userId);
      req.session.destroy((err) => {
        if (err) return res.status(500).send("Error ending session");
        return res.status(401).json({ message: "Session timed out" });
      });
    } else {
      req.session.lastActive = currentTime; // Update the last active time
      next();
    }
  } catch (error) {
    console.error("Error in session timeout middleware:", error);
    next();
  }
};

module.exports = sessionTimeout;
