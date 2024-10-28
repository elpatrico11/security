const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
require("dotenv").config();

const createAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    // Check if admin account exists; if not, create it.
    const admin = await User.findOne({ username: "ADMIN" });
    if (!admin) {
      const hashedPassword = await bcrypt.hash("adminpassword123!", 10);

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

    mongoose.connection.close();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

createAdmin();
