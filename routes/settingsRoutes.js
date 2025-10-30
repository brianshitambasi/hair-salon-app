const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getSettings,
  updateProfileSettings,
  updatePreferences,
  resetSettings
} = require('../controller/settingsController');

// @route   GET /api/settings
// @desc    Get user settings
// @access  Private
router.get('/', auth, getSettings);

// @route   PUT /api/settings/profile
// @desc    Update profile settings (name, phone, business info)
// @access  Private
router.put('/profile', auth, updateProfileSettings);

// @route   PUT /api/settings/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', auth, updatePreferences);

// @route   POST /api/settings/reset
// @desc    Reset settings to default
// @access  Private
router.post('/reset', auth, resetSettings);

module.exports = router;