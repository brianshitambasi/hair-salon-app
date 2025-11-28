const { Notification } = require('../models/model'); // ✅ correct import

const notificationController = {
  getUserNotifications: async (req, res) => {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, unreadOnly = false } = req.query;

      const query = { user: userId };
      if (unreadOnly === 'true') query.isRead = false;

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
      res.status(500).json({ success: false, message: 'Failed to fetch notifications', error: error.message });
    }
  },

  markAsRead: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOneAndUpdate(
        { _id: id, user: userId },
        { isRead: true },
        { new: true }
      );

      if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });

      res.json({ success: true, notification });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to mark notification as read', error: error.message });
    }
  },

  markAllAsRead: async (req, res) => {
    try {
      const userId = req.user.id;
      await Notification.updateMany({ user: userId, isRead: false }, { isRead: true });

      const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });
      res.json({ success: true, message: 'All notifications marked as read', unreadCount });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to mark all notifications as read', error: error.message });
    }
  },

  deleteNotification: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOneAndDelete({ _id: id, user: userId });
      if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });

      res.json({ success: true, message: 'Notification deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to delete notification', error: error.message });
    }
  },

  clearAllNotifications: async (req, res) => {
    try {
      const userId = req.user.id;
      await Notification.deleteMany({ user: userId });
      res.json({ success: true, message: 'All notifications cleared' });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to clear notifications', error: error.message });
    }
  },

  getUnreadCount: async (req, res) => {
    try {
      const userId = req.user.id;
      const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });
      res.json({ success: true, unreadCount });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to get unread count', error: error.message });
    }
  }
};

module.exports = notificationController; // ✅ export correctly
