const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/auth"); // Adjust the path if necessary
const adminRoutes = require("./routes/admin"); // Ensure admin route is loaded here
const protectedRoutes = require("./routes/protected"); // Adjust the path if necessary
const userRoutes = require("./routes/user"); // Ensure user route is loaded here

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Use auth routes
app.use("/api/auth", authRoutes);
app.use("/api", protectedRoutes); // Make sure this line exists
app.use("/api/admin", adminRoutes); // Make sure this is the admin route
app.use("/api/user", userRoutes); // Ensure the prefix is correct

// Example route
app.get("/", (req, res) => {
  res.send("Hello World");
});

// The protected route should not be defined here again
// It's already handled in your protected.js file

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
