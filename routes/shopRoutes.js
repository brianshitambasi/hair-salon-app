const express = require("express");
const router = express.Router();
const shopController = require("../controller/shopController");
const upload = require("../middleware/upload");
const { auth } = require("../middleware/auth");

// POST → Create shop (with FormData)
router.post("/", auth, upload.single("image"), shopController.createShop);

// GET all shops (public)
router.get("/", shopController.getAllShops);

// GET my shops (protected)
router.get("/getMyShops", auth, shopController.getMyShops);

// GET one shop
router.get("/:id", shopController.getShopById);

// PUT (update shop)
router.put("/:id", auth, upload.single("image"), shopController.updateShop);

// DELETE shop
router.delete("/:id", auth, shopController.deleteShop);

module.exports = router;