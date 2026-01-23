const NotificationService = require("../services/notificationService");

/**
 * GET USER NOTIFICATIONS
 */
exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20, unreadOnly = false } = req.query;

    const result = await NotificationService.getUserNotifications(
      userId,
      Number(page),
      Number(limit),
      unreadOnly === "true"
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * MARK ONE AS READ
 */
exports.markAsRead = async (req, res) => {
  try {
    const result = await NotificationService.markAsRead(
      req.params.id,
      req.user.userId
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * MARK ALL AS READ
 */
exports.markAllAsRead = async (req, res) => {
  try {
    res.json(await NotificationService.markAllAsRead(req.user.userId));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE NOTIFICATION
 */
exports.deleteNotification = async (req, res) => {
  try {
    res.json(
      await NotificationService.deleteNotification(
        req.params.id,
        req.user.userId
      )
    );
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * CLEAR ALL
 */
exports.clearAllNotifications = async (req, res) => {
  try {
    res.json(await NotificationService.clearAllNotifications(req.user.userId));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * UNREAD COUNT
 */
exports.getUnreadCount = async (req, res) => {
  try {
    res.json(await NotificationService.getUnreadCount(req.user.userId));
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
