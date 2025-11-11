const express = require("express");
const router = express.Router();
const bookingController = require("../controller/bookingController");
const { auth } = require("../middleware/auth");

// Create booking
router.post("/", auth, bookingController.createBooking);

// Get all bookings (filtered by role)
router.get("/", auth, bookingController.getBookings);

// Get bookings for shops owned by this shop owner
router.get("/my-shops", auth, bookingController.getBookingsForMyShops);

// Get booking by ID
router.get("/:id", auth, bookingController.getBookingById);

// Update booking status
router.put("/:id", auth, bookingController.updateBooking);

// Delete booking
router.delete("/:id", auth, bookingController.deleteBooking);

module.exports = router;
