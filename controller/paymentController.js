const axios = require("axios");
const { Payment, Booking, Shop } = require("../models/model");

// ✅ Commission setup (adjust as needed)
const COMMISSION_RATE = 0.05;

/**
 * @desc Create a payment (initiate STK push simulation)
 * @route POST /api/payments
 * @access Private (Customer)
 */
exports.createPayment = async (req, res) => {
  try {
    const { booking: bookingId, amount, method, transactionRef } = req.body;

    // 1️⃣ Validate input
    if (!bookingId || !amount || !method) {
      return res.status(400).json({ message: "booking, amount, and method are required" });
    }

    // 2️⃣ Find the booking
    const booking = await Booking.findById(bookingId).populate("shop");
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // 3️⃣ Calculate commission and shop earnings
    const commission = Math.round(amount * COMMISSION_RATE);
    const shopEarning = amount - commission;

    // 4️⃣ Create payment record (pending)
    const payment = new Payment({
      booking: bookingId,
      amount,
      method,
      status: "pending",
      transactionRef: transactionRef || `MPESA-${Date.now()}`,
      commission,
      shopEarning,
    });

    await payment.save();

    // 5️⃣ Simulate MPESA STK push (sandbox/demo)
    console.log("📲 Simulating STK Push...");
    // In production, you would integrate actual M-Pesa Daraja API here

    // 6️⃣ Mark as success automatically for now
    payment.status = "success";
    await payment.save();

    // 7️⃣ Update booking with payment ID & status
    booking.payment = payment._id;
    booking.status = "confirmed";
    await booking.save();

    // 8️⃣ Populate for cleaner response
    await payment.populate({
      path: "booking",
      populate: [
        { path: "shop", select: "name location" },
        { path: "customer", select: "name email" },
      ],
    });

    res.status(201).json({
      message: "Payment created successfully",
      payment,
    });
  } catch (error) {
    console.error("Error creating payment:", error.message);
    res.status(500).json({
      message: "Error creating payment",
      error: error.message,
    });
  }
};

/**
 * @desc Handle M-Pesa callback (for real STK push)
 * @route POST /api/payments/callback
 * @access Public
 */
exports.mpesaCallback = async (req, res) => {
  try {
    const { Body } = req.body;
    console.log("📩 M-Pesa Callback received:", JSON.stringify(Body, null, 2));

    const stkCallback = Body?.stkCallback;
    if (!stkCallback) {
      return res.status(400).json({ message: "Invalid callback payload" });
    }

    const transactionRef = stkCallback?.CheckoutRequestID;
    const resultCode = stkCallback?.ResultCode;

    const payment = await Payment.findOne({ transactionRef });
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // If payment successful
    if (resultCode === 0) {
      payment.status = "success";
      await payment.save();

      // Update related booking
      const booking = await Booking.findById(payment.booking);
      if (booking) {
        booking.status = "confirmed";
        booking.payment = payment._id;
        await booking.save();
      }
    } else {
      payment.status = "failed";
      await payment.save();
    }

    res.status(200).json({ message: "Callback processed successfully" });
  } catch (error) {
    console.error("Callback Error:", error.message);
    res.status(500).json({ message: "Error processing callback", error: error.message });
  }
};

/**
 * @desc Get all payments
 * @route GET /api/payments
 * @access Private (Admin/Shop/Customer)
 */
exports.getPayments = async (req, res) => {
  try {
    let payments;

    if (req.user.role === "admin") {
      payments = await Payment.find()
        .populate({
          path: "booking",
          populate: [
            { path: "shop", select: "name location" },
            { path: "customer", select: "name email" },
          ],
        })
        .sort({ createdAt: -1 });
    } else if (req.user.role === "shop") {
      const userShops = await Shop.find({ owner: req.user.userId });
      const shopIds = userShops.map((s) => s._id);
      payments = await Payment.find()
        .populate({
          path: "booking",
          match: { shop: { $in: shopIds } },
          populate: [
            { path: "shop", select: "name location" },
            { path: "customer", select: "name email" },
          ],
        })
        .sort({ createdAt: -1 });
    } else {
      payments = await Payment.find()
        .populate({
          path: "booking",
          match: { customer: req.user.userId },
          populate: [
            { path: "shop", select: "name location" },
            { path: "customer", select: "name email" },
          ],
        })
        .sort({ createdAt: -1 });
    }

    res.status(200).json(payments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching payments", error: error.message });
  }
};

/**
 * @desc Get payment by ID
 * @route GET /api/payments/:id
 * @access Private
 */
exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate({
        path: "booking",
        populate: [
          { path: "shop", select: "name location" },
          { path: "customer", select: "name email" },
        ],
      });

    if (!payment) return res.status(404).json({ message: "Payment not found" });

    res.status(200).json(payment);
  } catch (error) {
    res.status(500).json({ message: "Error fetching payment", error: error.message });
  }
};

/**
 * @desc Update payment
 * @route PUT /api/payments/:id
 * @access Private (Admin only)
 */
exports.updatePayment = async (req, res) => {
  try {
    const updated = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: "Payment not found" });
    res.status(200).json({ message: "Payment updated successfully", updated });
  } catch (error) {
    res.status(500).json({ message: "Error updating payment", error: error.message });
  }
};

/**
 * @desc Delete payment
 * @route DELETE /api/payments/:id
 * @access Private (Admin only)
 */
exports.deletePayment = async (req, res) => {
  try {
    const deleted = await Payment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Payment not found" });
    res.status(200).json({ message: "Payment deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting payment", error: error.message });
  }
};
