const express = require("express");
const { auth } = require("../middleware/auth");
const controller = require("../controller/cartController");
const router = express.Router();

router.post("/", auth, controller.addToCart);
router.get("/", auth, controller.getCart);
router.delete("/:itemId", auth, controller.removeFromCart);
router.delete("/", auth, controller.clearCart);

module.exports = router;
