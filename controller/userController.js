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
      return res
        .status(400)
        .json({ message: "Invalid role. Use: shop, customer, or admin" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      role,
    });

    await user.save();

    // Notification: Welcome
    await notificationService.createNotification(
      user._id,
      "Welcome to Our Platform! 🎉",
      `Hi ${name}, thank you for joining us as a ${role}. Start exploring our services now!`,
      "system",
      null,
      role === "shop" ? "/shop/dashboard" : "/services",
      "medium"
    );

    // Notification: Setup Guide
    if (role === "shop") {
      await notificationService.createNotification(
        user._id,
        "Shop Setup Guide 🛠️",
        "Complete your shop profile, add services, and start accepting bookings!",
        "system",
        null,
        "/shop/setup",
        "low"
      );
    } else if (role === "customer") {
      await notificationService.createNotification(
        user._id,
        "Getting Started 👋",
        "Browse shops, book services, and manage your appointments easily!",
        "system",
        null,
        "/services",
        "low"
      );
    }

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
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

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Update login data
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "12h" }
    );

    // Notification: Login Alert
    const loginTime = new Date().toLocaleString();
    await notificationService.createNotification(
      user._id,
      "Login Alert 🔐",
      `You logged in successfully at ${loginTime}. If this wasn't you, please contact support immediately.`,
      "system",
      null,
      "/security",
      "high"
    );

    // Notification: Welcome Back
    if (user.loginCount > 1) {
      await notificationService.createNotification(
        user._id,
        "Welcome Back! 👋",
        `Good to see you again, ${user.name}!`,
        "system",
        null,
        user.role === "shop" ? "/shop/dashboard" : "/dashboard", // ✅ FIXED HERE
        "low"
      );
    }

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error in loginUser:", error);
    return res.status(500).json({ message: "Server error during login" });
  }
};

// ========================
// Get User Profile
// ========================
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error in getUserProfile:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ========================
// Get Current User (Me)
// ========================
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Error in getMe:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ========================
// Update User Profile
// ========================
exports.updateUserProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    const userId = req.user.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatedFields = [];
    if (name && name !== user.name) updatedFields.push("name");
    if (phone && phone !== user.phone) updatedFields.push("phone");
    if (address && address !== user.address) updatedFields.push("address");

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, phone, address },
      { new: true, runValidators: true }
    ).select("-password");

    if (updatedFields.length > 0) {
      await notificationService.createNotification(
        userId,
        "Profile Updated ✅",
        `Your ${updatedFields.join(", ")} has been updated successfully.`,
        "system",
        null,
        "/profile",
        "low"
      );
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error in updateUserProfile:", error);
    return res.status(500).json({ message: error.message });
  }
};

// ========================
// Change Password
// ========================
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isValidPassword) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    await notificationService.createNotification(
      userId,
      "Password Changed 🔒",
      "Your password has been changed successfully. If you didn't make this change, please contact support immediately.",
      "system",
      null,
      "/security",
      "high"
    );

    return res.status(200).json({
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error in changePassword:", error);
    return res.status(500).json({ message: error.message });
  }
};
