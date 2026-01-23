const express = require("express");
const { auth } = require("../middleware/auth");
const bookingController = require("../controller/bookingController");
const router = express.Router();

// Create individual booking (without cart)
router.post("/", auth, bookingController.createBooking);

// Checkout cart to create booking
router.post("/checkout", auth, bookingController.checkoutCart);

// Get bookings
router.get("/", auth, bookingController.getBookings);

// Update booking status
router.patch("/:id", auth, bookingController.updateBooking);

// Delete booking
router.delete("/:id", auth, bookingController.deleteBooking);

module.exports = router;

