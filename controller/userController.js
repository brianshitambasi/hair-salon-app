const { User } = require("../models/model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { notificationService } = require("./notificationController");

// ========================
// Register User
// ========================
exports.registerUser = async (req, res) => {
  try {
    let { name, email, password, phone, address, role } = req.body;

    if (!name || !email || !password || !phone || !address || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    role = role.toLowerCase();
    const validRoles = ["shop", "customer", "admin"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({ name, email, password: hashedPassword, phone, address, role });
    await user.save();

    // Notifications
    await notificationService.createNotification(
      user._id,
      "Welcome to Our Platform! 🎉",
      `Hi ${name}, thank you for joining us as a ${role}. Start exploring our services now!`,
      "system",
      null,
      role === "shop" ? "/shop/dashboard" : "/services",
      "medium"
    );

    return res.status(201).json({
      message: "User registered successfully",
      user: { id: user._id, name, email, phone, address, role }
    });
  } catch (error) {
    console.error("Error in registerUser:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ========================
// Login User
// ========================
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return res.status(400).json({ message: "Invalid password" });

    // Update login info
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "12h" });

    // Notifications
    const loginTime = new Date().toLocaleString();
    await notificationService.createNotification(
      user._id,
      "Login Alert 🔐",
      `You logged in successfully at ${loginTime}. If this wasn't you, contact support immediately.`,
      "system",
      null,
      "/security",
      "high"
    );

    if (user.loginCount > 1) {
      await notificationService.createNotification(
        user._id,
        "Welcome Back! 👋",
        `Good to see you again, ${user.name}!`,
        "system",
        null,
        user.role === "shop" ? "/shop/dashboard" : "/dashboard",
        "low"
      );
    }

    return res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, address: user.address, role: user.role }
    });
  } catch (error) {
    console.error("Error in loginUser:", error);
    return res.status(500).json({ message: "Server error during login" });
  }
};
