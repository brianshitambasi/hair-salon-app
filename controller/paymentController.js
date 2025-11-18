const { Payment, Booking } = require("../models/model");
const { initiateSTKPush } = require("../helpers/mpesa");

const COMMISSION_RATE = 0.05;

/**
 * 1️⃣ CREATE PAYMENT + TRIGGER STK PUSH
 */
exports.createPayment = async (req, res) => {
  try {
    const { booking: bookingId, phone } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const amount = booking.totalPrice;
    const commission = amount * COMMISSION_RATE;
    const shopEarning = amount - commission;

    // Create pending payment
    const payment = await Payment.create({
      booking: bookingId,
      amount,
      commission,
      shopEarning,
      method: "mpesa",
      status: "pending",
    });

    // Send STK Push
    const stkPush = await initiateSTKPush(
      phone,
      amount,
      payment._id.toString() // used as AccountReference
    );

    // Save checkoutRequestId so callback matches it
    payment.checkoutRequestId = stkPush.CheckoutRequestID;
    await payment.save();

    res.status(200).json({
      message: "STK Push initiated",
      payment,
      stkPush,
    });
  } catch (error) {
    console.error("STK Error:", error.response?.data || error.message);
    res.status(500).json({
      message: "Failed to initiate MPesa STK Push",
      error: error.message,
    });
  }
};

/**
 * 2️⃣ CALLBACK FROM SAFARICOM
 */
exports.mpesaCallback = async (req, res) => {
  try {
    const callback = req.body.Body.stkCallback;

    const checkoutRequestID = callback.CheckoutRequestID;
    const resultCode = callback.ResultCode;
    const resultDesc = callback.ResultDesc;

    const payment = await Payment.findOne({ checkoutRequestId: checkoutRequestID });

    if (!payment) {
      console.log("Payment record not found for callback.");
      return res.status(200).json({ message: "Callback received" });
    }

    if (resultCode === 0) {
      // SUCCESSFUL PAYMENT
      payment.status = "success";
      await payment.save();

      // Update booking
      const booking = await Booking.findById(payment.booking);
      booking.status = "confirmed";
      booking.payment = payment._id;
      await booking.save();
    } else {
      // FAILED PAYMENT
      payment.status = "failed";
      payment.failureReason = resultDesc;
      await payment.save();
    }

    res.status(200).json({ message: "Callback processed" });

  } catch (error) {
    console.error("Callback error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * 3️⃣ GET PAYMENTS BASED ON ROLE
 */
exports.getPayments = async (req, res) => {
  try {
    let payments;

    if (req.user.role === "admin") {
      payments = await Payment.find().populate("booking");

    } else if (req.user.role === "shop") {
      payments = await Payment.find()
        .populate({
          path: "booking",
          populate: { path: "shop", match: { owner: req.user.userId } },
        })
        .lean();

      payments = payments.filter(p => p.booking?.shop);

    } else {
      payments = await Payment.find()
        .populate({
          path: "booking",
          match: { customer: req.user.userId },
        })
        .lean();
    }

    res.status(200).json(payments);

  } catch (error) {
    res.status(500).json({
      message: "Error fetching payments",
      error: error.message,
    });
  }
};
