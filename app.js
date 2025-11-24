const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const http = require("http"); // Add this
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
// ... rest of your CORS config remains the same

// ================= Middleware =================
app.use(express.json());

// Serve uploaded images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ================= Routes =================
// ... your existing routes

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
// Change app.listen to server.listen
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔔 Notification system: ACTIVE`);
  console.log(`👑 Admin routes available at: /admin/*`);
});