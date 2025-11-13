const express = require("express");
const { auth } = require("../middleware/auth");
const bookingController = require("../controller/bookingController");
const router = express.Router();

router.post("/checkout", auth, bookingController.checkoutCart);
router.get("/", auth, bookingController.getBookings);
router.patch("/:id", auth, bookingController.updateBooking);
router.delete("/:id", auth, bookingController.deleteBooking);

module.exports = router;
