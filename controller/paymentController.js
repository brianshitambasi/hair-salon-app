const { Payment, Booking } = require("../models/model");
const { initiateSTKPush } = require("../helpers/mpesa");

const COMMISSION_RATE = 0.05;

exports.createPayment = async (req, res) => {
  try {
    console.log('🔔 Create Payment Request:', req.body);
    
    const { booking: bookingId, phone } = req.body;

    if (!bookingId || !phone) {
      return res.status(400).json({ 
        message: "Missing required fields: booking and phone" 
      });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    console.log('📦 Booking found - Amount:', booking.totalPrice);

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

    console.log('💳 Payment record created:', payment._id);

    // Send STK Push
    console.log('📱 Initiating STK Push to:', phone, 'Amount:', amount);
    
    const stkPush = await initiateSTKPush(
      phone,
      amount,
      payment._id.toString()
    );

    console.log('✅ STK Push Response:', stkPush);

    if (!stkPush.CheckoutRequestID) {
      throw new Error('No CheckoutRequestID in STK response');
    }

    // Save checkoutRequestId so callback matches it
    payment.checkoutRequestId = stkPush.CheckoutRequestID;
    await payment.save();

    console.log('🎉 Payment initiation completed successfully');
    
    res.status(200).json({
      message: "STK Push initiated successfully",
      payment: {
        _id: payment._id,
        amount: payment.amount,
        status: payment.status
      },
      stkPush: {
        CheckoutRequestID: stkPush.CheckoutRequestID,
        ResponseCode: stkPush.ResponseCode,
        ResponseDescription: stkPush.ResponseDescription
      }
    });

  } catch (error) {
    console.error('❌ STK Error:', error.response?.data || error.message);
    
    res.status(500).json({
      message: "Failed to initiate MPesa STK Push",
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
};

exports.mpesaCallback = async (req, res) => {
  try {
    console.log('📞 MPesa Callback received:', req.body);
    
    const callback = req.body.Body.stkCallback;

    const checkoutRequestID = callback.CheckoutRequestID;
    const resultCode = callback.ResultCode;
    const resultDesc = callback.ResultDesc;

    console.log('Callback details:', {
      checkoutRequestID,
      resultCode,
      resultDesc
    });

    const payment = await Payment.findOne({ checkoutRequestId: checkoutRequestID });

    if (!payment) {
      console.log("❌ Payment record not found for callback.");
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
      
      console.log('✅ Payment successful for booking:', payment.booking);
    } else {
      // FAILED PAYMENT
      payment.status = "failed";
      payment.failureReason = resultDesc;
      await payment.save();
      
      console.log('❌ Payment failed for booking:', payment.booking, 'Reason:', resultDesc);
    }

    res.status(200).json({ message: "Callback processed successfully" });

  } catch (error) {
    console.error("❌ Callback error:", error.message);
    res.status(500).json({ error: error.message });
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
    res.status(500).json({
      message: "Error fetching payments",
      error: error.message,
    });
  }
};