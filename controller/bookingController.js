const { Booking, Shop } = require("../models/model");

/**
 * @desc Create a new booking
 * @route POST /api/bookings
 * @access Private (Customer only)
 */
exports.createBooking = async (req, res) => {
  try {
    const { shop, service, date, time } = req.body;

    // Validate required fields
    if (!shop || !service?.serviceName || !service?.price || !date || !time) {
      return res.status(400).json({
        message: "Missing required fields: shop, service (serviceName, price), date, and time are required.",
      });
    }

    // Combine date and time into a Date object
    const dateTime = new Date(`${date}T${time}`);

    // Ensure valid date
    if (isNaN(dateTime.getTime())) {
      return res.status(400).json({ message: "Invalid date or time format." });
    }

    // Create new booking
    const booking = new Booking({
      customer: req.user.userId,
      shop,
      service,
      dateTime,
    });

    await booking.save();
    await booking.populate("customer", "name email");
    await booking.populate("shop", "name location");

    res.status(201).json({
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating booking",
      error: error.message,
    });
  }
};

/**
 * @desc Get all bookings (Admin: all, Shop: own bookings, Customer: their own)
 * @route GET /api/bookings
 * @access Private
 */
exports.getBookings = async (req, res) => {
  try {
    let bookings;

    if (req.user.role === "admin") {
      // Admin gets all bookings
      bookings = await Booking.find()
        .populate("customer", "name email")
        .populate("shop", "name location")
        .populate("payment");
    } else if (req.user.role === "shop") {
      // Shop owner gets bookings for their shops
      const userShops = await Shop.find({ owner: req.user.userId });
      const shopIds = userShops.map((s) => s._id);
      bookings = await Booking.find({ shop: { $in: shopIds } })
        .populate("customer", "name email")
        .populate("shop", "name location")
        .populate("payment");
    } else {
      // Customer gets their own bookings
      bookings = await Booking.find({ customer: req.user.userId })
        .populate("customer", "name email")
        .populate("shop", "name location")
        .populate("payment");
    }

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching bookings",
      error: error.message,
    });
  }
};

/**
 * @desc Get a booking by ID
 * @route GET /api/bookings/:id
 * @access Private
 */
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("customer", "name email")
      .populate("shop", "name location")
      .populate("payment");

    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    // Authorization check
    if (
      req.user.role === "customer" &&
      booking.customer._id.toString() !== req.user.userId
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching booking",
      error: error.message,
    });
  }
};

/**
 * @desc Update booking status
 * @route PUT /api/bookings/:id
 * @access Private (Customer or Shop or Admin)
 */
exports.updateBooking = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id).populate("shop");

    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    // Authorization rules
    if (
      req.user.role === "customer" &&
      booking.customer.toString() !== req.user.userId
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (
      req.user.role === "shop" &&
      booking.shop.owner.toString() !== req.user.userId
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Update status
    booking.status = status;
    await booking.save();

    res.status(200).json({
      message: "Booking updated successfully",
      booking,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating booking",
      error: error.message,
    });
  }
};

/**
 * @desc Delete a booking
 * @route DELETE /api/bookings/:id
 * @access Private (Customer or Admin)
 */
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking)
      return res.status(404).json({ message: "Booking not found" });

    if (
      booking.customer.toString() !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Booking.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Booking deleted successfully" });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting booking",
      error: error.message,
    });
  }
};
