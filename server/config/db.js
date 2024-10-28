const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
require("dotenv").config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // Check if admin account exists; if not, create it.
    const admin = await User.findOne({ username: "ADMIN" });
    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("adminpassword123!", salt); // Strong default password

      const newAdmin = new User({
        username: "ADMIN",
        password: hashedPassword,
        role: "admin",
        fullName: "Administrator",
      });

      await newAdmin.save();
      console.log("Admin account created");
    } else {
      console.log("Admin account already exists");
    }

    console.log("MongoDB connected");
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
