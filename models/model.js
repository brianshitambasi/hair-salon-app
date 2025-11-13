const mongoose = require("mongoose");

// ================= USER SCHEMA =================
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  role: {
    type: String,
    enum: ["shop", "customer", "admin"],
    required: true,
  },
  active: { type: Boolean, default: true },
}, { timestamps: true });

// ================= SHOP SCHEMA =================
const shopSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String },
    services: [
      {
        serviceName: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],
    image: { type: String },
    rating: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// ================= CART SCHEMA =================
const cartSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: [
      {
        shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
        serviceName: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],
    total: { type: Number, default: 0 },
  },
  { timestamps: true }
);
cartSchema.pre("save", function (next) {
  this.total = this.items.reduce((sum, i) => sum + i.price, 0);
  next();
});

// ================= BOOKING SCHEMA =================
const bookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    services: [
      {
        serviceName: { type: String, required: true },
        price: { type: Number, required: true },
      },
    ],
    totalPrice: { type: Number, required: true },
    dateTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    approvedByShop: { type: Boolean, default: false },
    cancelledByCustomer: { type: Boolean, default: false },
  },
  { timestamps: true }
);
bookingSchema.pre("save", function (next) {
  this.totalPrice = this.services.reduce((sum, s) => sum + s.price, 0);
  next();
});

// ================= PAYMENT SCHEMA =================
const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    amount: { type: Number, required: true },
    commission: { type: Number, required: true },
    shopEarning: { type: Number, required: true },
    method: { type: String, enum: ["mpesa", "card"], required: true },
    status: { type: String, enum: ["pending", "success", "failed"], default: "pending" },
    transactionRef: { type: String, required: true },
  },
  { timestamps: true }
);
paymentSchema.pre("save", function (next) {
  const rate = 0.05;
  this.commission = this.amount * rate;
  this.shopEarning = this.amount - this.commission;
  next();
});
paymentSchema.pre("validate", function (next) {
  if (!this.transactionRef) {
    this.transactionRef = "TXN-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
  }
  next();
});

const User = mongoose.model("User", userSchema);
const Shop = mongoose.model("Shop", shopSchema);
const Cart = mongoose.model("Cart", cartSchema);
const Booking = mongoose.model("Booking", bookingSchema);
const Payment = mongoose.model("Payment", paymentSchema);

module.exports = { User, Shop, Cart, Booking, Payment };
