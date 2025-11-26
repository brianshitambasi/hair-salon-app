const express = require('express');
const { auth } = require('../middleware/auth');
const controller = require('../controller/notificationController');

const router = express.Router();

router.get('/', auth, controller.getUserNotifications);
router.get('/unread/count', auth, controller.getUnreadCount);
router.put('/:id/read', auth, controller.markAsRead);
router.put('/read-all', auth, controller.markAllAsRead);
router.delete('/:id', auth, controller.deleteNotification);
router.delete('/', auth, controller.clearAllNotifications);

module.exports = router;
