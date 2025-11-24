const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const http = require("http");
require("dotenv").config();

const app = express();

// ================= Create HTTP Server =================
const server = http.createServer(app);

// ================= Socket.IO Setup =================
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: function (origin, callback) {
      const allowedOrigins = [
        "http://localhost:3000",
        "https://fashion-nairobi.vercel.app"
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed for this origin"), false);
      }
    },
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store connected users
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join user to their personal room
  socket.on('join-user', (userId) => {
    socket.join(`user_${userId}`);
    connectedUsers.set(socket.id, userId);
    console.log(`User ${userId} joined their room`);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    const userId = connectedUsers.get(socket.id);
    if (userId) {
      connectedUsers.delete(socket.id);
      console.log(`User ${userId} disconnected`);
    }
  });
});

// Make io accessible to our routes and controllers
global.io = io;

// ================= CORS Configuration =================
const allowedOrigins = [
  "http://localhost:3000",
  "https://fashion-nairobi.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (e.g., Postman, server-to-server)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("CORS not allowed for this origin: " + origin), false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

// Correct preflight response handler
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(200);
});

// ================= Middleware =================
app.use(express.json());

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================= Routes =================
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Hair Salon API is running",
    timestamp: new Date().toISOString()
  });
});

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

// Shop routes
const shopRoutes = require("./routes/shopRoutes");
app.use("/shop", shopRoutes);

// Cart routes
const cartRoutes = require("./routes/cartRoutes");
app.use("/cart", cartRoutes);

// Product routes
const productRoutes = require("./routes/productRoutes");
app.use("/product", productRoutes);

// ================= NOTIFICATION ROUTES =================
const notificationRoutes = require("./routes/notificationRoutes");
app.use("/notifications", notificationRoutes);

// ================= ADMIN ROUTES =================
const adminRoutes = require("./routes/admin");
app.use("/admin", adminRoutes);

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({
    message: "Server healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// ================= Database Connection =================
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err.message));

// ================= Error Handling Middleware =================
app.use((err, req, res, next) => {
  console.error("🔥 Error:", err.stack);
  res.status(500).json({
    message: "Server Error",
    error: process.env.NODE_ENV === "production" ? null : err.message
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
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔔 Notification system: ACTIVE`);
  console.log(`👑 Admin routes available at: /admin/*`);
});