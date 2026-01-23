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
  searchShops
} = require("../controller/shopController");

// ===== MULTER MEMORY STORAGE =====
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, JPG, and WebP files are allowed!'), false);
    }
  }
});

// ===== ROUTES =====
router.post("/", auth, upload.single("image"), createShop);
router.get("/", getAllShops); // Public access
router.get("/search", searchShops); // Search shops
router.get("/my", auth, getMyShops); // Get authenticated user's shops
router.get("/:id", getShopById); // Get single shop by ID
router.put("/:id", auth, upload.single("image"), updateShop); // Update shop
router.delete("/:id", auth, deleteShop); // Delete shop

module.exports = router;