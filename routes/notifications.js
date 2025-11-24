const express = require('express');
const router = express.Router();
const { notificationController } = require('../controllers/notificationController');
const auth = require('../middleware/auth'); // Make sure you have this middleware

// All routes require authentication
router.use(auth);

// GET /notifications - Get user notifications
router.get('/', notificationController.getUserNotifications);

// GET /notifications/unread/count - Get unread count
router.get('/unread/count', notificationController.getUnreadCount);

// PUT /notifications/:id/read - Mark as read
router.put('/:id/read', notificationController.markAsRead);

// PUT /notifications/read-all - Mark all as read
router.put('/read-all', notificationController.markAllAsRead);

// DELETE /notifications/:id - Delete notification
router.delete('/:id', notificationController.deleteNotification);

// DELETE /notifications - Clear all notifications
router.delete('/', notificationController.clearAllNotifications);

module.exports = router;