// controller/adminController.js
const mongoose = require("mongoose");
const { User, Shop, Booking, Payment, Review, Announcement, AdminActivity, SystemReport } = require("../models/model");

// ================= DASHBOARD & ANALYTICS =================
exports.getDashboardStats = async (req, res) => {
  try {
    // Get counts
    const totalUsers = await User.countDocuments();
    const totalShops = await Shop.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const pendingReviews = await Review.countDocuments({ status: "pending" });
    
    // Get revenue stats
    const revenueStats = await Payment.aggregate([
      { $match: { status: "success" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$amount" },
          totalCommission: { $sum: "$commission" }
        }
      }
    ]);

    // Recent bookings
    const recentBookings = await Booking.find()
      .populate("customer", "name email")
      .populate("shop", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    // Recent users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10);

    // Log admin activity
    await AdminActivity.create({
      admin: req.user.userId,
      action: "view_dashboard",
      resource: "dashboard",
      ipAddress: req.ip
    });

    res.status(200).json({
      stats: {
        totalUsers,
        totalShops,
        totalBookings,
        pendingReviews,
        totalRevenue: revenueStats[0]?.totalRevenue || 0,
        totalCommission: revenueStats[0]?.totalCommission || 0
      },
      recentBookings,
      recentUsers
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({
      message: "Error fetching dashboard data",
      error: error.message
    });
  }
};

exports.getSystemReports = async (req, res) => {
  try {
    const { period = "monthly" } = req.query;
    
    const reports = await SystemReport.find({ period })
      .sort({ date: -1 })
      .limit(12);

    res.status(200).json(reports);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching system reports",
      error: error.message
    });
  }
};

exports.getAnalytics = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // User registration analytics
    const userRegistrations = await User.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Booking analytics
    const bookingAnalytics = await Booking.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
          revenue: { $sum: "$totalPrice" }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      userRegistrations,
      bookingAnalytics
    });

  } catch (error) {
    res.status(500).json({
      message: "Error fetching analytics",
      error: error.message
    });
  }
};

// ================= USER MANAGEMENT =================
exports.getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, search } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    res.status(500).json({
      message: "Error fetching users",
      error: error.message
    });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate({
        path: "bookings",
        populate: [
          { path: "shop", select: "name location" },
          { path: "services" }
        ]
      });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching user details",
      error: error.message
    });
  }
};

exports.updateUserStatus = async (req, res) => {
  try {
    const { active } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { active },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Log activity
    await AdminActivity.create({
      admin: req.user.userId,
      action: active ? "activate_user" : "deactivate_user",
      resource: "user",
      resourceId: user._id,
      details: { userId: user._id, status: active },
      ipAddress: req.ip
    });

    res.status(200).json({
      message: `User ${active ? "activated" : "deactivated"} successfully`,
      user
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating user status",
      error: error.message
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Log activity
    await AdminActivity.create({
      admin: req.user.userId,
      action: "delete_user",
      resource: "user",
      resourceId: user._id,
      details: { userId: user._id, email: user.email },
      ipAddress: req.ip
    });

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting user",
      error: error.message
    });
  }
};

// ================= SHOP MANAGEMENT =================
exports.getAllShops = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } }
      ];
    }

    const shops = await Shop.find(query)
      .populate("owner", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Shop.countDocuments(query);

    res.status(200).json({
      shops,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    res.status(500).json({
      message: "Error fetching shops",
      error: error.message
    });
  }
};

exports.getShopDetails = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id)
      .populate("owner", "name email phone")
      .populate("reviews");

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // Get shop bookings
    const bookings = await Booking.find({ shop: req.params.id })
      .populate("customer", "name email")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      shop,
      bookings
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching shop details",
      error: error.message
    });
  }
};

// ================= UPDATE SHOP STATUS =================
exports.updateShopStatus = async (req, res) => {
  try {
    const { isVerified, featured, isActive } = req.body;
    
    const updateData = {};
    if (isVerified !== undefined) updateData.isVerified = isVerified;
    if (featured !== undefined) updateData.featured = featured;
    if (isActive !== undefined) updateData.isActive = isActive;

    const shop = await Shop.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate("owner", "name email");

    if (!shop) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // Log activity
    await AdminActivity.create({
      admin: req.user.userId,
      action: "update_shop_status",
      resource: "shop",
      resourceId: shop._id,
      details: updateData,
      ipAddress: req.ip
    });

    res.status(200).json({
      message: "Shop updated successfully",
      shop
    });

  } catch (error) {
    res.status(500).json({
      message: "Error updating shop status",
      error: error.message
    });
  }
};

// ================= BOOKING MANAGEMENT =================
exports.getAllBookings = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, date } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) query.status = status;
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      query.createdAt = { $gte: startDate, $lt: endDate };
    }

    const bookings = await Booking.find(query)
      .populate("customer", "name email phone")
      .populate("shop", "name location")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    res.status(200).json({
      bookings,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    res.status(500).json({
      message: "Error fetching bookings",
      error: error.message
    });
  }
};

// ================= GET BOOKING DETAILS =================
exports.getBookingDetails = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("customer", "name email phone")
      .populate("shop", "name location contactPhone")
      .populate("payment");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json(booking);

  } catch (error) {
    res.status(500).json({
      message: "Error fetching booking details",
      error: error.message
    });
  }
};

