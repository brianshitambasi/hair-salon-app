// models/model.js - COMPLETE SCHEMA
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
  profileImage: { type: String },
  lastLogin: { type: Date },
  loginCount: { type: Number, default: 0 }
}, { timestamps: true });

// ================= SHOP SCHEMA =================
const shopSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    description: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String },
    businessHours: {
      opening: { type: String },
      closing: { type: String },
      workingDays: [{ type: String }] // ["monday", "tuesday", ...]
    },
    services: [
      {
        serviceName: { type: String, required: true },
        price: { type: Number, required: true },
        duration: { type: Number }, // in minutes
        description: { type: String },
        category: { type: String },
        image: { type: String }
      },
    ],
    images: [{ 
      public_id: { type: String },
      url: { type: String }
    }],
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    featured: { type: Boolean, default: false }
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
        duration: { type: Number }
      },
    ],
    total: { type: Number, default: 0 },
    itemCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

cartSchema.pre("save", function (next) {
  this.total = this.items.reduce((sum, i) => sum + i.price, 0);
  this.itemCount = this.items.length;
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
        duration: { type: Number, required: true }
      }
    ],

    // FIXED: Make default values so validation never fails
    totalPrice: { type: Number, default: 0 },
    estimatedDuration: { type: Number, default: 0 },

    dateTime: { type: Date, required: true },
    endTime: { type: Date },

    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "no_show"],
      default: "pending"
    },

    payment: { type: mongoose.Schema.Types.ObjectId, ref: "Payment" },
    approvedByShop: { type: Boolean, default: false },
    cancelledByCustomer: { type: Boolean, default: false },
    cancellationReason: { type: String },
    specialRequests: { type: String }
  },
  { timestamps: true }
);

// AUTO-CALCULATE PRICE + DURATION + END TIME
bookingSchema.pre("save", function (next) {
  this.totalPrice = this.services.reduce((sum, s) => sum + (s.price || 0), 0);
  this.estimatedDuration = this.services.reduce((sum, s) => sum + (s.duration || 0), 0);

  if (this.dateTime && this.estimatedDuration) {
    this.endTime = new Date(this.dateTime.getTime() + this.estimatedDuration * 60000);
  }

  next();
});

// ================= PAYMENT SCHEMA =================
const paymentSchema = new mongoose.Schema(
  {
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
    amount: { type: Number, required: true },
    commission: { type: Number, required: true },
    shopEarning: { type: Number, required: true },
    method: { type: String, enum: ["mpesa", "card", "cash"], required: true },
    status: { type: String, enum: ["pending", "success", "failed", "refunded"], default: "pending" },
    transactionRef: { type: String, required: true },
    checkoutRequestId: { type: String },
    failureReason: { type: String },
    refundReason: { type: String },
    processedAt: { type: Date }
  },
  { timestamps: true }
);

paymentSchema.pre("save", function (next) {
  const rate = 0.05; // 5% commission
  this.commission = this.amount * rate;
  this.shopEarning = this.amount - this.commission;
  
  if (!this.transactionRef) {
    this.transactionRef = "TXN-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
  }
  
  if (this.status === "success" && !this.processedAt) {
    this.processedAt = new Date();
  }
  
  next();
});

// ================= REVIEW SCHEMA =================
const reviewSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be an integer between 1 and 5'
    }
  },
  comment: { type: String, required: true },
  images: [{ type: String }],
  status: { 
    type: String, 
    enum: ["pending", "approved", "rejected", "flagged"], 
    default: "pending" 
  },
  adminNotes: { type: String },
  helpful: { type: Number, default: 0 },
  reported: { type: Boolean, default: false },
  reportReason: { type: String }
}, { timestamps: true });

// Update shop rating when review is saved
reviewSchema.post('save', async function() {
  if (this.status === 'approved') {
    await updateShopRating(this.shop);
  }
});

reviewSchema.post('findOneAndUpdate', async function(doc) {
  if (doc && doc.status === 'approved') {
    await updateShopRating(doc.shop);
  }
});

async function updateShopRating(shopId) {
  const reviews = await Review.find({ 
    shop: shopId, 
    status: 'approved' 
  });
  
  if (reviews.length > 0) {
    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    await Shop.findByIdAndUpdate(shopId, { 
      rating: Math.round(averageRating * 10) / 10,
      reviewCount: reviews.length
    });
  }
}

// ================= ANNOUNCEMENT SCHEMA =================
const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ["info", "warning", "success", "maintenance", "promotion"],
    default: "info"
  },
  target: { 
    type: String, 
    enum: ["all", "shop_owners", "customers", "specific_shops", "specific_users"],
    default: "all"
  },
  targetShops: [{ type: mongoose.Schema.Types.ObjectId, ref: "Shop" }],
  targetUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  sentBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["draft", "scheduled", "sent", "cancelled"], default: "draft" },
  scheduledAt: { type: Date },
  expiresAt: { type: Date },
  priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
  isSticky: { type: Boolean, default: false } // Stays at top
}, { timestamps: true });

