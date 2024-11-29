require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session"); // Import session middleware
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const protectedRoutes = require("./routes/protected");
const userRoutes = require("./routes/user");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "http://localhost:3000", // Replace with your frontend's URL
    credentials: true,
  })
);
app.use(express.json());

// Session Middleware Configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key", // Replace with a secure secret
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 15 * 60 * 1000, // Session duration: 15min
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Set to true in production
    },
  })
);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Route Handlers
app.use("/api/auth", authRoutes);
app.use("/api", protectedRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/user", userRoutes);

// Example route
app.get("/", (req, res) => {
  res.send("Hello World");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
