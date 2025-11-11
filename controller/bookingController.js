const { Booking, Shop } = require("../models/model");

/**
 * @desc Create a new booking
 * @route POST /booking
 * @access Private (Customer only)
 */
exports.createBooking = async (req, res) => {
  try {
    const { shop, services, dateTime } = req.body;

    // Validate
    if (!shop || !Array.isArray(services) || services.length === 0 || !dateTime) {
      return res.status(400).json({
        message: "Missing required fields: shop, services[], and dateTime are required.",
      });
    }

    // Validate service fields
    for (const s of services) {
      if (!s.serviceName || !s.price) {
        return res.status(400).json({
          message: "Each service must include serviceName and price.",
        });
      }
    }

    const parsedDate = new Date(dateTime);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ message: "Invalid dateTime format." });
    }

    // Create booking
    const booking = new Booking({
      customer: req.user.userId,
      shop,
      services,
      dateTime: parsedDate,
    });

    await booking.save();
    await booking.populate("customer", "name email");
    await booking.populate("shop", "name location");

    res.status(201).json({
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({
      message: "Error creating booking",
      error: error.message,
    });
  }
};

/**
 * @desc Get all bookings (filtered by role)
 * @route GET /booking
 * @access Private
 */
exports.getBookings = async (req, res) => {
  try {
    let bookings;

    if (req.user.role === "admin") {
      // Admin gets all
      bookings = await Booking.find()
        .populate("customer", "name email")
        .populate("shop", "name location");
    } else if (req.user.role === "shop") {
      // Shop owner: get bookings for owned shops
      const ownedShops = await Shop.find({ owner: req.user.userId });
      const shopIds = ownedShops.map((s) => s._id);
      bookings = await Booking.find({ shop: { $in: shopIds } })
        .populate("customer", "name email")
        .populate("shop", "name location");
    } else {
      // Customer: only their own
      bookings = await Booking.find({ customer: req.user.userId })
        .populate("customer", "name email")
        .populate("shop", "name location");
    }

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching bookings",
      error: error.message,
    });
  }
};

exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("customer", "name email")
      .populate("shop", "name location");

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    res.status(200).json(booking);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching booking",
      error: error.message,
    });
  }
};



exports.getBookingsForMyShops = async (req, res) => {
  try {
    // Ensure only shop owners can access
    if (req.user.role !== "shop") {
      return res.status(403).json({ message: "Access denied. Shop owners only." });
    }

    // Find shops owned by this user
    const userShops = await Shop.find({ owner: req.user.userId });
    const shopIds = userShops.map((s) => s._id);

    // Find bookings for those shops
    const bookings = await Booking.find({ shop: { $in: shopIds } })
      .populate("customer", "name email")
      .populate("shop", "name location")
      .populate("payment");

    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching bookings for your shops",
      error: error.message,
    });
  }
};

exports.updateBooking = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id).populate("shop");

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // Authorization checks
    if (req.user.role === "customer" && booking.customer.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (req.user.role === "shop" && booking.shop.owner.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    booking.status = status;
    await booking.save();

    res.status(200).json({
      message: "Booking status updated successfully",
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
 * @desc Delete booking
 * @route DELETE /booking/:id
 * @access Private (Customer or Admin)
 */
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.customer.toString() !== req.user.userId && req.user.role !== "admin") {
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
