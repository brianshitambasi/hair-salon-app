const express = require("express");
const router = express.Router();
const { registerUser, loginUser, getMe } = require("../controller/userController");
const {auth} = require("../middleware/auth");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", auth, getMe); // Add this route
router.get("/me", auth, getMe); // ✅ add this line

module.exports = router;
