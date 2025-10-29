const express = require("express");
const router = express.Router();
const { addToCart, getCart, removeFromCart, clearCart } = require("../controller/cartController");
const {auth} = require("../middleware/auth");

// All cart routes require authentication
router.post("/", auth, addToCart);
router.get("/", auth, getCart);
router.delete("/:itemId", auth, removeFromCart);
router.delete("/", auth, clearCart);

module.exports = router;
