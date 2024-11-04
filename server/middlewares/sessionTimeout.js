const User = require("../models/User");

const sessionTimeout = async (req, res, next) => {
  const userId = req.user.id;
  const currentTime = Date.now();

  try {
    const user = await User.findById(userId);

    // If user not found, continue without timeout checks
    if (!user) return next();

    // Use user-specific session timeout duration
    const sessionTimeoutDuration =
      user.sessionTimeoutDuration || 15 * 60 * 1000; // Default 15 minutes if undefined

    if (
      req.session.lastActive &&
      currentTime - req.session.lastActive > sessionTimeoutDuration
    ) {
      req.session.destroy((err) => {
        if (err) return res.status(500).send("Error ending session");
        return res.status(401).json({ message: "Session timed out" });
      });
    } else {
      req.session.lastActive = currentTime;
      next();
    }
  } catch (error) {
    console.error("Error in session timeout middleware:", error);
    next();
  }
};

module.exports = sessionTimeout;
