const jwt = require("jsonwebtoken");
const User = require("../models/User");

exports.protect = (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: "Token is invalid" });
  }
};

exports.adminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (user && user.role === "admin") {
      req.user = user; // Attach the full user object to the request
      next();
    } else {
      res.status(403).json({ message: "Access restricted to admins only" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
