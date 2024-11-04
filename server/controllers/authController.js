const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const logger = require("../logger");

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (!user || user.blocked) {
      logger.error(`Login failed for ${username}`);
      return res.status(401).json({ message: "Invalid username or password" });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      logger.error(`Login failed for ${username}: Incorrect password`);
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Include `username` in the JWT token payload
    const token = jwt.sign(
      { id: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    logger.info(`User ${username} logged in`);
    res.json({ token, role: user.role });
  } catch (error) {
    logger.error(`Error logging in ${username}: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};

exports.changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id; // Extracted from JWT token

  try {
    const user = await User.findById(userId);

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      logger.error(
        `Password change failed for ${user.username}: Incorrect old password`
      );
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();
    logger.info(`Password changed successfully for ${user.username}`);
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    logger.error(
      `Error changing password for user ${userId}: ${error.message}`
    );
    res.status(500).json({ message: "Server error" });
  }
};

exports.logout = async (req, res) => {
  try {
    logger.info(`User ${req.user.username} logged out`);
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    logger.error(`Error logging out ${req.user.username}: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};
