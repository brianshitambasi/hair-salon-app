const mongoose = require("mongoose");
const { Booking, Shop, Cart } = require("../models/model");
const { notificationService } = require("./notificationController"); // Add this import

/**
 * @desc Create Individual Booking (without cart)
 * @route POST /booking
 * @access Private (Customer only)
 */
exports.createBooking = async (req, res) => {
  try {
    const { shop, services, dateTime } = req.body;
    const customerId = req.user.userId;

    // Validate input
    if (!shop || !services || !Array.isArray(services) || services.length === 0 || !dateTime) {
      return res.status(400).json({
        message: "Shop, services array, and dateTime are required"
      });
    }

    // Verify shop exists
    const shopExists = await Shop.findById(shop);
    if (!shopExists) {
      return res.status(404).json({ message: "Shop not found" });
    }

    // Calculate total price
    const totalPrice = services.reduce((sum, service) => sum + service.price, 0);

    // Create booking
    const booking = new Booking({
      customer: customerId,
      shop: shop,
      services: services.map(service => ({
        serviceName: service.serviceName,
        price: service.price
      })),
      totalPrice,
      dateTime: new Date(dateTime),
      status: "pending",
    });

    await booking.save();
    
    // ================= NOTIFICATION: New Booking Request =================
    await notificationService.notifyNewBookingRequest(booking, shopExists.owner);
    
    // ================= NOTIFICATION: Customer Confirmation =================
    await notificationService.notifyBookingStatus(
      booking,
      "pending",
      customerId
    );
    
    // Populate details for response
    await booking.populate('customer', 'name email phone');
    await booking.populate('shop', 'name location');
    
    res.status(201).json({
      message: "Booking created successfully",
      booking
    });

  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({
      message: "Error creating booking",
      error: error.message
    });
  }
};

/**
 * @desc Checkout Cart → Create Booking
 * @route POST /booking/checkout
 * @access Private (Customer only)
 */
exports.checkoutCart = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const cart = await Cart.findOne({ customer: customerId }).populate("items.shop");

    if (!cart || cart.items.length === 0)
      return res.status(400).json({ message: "Your cart is empty" });

    const shopId = cart.items[0].shop._id;
    const shop = await Shop.findById(shopId);
    const totalPrice = cart.total;

    const booking = new Booking({
      customer: customerId,
      shop: shopId,
      services: cart.items.map((i) => ({
        serviceName: i.serviceName,
        price: i.price,
      })),
      totalPrice,
      dateTime: req.body.dateTime,
      status: "pending",
    });

    await booking.save();
    
    // ================= NOTIFICATION: New Booking Request =================
    await notificationService.notifyNewBookingRequest(booking, shop.owner);
    
    // ================= NOTIFICATION: Customer Confirmation =================
    await notificationService.notifyBookingStatus(
      booking,
      "pending",
      customerId
    );
    
    await Cart.deleteOne({ _id: cart._id });

    res.status(201).json({ 
      message: "Booking created successfully", 
      booking 
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error creating booking", 
      error: error.message 
    });
  }
};

/**
 * @desc Get bookings (by role)
 * @route GET /booking
 */
exports.getBookings = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === "customer") query.customer = req.user.userId;
    if (req.user.role === "shop") {
      const shops = await Shop.find({ owner: req.user.userId });
      query.shop = { $in: shops.map((s) => s._id) };
    }

    const bookings = await Booking.find(query)
      .populate("customer", "name email phone")
      .populate("shop", "name location")
      .sort({ createdAt: -1 });

    res.status(200).json(bookings);
  } catch (err) {
    res.status(500).json({ 
      message: "Error fetching bookings", 
      error: err.message 
    });
  }
};

/**
 * @desc Update booking status (Shop owner or Customer cancel)
 * @route PATCH /booking/:id
 */
exports.updateBooking = async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate("shop")
      .populate("customer");

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const isCustomer = booking.customer._id.toString() === req.user.userId;
    const isShopOwner = booking.shop.owner.toString() === req.user.userId;
    const isAdmin = req.user.role === "admin";

    if (isCustomer && status === "cancelled" && booking.status === "pending") {
      booking.status = "cancelled";
      booking.cancelledByCustomer = true;
    } else if (isShopOwner && ["confirmed", "completed", "cancelled"].includes(status)) {
      booking.status = status;
      booking.approvedByShop = status === "confirmed";
    } else if (isAdmin) {
      booking.status = status;
    } else {
      return res.status(403).json({ message: "Not authorized for this action" });
    }

    await booking.save();
    
    // ================= NOTIFICATION: Booking Status Update =================
    await notificationService.notifyBookingStatus(
      booking,
      status,
      booking.customer._id,
      booking.shop.owner
    );
    
    // ================= NOTIFICATION: Booking Reminder (if confirmed and for tomorrow) =================
    if (status === "confirmed") {
      const bookingDate = new Date(booking.dateTime);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Check if booking is for tomorrow (same day next day)
      if (bookingDate.toDateString() === tomorrow.toDateString()) {
        await notificationService.notifyBookingReminder(booking, booking.customer._id);
      }
    }

    res.status(200).json({ 
      message: "Booking updated", 
      booking 
    });
  } catch (err) {
    console.error("Update booking error:", err);
    res.status(500).json({ 
      message: "Error updating booking", 
      error: err.message 
    });
  }
};

/**
 * @desc Delete booking (Customer before confirmation or Admin)
 * @route DELETE /booking/:id
 */
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("shop")
      .populate("customer");

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const isCustomer = booking.customer._id.toString() === req.user.userId;
    const isAdmin = req.user.role === "admin";

    if (!isCustomer && !isAdmin)
      return res.status(403).json({ message: "Not authorized" });

    if (["confirmed", "completed"].includes(booking.status) && !isAdmin)
      return res.status(400).json({ message: "Cannot delete confirmed booking" });

    // ================= NOTIFICATION: Booking Cancelled =================
    if (isCustomer) {
      await notificationService.notifyBookingStatus(
        booking,
        "cancelled",
        booking.customer._id,
        booking.shop.owner
      );
    }

    await booking.deleteOne();
    res.status(200).json({ 
      message: "Booking deleted successfully" 
    });
  } catch (err) {
    console.error("Delete booking error:", err);
    res.status(500).json({ 
      message: "Error deleting booking", 
      error: err.message 
    });
  }
};