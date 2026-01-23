require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { Server } = require("socket.io");
const socketManager = require("./socket");

// ================= APP SETUP =================
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// ================= ROOT ROUTE =================
app.get("/", (req, res) => {
  res.json({
    message: "Fashion API is running",
    timestamp: new Date().toISOString(),
  });
});

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

// ================= HTTP + SOCKET =================
const PORT = process.env.PORT || 3002;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// 🔌 Initialize socket manager ONCE
socketManager.init(io);

io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  socket.on("joinRoom", (userId) => {
    if (userId) socket.join(userId);
  });

  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

// ================= START SERVER =================
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// ================= DATABASE CONNECTION =================
const connectWithRetry = async (retries = 5, delay = 5000) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected successfully");
  } catch (err) {
    console.error("❌ MongoDB error:", err.message);

    if (retries > 0) {
      console.log(`🔄 Retrying MongoDB in ${delay / 1000}s... (${retries} left)`);
      setTimeout(() => connectWithRetry(retries - 1, delay), delay);
    } else {
      console.error("💥 MongoDB connection failed permanently");
      process.exit(1);
    }
  }
};

connectWithRetry();

module.exports = { app, server, io };