// ================= UPDATE BOOKING =================
exports.updateBooking = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status, adminNotes },
      { new: true }
    )
    .populate("customer", "name email")
    .populate("shop", "name");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Log activity
    await AdminActivity.create({
      admin: req.user.userId,
      action: "update_booking",
      resource: "booking",
      resourceId: booking._id,
      details: { status, adminNotes },
      ipAddress: req.ip
    });

    res.status(200).json({
      message: "Booking updated successfully",
      booking
    });

  } catch (error) {
    res.status(500).json({
      message: "Error updating booking",
      error: error.message
    });
  }
};

// ================= REVIEW MANAGEMENT =================
exports.getAllReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) query.status = status;

    const reviews = await Review.find(query)
      .populate("customer", "name email")
      .populate("shop", "name")
      .populate("booking")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Review.countDocuments(query);

    res.status(200).json({
      reviews,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    res.status(500).json({
      message: "Error fetching reviews",
      error: error.message
    });
  }
};

exports.getPendingReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ status: "pending" })
      .populate("customer", "name email")
      .populate("shop", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(reviews);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching pending reviews",
      error: error.message
    });
  }
};

exports.updateReviewStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status, adminNotes },
      { new: true }
    ).populate("customer", "name email")
     .populate("shop", "name");

    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    // Log activity
    await AdminActivity.create({
      admin: req.user.userId,
      action: "update_review_status",
      resource: "review",
      resourceId: review._id,
      details: { reviewId: review._id, status, adminNotes },
      ipAddress: req.ip
    });

    res.status(200).json({
      message: "Review status updated successfully",
      review
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating review status",
      error: error.message
    });
  }
};

// ================= ANNOUNCEMENTS =================
exports.createAnnouncement = async (req, res) => {
  try {
    const { title, message, target, targetShops, scheduledAt } = req.body;

    const announcement = new Announcement({
      title,
      message,
      target,
      targetShops: target === "specific_shops" ? targetShops : [],
      sentBy: req.user.userId,
      scheduledAt: scheduledAt || new Date()
    });

    await announcement.save();

    // Log activity
    await AdminActivity.create({
      admin: req.user.userId,
      action: "create_announcement",
      resource: "announcement",
      resourceId: announcement._id,
      details: { title, target },
      ipAddress: req.ip
    });

    res.status(201).json({
      message: "Announcement created successfully",
      announcement
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating announcement",
      error: error.message
    });
  }
};

exports.getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate("sentBy", "name")
      .populate("targetShops", "name")
      .sort({ createdAt: -1 });

    res.status(200).json(announcements);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching announcements",
      error: error.message
    });
  }
};

// ================= UPDATE ANNOUNCEMENT =================
exports.updateAnnouncement = async (req, res) => {
  try {
    const updateData = req.body;
    
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    res.status(200).json({
      message: "Announcement updated successfully",
      announcement
    });

  } catch (error) {
    res.status(500).json({
      message: "Error updating announcement",
      error: error.message
    });
  }
};

// ================= DELETE ANNOUNCEMENT =================
exports.deleteAnnouncement = async (req, res) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // Log activity
    await AdminActivity.create({
      admin: req.user.userId,
      action: "delete_announcement",
      resource: "announcement",
      resourceId: announcement._id,
      details: { title: announcement.title },
      ipAddress: req.ip
    });

    res.status(200).json({ message: "Announcement deleted successfully" });

  } catch (error) {
    res.status(500).json({
      message: "Error deleting announcement",
      error: error.message
    });
  }
};

// ================= FINANCIAL MANAGEMENT =================
exports.getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status) query.status = status;

    const payments = await Payment.find(query)
      .populate("booking")
      .populate({
        path: "booking",
        populate: [
          { path: "customer", select: "name email" },
          { path: "shop", select: "name" }
        ]
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Payment.countDocuments(query);

    res.status(200).json({
      payments,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    res.status(500).json({
      message: "Error fetching payments",
      error: error.message
    });
  }
};

exports.getRevenueStats = async (req, res) => {
  try {
    const { period = "monthly" } = req.query;

    const revenueStats = await Payment.aggregate([
      { $match: { status: "success" } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m", date: "$createdAt" }
          },
          totalRevenue: { $sum: "$amount" },
          totalCommission: { $sum: "$commission" },
          paymentCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json(revenueStats);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching revenue stats",
      error: error.message
    });
  }
};

// ================= COMMISSION REPORTS =================
exports.getCommissionReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let matchStage = { status: "success" };
    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const commissionReports = await Payment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$shop",
          totalCommission: { $sum: "$commission" },
          totalRevenue: { $sum: "$amount" },
          paymentCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "shops",
          localField: "_id",
          foreignField: "_id",
          as: "shop"
        }
      },
      { $unwind: "$shop" },
      {
        $project: {
          shopName: "$shop.name",
          totalCommission: 1,
          totalRevenue: 1,
          paymentCount: 1
        }
      },
      { $sort: { totalCommission: -1 } }
    ]);

    res.status(200).json(commissionReports);

  } catch (error) {
    res.status(500).json({
      message: "Error fetching commission reports",
      error: error.message
    });
  }
};

// ================= ADMIN ACTIVITIES =================
exports.getAdminActivities = async (req, res) => {
  try {
    const { page = 1, limit = 20, adminId, action } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (adminId) query.admin = adminId;
    if (action) query.action = action;

    const activities = await AdminActivity.find(query)
      .populate("admin", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AdminActivity.countDocuments(query);

    res.status(200).json({
      activities,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total
    });

  } catch (error) {
    res.status(500).json({
      message: "Error fetching admin activities",
      error: error.message
    });
  }
};

module.exports = exports;