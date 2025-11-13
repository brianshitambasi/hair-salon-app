// routes/cartRoutes.js
const express = require("express");
const { auth } = require("../middleware/auth");
const { 
  addToCart, 
  getCart, 
  removeFromCart, 
  clearCart 
} = require("../controller/cartController");

const router = express.Router();

router.post("/add", auth, addToCart);
router.get("/", auth, getCart);
router.delete("/remove/:itemId", auth, removeFromCart);
router.delete("/clear", auth, clearCart);

module.exports = router;