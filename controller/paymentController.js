const { Payment, Booking } = require("../models/model");

const COMMISSION_RATE = 0.05;

exports.createPayment = async (req, res) => {
  try {
    const { booking: bookingId, method } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const amount = booking.totalPrice;
    const commission = amount * COMMISSION_RATE;
    const shopEarning = amount - commission;

    const payment = await Payment.create({
      booking: bookingId,
      amount,
      commission,
      shopEarning,
      method,
      status: "success",
    });

    booking.status = "confirmed";
    booking.payment = payment._id;
    await booking.save();

    res.status(201).json({ message: "Payment successful", payment });
  } catch (error) {
    res.status(500).json({ message: "Error creating payment", error: error.message });
  }
};

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
    res.status(500).json({ message: "Error fetching payments", error: error.message });
  }
};
