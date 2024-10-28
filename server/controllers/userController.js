const User = require("../models/User");
const bcrypt = require("bcryptjs");

exports.changeUserPassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    // Validate password requirements
    const { requireUpperCase, requireLowerCase, requireSpecialChar } = user;
    let passwordValid = true;
    let errorMessage = "Password must contain:";

    if (requireUpperCase && !/[A-Z]/.test(newPassword)) {
      passwordValid = false;
      errorMessage += " uppercase letter,";
    }
    if (requireLowerCase && !/[a-z]/.test(newPassword)) {
      passwordValid = false;
      errorMessage += " lowercase letter,";
    }
    if (requireSpecialChar && !/[!@#$%^&*]/.test(newPassword)) {
      passwordValid = false;
      errorMessage += " special character,";
    }

    if (!passwordValid) {
      return res.status(400).json({
        message: errorMessage.slice(0, -1), // Remove trailing comma
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.isFirstLogin = false; // Set first login to false after password change
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error in changeUserPassword:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUserById = async (req, res) => {
  const { id } = req.params; // Get the user ID from the request parameters

  try {
    const user = await User.findById(id);
    if (!user) {
      console.error("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    // If you want to send only specific fields, you can do so here
    res.json({
      id: user._id,
      username: user.username,
      role: user.role,
      // Add other fields as necessary
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({
      isFirstLogin: user.isFirstLogin,
      // You can add other user status information here if needed
      username: user.username,
      requireUpperCase: user.requireUpperCase,
      requireLowerCase: user.requireLowerCase,
      requireSpecialChar: user.requireSpecialChar,
    });
  } catch (error) {
    console.error("Error in getUserStatus:", error);
    res.status(500).json({ message: "Server error" });
  }
};
