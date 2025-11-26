// routes/admin.js
const express = require("express");
const router = express.Router();
const { auth, authorizeRoles } = require("../middleware/auth");
const adminController = require("../controller/adminController");

// ================= DASHBOARD & ANALYTICS =================
router.get("/dashboard", auth, authorizeRoles("admin"), adminController.getDashboardStats);
router.get("/analytics", auth, authorizeRoles("admin"), adminController.getAnalytics);
router.get("/reports", auth, authorizeRoles("admin"), adminController.getSystemReports);

// ================= USER MANAGEMENT =================
router.get("/users", auth, authorizeRoles("admin"), adminController.getAllUsers);
router.get("/users/:id", auth, authorizeRoles("admin"), adminController.getUserDetails);
router.patch("/users/:id/status", auth, authorizeRoles("admin"), adminController.updateUserStatus);
router.delete("/users/:id", auth, authorizeRoles("admin"), adminController.deleteUser);

// ================= SHOP MANAGEMENT =================
router.get("/shops", auth, authorizeRoles("admin"), adminController.getAllShops);
router.get("/shops/:id", auth, authorizeRoles("admin"), adminController.getShopDetails);
router.patch("/shops/:id/status", auth, authorizeRoles("admin"), adminController.updateShopStatus);

// ================= BOOKING MANAGEMENT =================
router.get("/bookings", auth, authorizeRoles("admin"), adminController.getAllBookings);
router.get("/bookings/:id", auth, authorizeRoles("admin"), adminController.getBookingDetails);
router.patch("/bookings/:id", auth, authorizeRoles("admin"), adminController.updateBooking);

// ================= REVIEW MANAGEMENT =================
router.get("/reviews", auth, authorizeRoles("admin"), adminController.getAllReviews);
router.get("/reviews/pending", auth, authorizeRoles("admin"), adminController.getPendingReviews);
router.patch("/reviews/:id/status", auth, authorizeRoles("admin"), adminController.updateReviewStatus);

// ================= ANNOUNCEMENTS & COMMUNICATIONS =================
router.post("/announcements", auth, authorizeRoles("admin"), adminController.createAnnouncement);
router.get("/announcements", auth, authorizeRoles("admin"), adminController.getAnnouncements);
router.patch("/announcements/:id", auth, authorizeRoles("admin"), adminController.updateAnnouncement);
router.delete("/announcements/:id", auth, authorizeRoles("admin"), adminController.deleteAnnouncement);

// ================= FINANCIAL MANAGEMENT =================
router.get("/payments", auth, authorizeRoles("admin"), adminController.getAllPayments);
router.get("/revenue", auth, authorizeRoles("admin"), adminController.getRevenueStats);
router.get("/commissions", auth, authorizeRoles("admin"), adminController.getCommissionReports);

// ================= ADMIN ACTIVITY LOGS =================
router.get("/activities", auth, authorizeRoles("admin"), adminController.getAdminActivities);

module.exports = router;