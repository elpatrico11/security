const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" }, // Either 'admin' or 'user'
  fullName: { type: String },
  passwordExpiry: { type: Date, default: null },
  blocked: { type: Boolean, default: false },
  requireUpperCase: { type: Boolean, default: false },
  requireLowerCase: { type: Boolean, default: false },
  requireSpecialChar: { type: Boolean, default: false },
  isFirstLogin: { type: Boolean, default: true },
});

// Password matching method
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Export the User model
const User = mongoose.model("User", UserSchema);
module.exports = User;
