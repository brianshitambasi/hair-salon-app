// routes/shopRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const { auth } = require("../middleware/auth");
const {
  createShop,
  getAllShops,
  getMyShops,
  getShopById,
  updateShop,
  deleteShop,
} = require("../controller/shopController");

// ===== MULTER MEMORY STORAGE =====
const storage = multer.memoryStorage(); // Store file in memory as buffer
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// ===== ROUTES =====
router.post("/", auth, upload.single("image"), createShop);
router.get("/", getAllShops); // public
router.get("/my", auth, getMyShops);
router.get("/:id", getShopById);
router.put("/:id", auth, upload.single("image"), updateShop);
router.delete("/:id", auth, deleteShop);

module.exports = router;