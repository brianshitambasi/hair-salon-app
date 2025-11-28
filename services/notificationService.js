const { Notification } = require('../models/model');

const notificationService = {
  createNotification: async (userId, title, message, type, relatedId = null, actionUrl = null, priority = "medium") => {
    try {
      const notification = new Notification({
        user: userId,
        title,
        message,
        type,
        relatedId,
        actionUrl,
        priority,
        isRead: false
      });
      return await notification.save();
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  },

  notifyNewBookingRequest: async (booking, shopOwnerId) => {
    try {
      let customerName = 'Customer';
      if (booking.customer && booking.customer.name) customerName = booking.customer.name;

      const title = "New Booking Request";
      const message = `You have a new booking request from ${customerName} for ${booking.services.map(s => s.serviceName).join(", ")}.`;
      
      return await notificationService.createNotification(shopOwnerId, title, message, "booking");
    } catch (error) {
      console.error("Error in notifyNewBookingRequest:", error);
      throw error;
    }
  },

  notifyBookingStatus: async (booking, status, customerId) => {
    try {
      const title = `Booking ${status.charAt(0).toUpperCase() + status.slice(1)}`;
      const message = `Your booking for ${booking.services.map(s => s.serviceName).join(", ")} has been ${status}.`;
      
      return await notificationService.createNotification(customerId, title, message, "booking");
    } catch (error) {
      console.error("Error in notifyBookingStatus:", error);
      throw error;
    }
  },

  notifyBookingReminder: async (booking, customerId) => {
    try {
      const title = "Booking Reminder";
      const message = `Reminder: You have a booking tomorrow for ${booking.services.map(s => s.serviceName).join(", ")} at ${booking.dateTime.toLocaleTimeString()}.`;
      
      return await notificationService.createNotification(customerId, title, message, "booking");
    } catch (error) {
      console.error("Error in notifyBookingReminder:", error);
      throw error;
    }
  }
};

module.exports = notificationService;
