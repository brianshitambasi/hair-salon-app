// =========================
// Main Entry File - app.js
// =========================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// ================= Improved CORS Configuration =================

// Handle preflight requests explicitly
app.options('*', cors()); // This handles ALL preflight requests

const corsOptions = {
  origin: ["http://localhost:3000", "https://your-frontend-domain.com"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "X-Requested-With",
    "Accept",
    "Origin",
    "Access-Control-Request-Method",
    "Access-Control-Request-Headers"
  ],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// ================= Middleware =================
app.use(express.json());

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

// ================= Health Check Route =================
app.get("/health", (req, res) => {
  res.status(200).json({ 
    message: "Server is running successfully", 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ================= Database Connection =================
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err.message));

// ================= Error Handling Middleware =================
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
  res.status(500).json({ 
    message: "Something went wrong!", 
    error: process.env.NODE_ENV === 'production' ? {} : err.message 
  });
});

// ================= 404 Handler =================
app.use((req, res) => {
  res.status(404).json({ 
    message: "Route not found",
    path: req.path,
    method: req.method
  });
});

// ================= Start Server =================
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for: ${corsOptions.origin.join(', ')}`);
  console.log(`✅ Allowed methods: ${corsOptions.methods.join(', ')}`);
  console.log(`🔧 Preflight requests handled`);
});