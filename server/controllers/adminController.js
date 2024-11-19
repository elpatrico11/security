const User = require("../models/User");
const bcrypt = require("bcryptjs");
const logger = require("../logger");

// Generate OTP
const generateOTP = async () => {
  const x = Math.floor(100000 + Math.random() * 900000); // a 6-digit random number
  const otp = x.toString(); // Ensure OTP is a string for consistency

  const hashedOTP = await bcrypt.hash(otp, 10); // Hash the OTP directly

  return { otp, hashedOTP };
};

// Function to validate OTP (can be used in login or verification process)
const validateOTP = async (enteredOTP, hashedOTP) => {
  return await bcrypt.compare(enteredOTP, hashedOTP);
};

// Change Admin Password
exports.changeAdminPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const adminId = req.user.id;

  try {
    const admin = await User.findById(adminId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const isMatch = await admin.matchPassword(currentPassword);
    if (!isMatch) {
      logger.error(
        `Password change failed for ${admin.username}: Incorrect current password`
      );
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    const salt = await bcrypt.genSalt(10);
    admin.password = await bcrypt.hash(newPassword, salt);

    await admin.save();
    logger.info(`Admin password changed for ${admin.username}`);
    res.json({ message: "Password updated successfully" });
  } catch (error) {
    logger.error(
      `Error changing admin password for ${admin.username}: ${error.message}`
    );
    console.error("Error in changeAdminPassword:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.modifyUserAccount = async (req, res) => {
  const { fullName, username, password, generateNewOTP } = req.body;
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

    // Generate OTP if explicitly requested
    if (generateNewOTP) {
      const { otp, hashedOTP } = await generateOTP();
      user.otp = hashedOTP;
      user.otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15-minute expiration
      await user.save();
      return res.json({ message: "User account updated successfully", otp }); // Return OTP if generated
    } else {
      user.otp = null;
      user.otpExpiry = null;
      await user.save();
      res.json({ message: "User account updated successfully" });
    }
  } catch (error) {
    console.error("Error in modifyUserAccount:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add New User
exports.addNewUser = async (req, res) => {
  const { username, fullName, password, generateOTP } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Initialize new user object
    const newUser = new User({
      username,
      fullName,
      password: hashedPassword,
    });

    // Generate OTP if requested
    if (generateOTP) {
      const { otp, hashedOTP } = await generateOTP();
      newUser.otp = hashedOTP; // Set OTP on the user model
      newUser.otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // Set expiry time
      res.json({ message: "User added successfully", otp }); // Send OTP to frontend
    }

    // Save user with OTP and expiry if generated
    await newUser.save();

    logger.info(`User created: ${username}`);
    res.status(201).json({ message: "User added successfully" });
  } catch (error) {
    logger.error(`Error adding new user ${username}: ${error.message}`);
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

// Delete User Account i don't know if it will work now
exports.deleteUserAccount = async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      logger.error(`Failed to delete user: User not found`);
      return res.status(404).json({ message: "User not found" });
    }

    logger.info(`User deleted: ${user.username}`);
    res.json({ message: "User account deleted" });
  } catch (error) {
    logger.error(`Error deleting user ${userId}: ${error.message}`);
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

exports.grantPermission = async (req, res) => {
  const { userId, permission } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.permissions.push(permission);
    await user.save();

    logger.info(`Permission granted to ${user.username}: ${permission}`);
    res.json({ message: "Permission granted" });
  } catch (error) {
    logger.error(`Error granting permission to ${userId}: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};

exports.revokePermission = async (req, res) => {
  const { userId, permission } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.permissions = user.permissions.filter((perm) => perm !== permission);
    await user.save();

    logger.info(`Permission revoked from ${user.username}: ${permission}`);
    res.json({ message: "Permission revoked" });
  } catch (error) {
    logger.error(`Error revoking permission from ${userId}: ${error.message}`);
    res.status(500).json({ message: "Server error" });
  }
};

exports.generateOneTimePassword = async (req, res) => {
  const username = req.body.username || "knownExistingUsername"; // Use a known username for testing

  try {
    const user = await User.findOne({ username });
    if (!user) {
      console.log("User not found for OTP generation");
      return res.status(404).json({ message: "User not found" });
    }

    const { otp, hashedOTP } = await generateOTP();
    console.log("Generated OTP:", otp); // Log generated OTP (for testing)
    user.otp = hashedOTP;
    user.otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // Set expiry time
    await user.save();

    res.json({ message: "OTP generated successfully", otp });
  } catch (error) {
    console.error("Error generating OTP:", error);
    res.status(500).json({ message: "Server error while generating OTP" });
  }
};
