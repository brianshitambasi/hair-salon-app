const { Notification } = require('../models/model');

class NotificationService {
  static async createNotification(
    userId,
    title,
    message,
    type = 'system',
    relatedId = null,
    link = null,
    priority = 'medium'
  ) {
    if (!userId || !title || !message) {
      throw new Error('Missing required notification fields');
    }

    const notification = new Notification({
      user: userId,
      title,
      message,
      type,
      relatedId,
      link,
      priority,
      isRead: false
    });

    await notification.save();
    return notification;
  }

  static async getUserNotifications(userId, page = 1, limit = 20, unreadOnly = false) {
    const query = { user: userId };
    if (unreadOnly) query.isRead = false;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });

    return {
      success: true,
      notifications,
      pagination: {
        total,
        unreadCount,
        currentPage: page,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  static async markAsRead(id, userId) {
    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) throw new Error('Notification not found');
    return { success: true, notification };
  }

  static async markAllAsRead(userId) {
    await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    return { success: true };
  }

  static async deleteNotification(id, userId) {
    await Notification.findOneAndDelete({ _id: id, user: userId });
    return { success: true };
  }

  static async clearAllNotifications(userId) {
    await Notification.deleteMany({ user: userId });
    return { success: true };
  }

  static async getUnreadCount(userId) {
    const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });
    return { success: true, unreadCount };
  }
}

module.exports = NotificationService;
