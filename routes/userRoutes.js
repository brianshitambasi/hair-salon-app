const express = require("express");
const multer = require("multer");
const router = express.Router();
const userController = require("../controller/userController");
const { auth } = require("../middleware/auth");

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// Public Routes
router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);

// Protected Routes
router.get("/profile", auth, userController.getUserProfile);
router.put("/profile", auth, upload.single("profileImage"), userController.updateUserProfile);
router.put("/change-password", auth, userController.changePassword);

module.exports = router;