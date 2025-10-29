const mongoose = require("mongoose");

// ================= USER SCHEMA =================
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    phone: { type: String },
    role: {
      type: String,
      enum: ["customer", "shop", "admin"],
      default: "customer",
    },
    profileImage: { type: String },
  },
  { timestamps: true }
);

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
    image: { type: String }, // ✅ uploaded photo path
    rating: { type: Number, default: 0 },
    reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: "Review" }],
  },
  { timestamps: true }
);




// ================= HAIRSTYLE SCHEMA =================
const hairstyleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    gender: { type: String, enum: ["male", "female", "unisex"], required: true },
    imageUrl: { type: String, required: true },
    tags: [{ type: String }],
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop" },
  },
  { timestamps: true }
);

// ================= BOOKING SCHEMA =================
const bookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    service: {
      serviceName: { type: String, required: true },
      price: { type: Number, required: true },
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    dateTime: { type: Date, required: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
  },
  { timestamps: true }
);

// ================= PAYMENT SCHEMA =================
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
  const commissionRate = 0.05;
  this.commission = this.amount * commissionRate;
  this.shopEarning = this.amount - this.commission;
  next();
});

paymentSchema.pre("validate", function (next) {
  if (!this.transactionRef || this.transactionRef === "AUTO_GENERATE") {
    this.transactionRef = "TXN-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
  }
  next();
});


// ================= REVIEW SCHEMA =================
const reviewSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String },
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

// Auto-calc total before saving
cartSchema.pre("save", function (next) {
  this.total = this.items.reduce((sum, item) => sum + item.price, 0);
  next();
});

// ================= MODELS =================
const User = mongoose.model("User", userSchema);
const Shop = mongoose.model("Shop", shopSchema);
const Hairstyle = mongoose.model("Hairstyle", hairstyleSchema);
const Booking = mongoose.model("Booking", bookingSchema);
const Payment = mongoose.model("Payment", paymentSchema);
const Review = mongoose.model("Review", reviewSchema);
const Cart = mongoose.model("Cart", cartSchema);

// ================= EXPORT =================
module.exports = {
  User,
  Shop,
  Hairstyle,
  Booking,
  Payment,
  Review,
  Cart,
};
