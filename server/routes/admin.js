const express = require("express");
const { protect, adminOnly } = require("../middlewares/auth");
const {
  changeAdminPassword,
  modifyUserAccount,
  addNewUser,
  viewUsers,
  blockUserAccount,
  unblockUserAccount,
  deleteUserAccount,
  togglePasswordRestriction,
  setUserPasswordExpiry,
  setSafetySettings,
} = require("../controllers/adminController");
const router = express.Router();

router.get("/users/:id", protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/change-password", protect, adminOnly, changeAdminPassword);
router.put("/modify-user/:id", protect, adminOnly, modifyUserAccount);
router.post("/add-user", protect, adminOnly, addNewUser);
router.get("/users", protect, adminOnly, viewUsers);
router.put("/block-user/:id", protect, adminOnly, blockUserAccount);
router.put("/unblock-user/:id", protect, adminOnly, unblockUserAccount);
router.delete("/delete-user/:id", protect, adminOnly, deleteUserAccount);
router.put("/safety-settings/:id", protect, adminOnly, setSafetySettings);
router.put(
  "/toggle-password-restriction/:id",
  protect,
  adminOnly,
  togglePasswordRestriction
);
router.put(
  "/set-password-expiry/:id",
  protect,
  adminOnly,
  setUserPasswordExpiry
);

module.exports = router;
