const { Booking, Shop, Cart, User } = require("../models/model");
const notificationService = require("../services/notificationService");

// =========================================================
// CREATE INDIVIDUAL BOOKING
// =========================================================
const createBooking = async (req, res) => {
  try {
    const { shop, services, dateTime, specialRequests } = req.body;
    const customerId = req.user.userId;

    if (!shop || !services || services.length === 0 || !dateTime) {
      return res.status(400).json({
        success: false,
        message: "Shop, services array, and dateTime are required."
      });
    }

    const shopExists = await Shop.findById(shop);
    if (!shopExists) {
      return res.status(404).json({
        success: false,
        message: "Shop not found."
      });
    }

    const formattedServices = services.map(s => ({
      serviceName: s.serviceName,
      price: Number(s.price) || 0,
      duration: Number(s.duration) || 60
    }));

    const bookingData = {
      customer: customerId,
      shop,
      services: formattedServices,
      dateTime: new Date(dateTime),
    };

    if (specialRequests) bookingData.specialRequests = specialRequests;

    const booking = new Booking(bookingData);
    await booking.validate();
    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate("customer", "name email")
      .populate("shop", "name owner location");

    try {
      if (notificationService?.notifyNewBookingRequest) {
        await notificationService.notifyNewBookingRequest(populatedBooking, shopExists.owner);
      }
      if (notificationService?.notifyBookingStatus) {
        await notificationService.notifyBookingStatus(populatedBooking, "pending", customerId);
      }
    } catch (err) {
      console.log("Non-critical notification error:", err);
    }

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      booking: populatedBooking
    });
  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating booking",
      error: error.message
    });
  }
};

// =========================================================
// CHECKOUT CART -> CREATE BOOKING
// =========================================================
const checkoutCart = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { dateTime, specialRequests } = req.body;

    if (!dateTime) {
      return res.status(400).json({
        success: false,
        message: "dateTime is required."
      });
    }

    const cart = await Cart.findOne({ customer: customerId }).populate("items.shop");

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Your cart is empty."
      });
    }

    const shopId = cart.items[0].shop._id;
    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found."
      });
    }

    const formattedServices = cart.items.map(item => ({
      serviceName: item.serviceName,
      price: Number(item.price) || 0,
      duration: Number(item.duration) || 60
    }));

    const bookingData = {
      customer: customerId,
      shop: shopId,
      services: formattedServices,
      dateTime: new Date(dateTime)
    };

    if (specialRequests) bookingData.specialRequests = specialRequests;

    const booking = new Booking(bookingData);
    await booking.validate();
    await booking.save();

    const populatedBooking = await Booking.findById(booking._id)
      .populate("customer", "name email phone")
      .populate("shop", "name location owner");

    // Notifications
    try {
      if (notificationService?.notifyNewBookingRequest) {
        await notificationService.notifyNewBookingRequest(populatedBooking, shop.owner);
      }
      if (notificationService?.notifyBookingStatus) {
        await notificationService.notifyBookingStatus(populatedBooking, "pending", customerId);
      }
    } catch (err) {
      console.log("Non-critical notification error:", err);
    }

    // Clear cart
    await Cart.deleteOne({ _id: cart._id });

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      booking: populatedBooking
    });
  } catch (error) {
    console.error("Checkout booking error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating booking",
      error: error.message
    });
  }
};

// =========================================================
// GET BOOKINGS FOR USER / SHOP / ADMIN
// =========================================================
const getBookings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const role = req.user.role;

    let filter = {};
    if (role === "customer") {
      filter.customer = userId;
    } else if (role === "shop") {
      filter.shop = req.user.shopId;
    }
    // Admin sees everything

    let bookings = await Booking.find(filter)
      .populate("customer", "name email phone")
      .populate("shop", "name location contactEmail")
      .sort({ createdAt: -1 });

    // Wrap to always return array
    if (!Array.isArray(bookings)) bookings = [];

    res.status(200).json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching bookings",
      error: error.message
    });
  }
};

// =========================================================
// UPDATE BOOKING STATUS
// =========================================================
const updateBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status, cancellationReason } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    if (status) booking.status = status;
    if (cancellationReason) booking.cancellationReason = cancellationReason;

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Booking updated successfully",
      booking
    });
  } catch (error) {
    console.error("Update booking error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating booking",
      error: error.message
    });
  }
};

// =========================================================
// DELETE BOOKING
// =========================================================
const deleteBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    await Booking.deleteOne({ _id: bookingId });

    res.status(200).json({
      success: true,
      message: "Booking deleted successfully"
    });
  } catch (error) {
    console.error("Delete booking error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting booking",
      error: error.message
    });
  }
};

module.exports = {
  createBooking,
  checkoutCart,
  getBookings,
  updateBooking,
  deleteBooking
};
