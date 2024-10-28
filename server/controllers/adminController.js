const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Change Admin Password
exports.changeAdminPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const adminId = req.user.id;

  try {
    const admin = await User.findById(adminId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch)
      return res.status(400).json({ message: "Current password is incorrect" });

    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);

    await admin.save();
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error in changeAdminPassword:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.modifyUserAccount = async (req, res) => {
  const { fullName, username, password } = req.body;
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (fullName) user.fullName = fullName;
    if (username) user.username = username;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    res.json({ message: "User account updated successfully" });
  } catch (error) {
    console.error("Error in modifyUserAccount:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add New User
exports.addNewUser = async (req, res) => {
  const { username, fullName, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      fullName,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ message: "User added successfully" });
  } catch (error) {
    console.error("Error in addNewUser:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// View Users
exports.viewUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("-password");
    res.json(users);
  } catch (error) {
    console.error("Error in viewUsers:", error);
    res.status(500).json({ message: "Server error while fetching users" });
  }
};

exports.unblockUserAccount = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      console.log("User not found:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    // Update the user
    user.blocked = false;
    await user.save();

    // Verify the update
    const verifiedUser = await User.findById(userId);

    if (verifiedUser.blocked) {
      console.error("Unblock operation failed - user still blocked");
      return res.status(500).json({
        message: "Failed to unblock user - please try again",
        debug: { currentState: verifiedUser.blocked },
      });
    }

    return res.json({
      message: "User account unblocked",
      user: verifiedUser,
    });
  } catch (error) {
    console.error("Error in unblockUserAccount:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

exports.blockUserAccount = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      console.log("User not found:", userId);
      return res.status(404).json({ message: "User not found" });
    }

    user.blocked = true;
    await user.save();

    const verifiedUser = await User.findById(userId);
    if (!verifiedUser.blocked) {
      console.error("Block operation failed - user not blocked");
      return res.status(500).json({
        message: "Failed to block user - please try again",
        debug: { currentState: verifiedUser.blocked },
      });
    }

    return res.json({
      message: "User account blocked",
      user: verifiedUser,
    });
  } catch (error) {
    console.error("Error in blockUserAccount:", error);
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Delete User Account
exports.deleteUserAccount = async (req, res) => {
  const userId = req.params.id;

  try {
    await User.findByIdAndDelete(userId);
    res.json({ message: "User account deleted" });
  } catch (error) {
    console.error("Error in deleteUserAccount:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Toggle Password Restriction
exports.togglePasswordRestriction = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.passwordRestricted = !user.passwordRestricted;
    await user.save();
    res.json({ message: "Password restriction toggled" });
  } catch (error) {
    console.error("Error in togglePasswordRestriction:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Set User Password Expiry
exports.setUserPasswordExpiry = async (req, res) => {
  const { expiryDays } = req.body;
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.passwordExpiry = new Date(
      Date.now() + expiryDays * 24 * 60 * 60 * 1000
    );
    await user.save();
    res.json({ message: `Password expiry set to ${expiryDays} days` });
  } catch (error) {
    console.error("Error in setUserPasswordExpiry:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Set Safety Settings

exports.setSafetySettings = async (req, res) => {
  const {
    requireUpperCase,
    requireSpecialChar,
    requireLowerCase,
    expiryDays,
    isBlocked,
  } = req.body;
  const userId = req.params.id;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update the user's settings
    user.requireLowerCase = requireLowerCase; // Ensure your User model has this field
    user.requireUpperCase = requireUpperCase; // Ensure your User model has this field
    user.requireSpecialChar = requireSpecialChar; // Ensure your User model has this field

    // Calculate expiry date
    if (expiryDays) {
      user.passwordExpiry = new Date(
        Date.now() + expiryDays * 24 * 60 * 60 * 1000
      );
    }

    await user.save();
    res.json({ message: "Safety settings updated successfully" });
  } catch (error) {
    console.error("Error in setSafetySettings:", error);
    res.status(500).json({ message: "Server error" });
  }
};
