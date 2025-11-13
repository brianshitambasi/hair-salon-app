// =========================
// Main Entry File - app.js
// =========================

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// ================= Middleware =================

// ✅ Configure CORS to allow frontend access
app.use(
  cors({
    origin: [
      "http://localhost:3000",              // Local React app (development)
      "https://hair-salon-app.vercel.app",  // Your deployed frontend (production)
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // enable if using cookies or auth headers
  })
);

// ✅ Parse incoming requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Static folder for uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================= Routes =================

// User routes
const userRoutes = require("./routes/userRoutes");
app.use("/user", userRoutes);

// Settings routes
const settingsRoutes = require("./routes/settingsRoutes");
app.use("/settings", settingsRoutes);

// Booking routes
const bookingRoutes = require("./routes/bookingRoutes");
app.use("/booking", bookingRoutes);

// Hairstyle routes
const hairstyleRoutes = require("./routes/hairstyleRoutes");
app.use("/hairstyle", hairstyleRoutes);

// Payment routes
const paymentRoutes = require("./routes/paymentRoutes");
app.use("/payment", paymentRoutes);

// Review routes
const reviewRoutes = require("./routes/reviewRoutes");
app.use("/review", reviewRoutes);

// Shop routes (includes image upload)
const shopRoutes = require("./routes/shopRoutes");
app.use("/shop", shopRoutes);

// Cart routes
const cartRoutes = require("./routes/cartRoutes");
app.use("/cart", cartRoutes);

// Product routes (includes image upload)
const productRoutes = require("./routes/productRoutes");
app.use("/product", productRoutes);

// ================= Database Connection =================
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

// ================= Test Route =================
app.get("/", (req, res) => {
  res.send("✅ Hair Salon API is running with proper CORS configuration!");
});

// ================= Start Server =================
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
