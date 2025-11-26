// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http"); // Required for Socket.IO
const { Server } = require("socket.io");

const app = express();

// ================= MIDDLEWARE =================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // adjust origin if needed for production

// ================= ROOT ROUTE =================
app.get("/", (req, res) => {
  res.json({
    message: "Fashion API is running",
    timestamp: new Date().toISOString(),
  });
});

// ================= DATABASE CONNECTION =================
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ================= ROUTES =================
app.use("/user", require("./routes/userRoutes"));
app.use("/settings", require("./routes/settingsRoutes"));
app.use("/booking", require("./routes/bookingRoutes"));
app.use("/hairstyle", require("./routes/hairstyleRoutes"));
app.use("/payment", require("./routes/paymentRoutes"));
app.use("/review", require("./routes/reviewRoutes"));
app.use("/shop", require("./routes/shopRoutes"));
app.use("/cart", require("./routes/cartRoutes"));
app.use("/product", require("./routes/productRoutes"));
app.use("/notifications", require("./routes/notificationRoutes"));
app.use("/admin", require("./routes/adminRoutes"));

// ================= GLOBAL ERROR HANDLER =================
app.use((err, req, res, next) => {
  console.error("❌ ERROR:", err.message);
  res.status(err.status || 500).json({
    error: true,
    message: err.message || "Server Error",
  });
});

// ================= SOCKET.IO SETUP =================
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // change "*" to your frontend URL in production
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("🟢 New client connected:", socket.id);

  // Example: Listening for events from frontend
  socket.on("joinRoom", (room) => {
    console.log(`Client ${socket.id} joined room: ${room}`);
    socket.join(room);
  });

  socket.on("sendNotification", (data) => {
    console.log("Notification data received:", data);
    // Broadcast to a specific room or all clients
    io.to(data.room).emit("receiveNotification", data.message);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

// ================= SERVER LISTENER =================
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Export app for testing or further extensions
module.exports = { app, server, io };
