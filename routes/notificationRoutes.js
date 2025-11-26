const express = require('express');
const { auth } = require('../middleware/auth');
const { notificationController } = require('../controller/notificationController');

const router = express.Router();

router.get('/', auth, notificationController.getUserNotifications);
router.get('/unread/count', auth, notificationController.getUnreadCount);
router.put('/:id/read', auth, notificationController.markAsRead);
router.put('/read-all', auth, notificationController.markAllAsRead);
router.delete('/:id', auth, notificationController.deleteNotification);
router.delete('/', auth, notificationController.clearAllNotifications);

module.exports = router;
