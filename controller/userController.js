const { User } = require("../models/model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { notificationController } = require("./notificationController");

// ========================
// Register User
// ========================
const registerUser = async (req, res) => {
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

    const user = new User({
      name, email, password: hashedPassword, phone, address, role
    });
    await user.save();

    // Send welcome notifications
    if (notificationController?.createNotification) {
      await notificationController.createNotification(
        user._id,
        "Welcome to Our Platform! 🎉",
        `Hi ${name}, thank you for joining as a ${role}.`,
        "system",
        null,
        role === "shop" ? "/shop/dashboard" : "/services",
        "medium"
      );
    }

    return res.status(201).json({
      message: "User registered successfully",
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, address: user.address, role: user.role }
    });
  } catch (error) {
    console.error("registerUser error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ========================
// Login User
// ========================
const loginUser = async (req, res) => {
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

    // Login notifications
    if (notificationController?.createNotification) {
      await notificationController.createNotification(
        user._id,
        "Login Alert 🔐",
        `You logged in at ${new Date().toLocaleString()}.`,
        "system",
        null,
        "/security",
        "high"
      );
    }

    return res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email, phone: user.phone, address: user.address, role: user.role }
    });
  } catch (error) {
    console.error("loginUser error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// ========================
// Get Current User (Me)
// ========================
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (error) {
    console.error("getMe error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ========================
// Get User Profile
// ========================
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({ user });
  } catch (error) {
    console.error("getUserProfile error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ========================
// Update User Profile
// ========================
const updateUserProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name: name || user.name, phone: phone || user.phone, address: address || user.address },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({ message: "Profile updated", user: updatedUser });
  } catch (error) {
    console.error("updateUserProfile error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ========================
// Change Password
// ========================
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;
    if (!currentPassword || !newPassword) return res.status(400).json({ message: "Current and new password required" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) return res.status(400).json({ message: "Current password incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("changePassword error:", error);
    res.status(500).json({ message: error.message });
  }
};

// ========================
// Export all functions
// ========================
module.exports = {
  registerUser,
  loginUser,
  getMe,
  getUserProfile,
  updateUserProfile,
  changePassword
};
