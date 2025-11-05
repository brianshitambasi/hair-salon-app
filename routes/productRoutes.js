const express = require("express");
const router = express.Router();
const productController = require("../controller/productController");
const { auth } = require("../middleware/auth"); // <-- you already have this
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

// CUSTOMER (view only)
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);

// SHOPOWNER / ADMIN (requires auth)
router.post("/", auth, upload.single("image"), productController.createProduct);
router.put("/:id", auth, upload.single("image"), productController.updateProduct);
router.delete("/:id", auth, productController.deleteProduct);

module.exports = router;
