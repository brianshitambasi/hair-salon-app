const express = require("express");
const router = express.Router();
const userController = require("../controller/userController");


// Public Routes - Only Register & Login
router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);

module.exports = router;