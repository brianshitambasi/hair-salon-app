const { Notification, User, Booking, Payment, Review, Shop } = require("../models/model");

// ================= NOTIFICATION CONTROLLER =================
const notificationController = {
  // Get all notifications for a user
  getUserNotifications: async (req, res) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, unreadOnly = false } = req.query;

      const query = { user: userId };
      if (unreadOnly === 'true') {
        query.isRead = false;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .populate('user', 'name email');

      const total = await Notification.countDocuments(query);

      res.json({
        success: true,
        notifications,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total,
        unreadCount: await Notification.countDocuments({ user: userId, isRead: false })
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to fetch notifications',
        error: error.message 
      });
    }
  },

  // Mark notification as read
  markAsRead: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOneAndUpdate(
        { _id: id, user: userId },
        { isRead: true },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({ 
          success: false,
          message: 'Notification not found' 
        });
      }

      res.json({
        success: true,
        notification
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to mark notification as read',
        error: error.message 
      });
    }
  },

  // Mark all notifications as read
  markAllAsRead: async (req, res) => {
    try {
      const userId = req.user.id;

      await Notification.updateMany(
        { user: userId, isRead: false },
        { isRead: true }
      );

      const unreadCount = await Notification.countDocuments({ 
        user: userId, 
        isRead: false 
      });

      res.json({ 
        success: true,
        message: 'All notifications marked as read',
        unreadCount 
      });
    } catch (error) {
      console.error('Mark all as read error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to mark all notifications as read',
        error: error.message 
      });
    }
  },

  // Delete a notification
  deleteNotification: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOneAndDelete({
        _id: id,
        user: userId
      });

      if (!notification) {
        return res.status(404).json({ 
          success: false,
          message: 'Notification not found' 
        });
      }

      res.json({ 
        success: true,
        message: 'Notification deleted successfully' 
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to delete notification',
        error: error.message 
      });
    }
  },

  // Clear all notifications
  clearAllNotifications: async (req, res) => {
    try {
      const userId = req.user.id;

      await Notification.deleteMany({ user: userId });

      res.json({ 
        success: true,
        message: 'All notifications cleared' 
      });
    } catch (error) {
      console.error('Clear all notifications error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to clear notifications',
        error: error.message 
      });
    }
  },

  // Get unread count
  getUnreadCount: async (req, res) => {
    try {
      const userId = req.user.id;

      const unreadCount = await Notification.countDocuments({
        user: userId,
        isRead: false
      });

      res.json({ 
        success: true,
        unreadCount 
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to get unread count',
        error: error.message 
      });
    }
  }
};

// ================= NOTIFICATION SERVICE FUNCTIONS =================
const notificationService = {
  // Create a notification
  createNotification: async (userId, title, message, type, relatedId = null, actionUrl = null, priority = 'medium') => {
    try {
      const notification = new Notification({
        user: userId,
        title,
        message,
        type,
        relatedId,
        actionUrl,
        priority
      });

      await notification.save();
      
      // Emit real-time notification if Socket.IO is available
      if (global.io) {
        global.io.to(`user_${userId}`).emit('new_notification', {
          notification,
          unreadCount: await Notification.countDocuments({ user: userId, isRead: false })
        });
      }
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  },

  // Notify user about booking status
  notifyBookingStatus: async (booking, status, customerId, shopOwnerId = null) => {
    const statusMessages = {
      pending: 'Your booking is pending confirmation',
      confirmed: 'Your booking has been confirmed! 🎉',
      completed: 'Your booking has been completed ✅',
      cancelled: 'Your booking has been cancelled ❌',
      no_show: 'You were marked as no-show for your booking'
    };

    // Notify customer
    await notificationService.createNotification(
      customerId,
      'Booking Update',
      statusMessages[status] || `Your booking status changed to ${status}`,
      'booking',
      booking._id,
      `/bookings/${booking._id}`,
      status === 'cancelled' ? 'high' : 'medium'
    );

    // Notify shop owner if provided
    if (shopOwnerId && ['confirmed', 'cancelled', 'no_show', 'pending'].includes(status)) {
      const shopMessages = {
        pending: 'You have a new booking request pending approval',
        confirmed: 'You have confirmed a booking',
        cancelled: 'A booking has been cancelled',
        no_show: 'A customer was marked as no-show'
      };

      await notificationService.createNotification(
        shopOwnerId,
        'Booking Alert',
        shopMessages[status] || `Booking status changed to ${status}`,
        'booking',
        booking._id,
        `/shop/bookings/${booking._id}`,
        status === 'cancelled' ? 'high' : 'medium'
      );
    }
  },

  // Notify about payment status
  notifyPaymentStatus: async (payment, customerId, shopOwnerId = null) => {
    const messages = {
      pending: 'Payment is being processed',
      success: 'Payment completed successfully! ✅',
      failed: 'Payment failed. Please try again.',
      refunded: 'Payment has been refunded'
    };

    // Notify customer
    await notificationService.createNotification(
      customerId,
      'Payment Update',
      messages[payment.status] || `Payment status: ${payment.status}`,
      'payment',
      payment._id,
      `/payments/${payment._id}`,
      payment.status === 'failed' ? 'high' : 'medium'
    );

    // Notify shop owner for successful payments
    if (shopOwnerId && payment.status === 'success') {
      await notificationService.createNotification(
        shopOwnerId,
        'Payment Received 💰',
        `Payment of KSh ${payment.shopEarning} received for booking`,
        'payment',
        payment._id,
        `/shop/payments/${payment._id}`,
        'medium'
      );
    }
  },

  // Notify about new review
  notifyNewReview: async (review, shopOwnerId) => {
    await notificationService.createNotification(
      shopOwnerId,
      'New Review Received ⭐',
      `You have received a new ${review.rating}-star review`,
      'review',
      review._id,
      `/shop/reviews`,
      'low'
    );
  },

  // Notify about announcement
  notifyAnnouncement: async (announcement, userId) => {
    await notificationService.createNotification(
      userId,
      announcement.title,
      announcement.message,
      'announcement',
      announcement._id,
      `/announcements/${announcement._id}`,
      announcement.priority === 'urgent' ? 'high' : 'medium'
    );
  },

  // Notify shop owner about new booking request
  notifyNewBookingRequest: async (booking, shopOwnerId) => {
    await notificationService.createNotification(
      shopOwnerId,
      'New Booking Request 📅',
      `You have a new booking request from a customer`,
      'booking',
      booking._id,
      `/shop/bookings/${booking._id}`,
      'high'
    );
  },

  // Notify customer about booking reminder
  notifyBookingReminder: async (booking, customerId) => {
    await notificationService.createNotification(
      customerId,
      'Booking Reminder ⏰',
      `Don't forget your booking tomorrow at ${new Date(booking.dateTime).toLocaleTimeString()}`,
      'booking',
      booking._id,
      `/bookings/${booking._id}`,
      'medium'
    );
  }
};

module.exports = { notificationController, notificationService };