const express = require("express");
const router = express.Router();
const { auth } = require("../middleware/auth");
const {
  createShop,
  getAllShops,
  getMyShops,
  getShopById,
  updateShop,
  deleteShop,
} = require("../controller/shopController");
const multer = require("multer");
const path = require("path");

// ===== MULTER SETUP =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/shops");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname +
        "-" +
        Date.now() +
        path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage });

// ===== ROUTES =====
router.post("/", auth, upload.single("image"), createShop);
router.get("/", getAllShops); // public
router.get("/my", auth, getMyShops);
router.get("/:id", getShopById);
router.put("/:id", auth, upload.single("image"), updateShop);
router.delete("/:id", auth, deleteShop);

module.exports = router;