// ================= ADMIN ACTIVITY LOG SCHEMA =================
const adminActivitySchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true },
  resource: { type: String, required: true }, // user, shop, booking, review, etc.
  resourceId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: mongoose.Schema.Types.Mixed }, // Flexible object for different actions
  ipAddress: { type: String },
  userAgent: { type: String },
  location: { type: String }
}, { timestamps: true });

// ================= SYSTEM REPORT SCHEMA =================
const systemReportSchema = new mongoose.Schema({
  period: { 
    type: String, 
    required: true,
    enum: ["daily", "weekly", "monthly", "yearly"] 
  },
  reportDate: { type: Date, required: true },
  
  // User Statistics
  totalUsers: { type: Number, default: 0 },
  newUsers: { type: Number, default: 0 },
  activeUsers: { type: Number, default: 0 },
  
  // Shop Statistics
  totalShops: { type: Number, default: 0 },
  newShops: { type: Number, default: 0 },
  verifiedShops: { type: Number, default: 0 },
  
  // Booking Statistics
  totalBookings: { type: Number, default: 0 },
  completedBookings: { type: Number, default: 0 },
  cancelledBookings: { type: Number, default: 0 },
  pendingBookings: { type: Number, default: 0 },
  
  // Financial Statistics
  totalRevenue: { type: Number, default: 0 },
  adminCommission: { type: Number, default: 0 },
  averageBookingValue: { type: Number, default: 0 },
  
  // Review Statistics
  totalReviews: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  pendingReviews: { type: Number, default: 0 },
  
  // Platform Metrics
  bookingConversionRate: { type: Number, default: 0 },
  userRetentionRate: { type: Number, default: 0 },
  popularServices: [{ 
    serviceName: String,
    bookingCount: Number
  }],
  
  // Timestamps
  generatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// ================= NOTIFICATION SCHEMA =================
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ["booking", "payment", "review", "announcement", "system"],
    required: true 
  },
  relatedId: { type: mongoose.Schema.Types.ObjectId }, // bookingId, paymentId, etc.
  isRead: { type: Boolean, default: false },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  actionUrl: { type: String } // URL to navigate when clicked
}, { timestamps: true });

// ================= SUPPORT TICKET SCHEMA =================
const supportTicketSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: ["technical", "billing", "booking", "general", "complaint"],
    required: true 
  },
  priority: { 
    type: String, 
    enum: ["low", "medium", "high", "urgent"],
    default: "medium" 
  },
  status: { 
    type: String, 
    enum: ["open", "in_progress", "resolved", "closed"],
    default: "open" 
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Admin user
  messages: [{
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    attachments: [{ type: String }],
    isInternal: { type: Boolean, default: false } // Internal admin notes
  }],
  resolvedAt: { type: Date },
  resolutionNotes: { type: String }
}, { timestamps: true });

// ================= COUPON/PROMOTION SCHEMA =================
const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  description: { type: String, required: true },
  discountType: { 
    type: String, 
    enum: ["percentage", "fixed_amount"],
    required: true 
  },
  discountValue: { type: Number, required: true },
  minimumAmount: { type: Number, default: 0 },
  maximumDiscount: { type: Number },
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
  usageLimit: { type: Number }, // Total usage limit
  usedCount: { type: Number, default: 0 },
  userUsageLimit: { type: Number, default: 1 }, // Per user limit
  targetShops: [{ type: mongoose.Schema.Types.ObjectId, ref: "Shop" }],
  targetServices: [{ type: String }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

// ================= FAVORITE SHOPS SCHEMA =================
const favoriteSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  shop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true }
}, { timestamps: true });

favoriteSchema.index({ customer: 1, shop: 1 }, { unique: true });

// ================= CREATE ALL MODELS =================
const User = mongoose.model("User", userSchema);
const Shop = mongoose.model("Shop", shopSchema);
const Cart = mongoose.model("Cart", cartSchema);
const Booking = mongoose.model("Booking", bookingSchema);
const Payment = mongoose.model("Payment", paymentSchema);
const Review = mongoose.model("Review", reviewSchema);
const Announcement = mongoose.model("Announcement", announcementSchema);
const AdminActivity = mongoose.model("AdminActivity", adminActivitySchema);
const SystemReport = mongoose.model("SystemReport", systemReportSchema);
const Notification = mongoose.model("Notification", notificationSchema);
const SupportTicket = mongoose.model("SupportTicket", supportTicketSchema);
const Coupon = mongoose.model("Coupon", couponSchema);
const Favorite = mongoose.model("Favorite", favoriteSchema);

// ================= EXPORT ALL MODELS =================
module.exports = { 
  User, 
  Shop, 
  Cart, 
  Booking, 
  Payment, 
  Review, 
  Announcement, 
  AdminActivity, 
  SystemReport, 
  Notification,
  SupportTicket,
  Coupon,
  Favorite
};