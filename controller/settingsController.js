const Settings = require('../models/model');
const User = require('../models/model');
const { notificationService } = require('./notificationController'); // Add this import

// ========================
// Get User Settings
// ========================
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne({ userId: req.user.userId });
    
    // If no settings exist, create default ones
    if (!settings) {
      settings = new Settings({
        userId: req.user.userId,
        businessName: '',
        address: '',
        bio: '',
        preferences: {
          emailNotifications: true,
          smsNotifications: false,
          newsletter: true,
          language: 'en',
          theme: 'light'
        }
      });
      await settings.save();
      
      // ================= NOTIFICATION: Default Settings Created =================
      await notificationService.createNotification(
        req.user.userId,
        "Settings Initialized ⚙️",
        "Your default settings have been set up. You can customize them anytime.",
        "system",
        null,
        "/settings",
        "low"
      );
    }

    // Get user data for phone number
    const user = await User.findById(req.user.userId).select('phone name email');

    res.json({
      success: true,
      settings: {
        ...settings.toObject(),
        phone: user.phone, // Include phone from User model
        name: user.name,   // Include name from User model
        email: user.email  // Include email from User model
      }
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching settings',
      error: error.message
    });
  }
};

// ========================
// Update Profile Settings
// ========================
exports.updateProfileSettings = async (req, res) => {
  try {
    const { name, phone, businessName, address, bio } = req.body;

    // Track what was updated for notification
    const updatedFields = [];
    const userBeforeUpdate = await User.findById(req.user.userId).select('name phone');
    const settingsBeforeUpdate = await Settings.findOne({ userId: req.user.userId });

    // Update User model (name and phone)
    if (name || phone !== undefined) {
      if (name && name !== userBeforeUpdate.name) updatedFields.push("name");
      if (phone !== undefined && phone !== userBeforeUpdate.phone) updatedFields.push("phone number");
      
      await User.findByIdAndUpdate(
        req.user.userId,
        { 
          ...(name && { name }),
          ...(phone !== undefined && { phone })
        },
        { new: true }
      );
    }

    // Update Settings model (business info)
    const updateFields = {};
    if (businessName !== undefined) {
      updateFields.businessName = businessName;
      if (businessName !== settingsBeforeUpdate?.businessName) updatedFields.push("business name");
    }
    if (address !== undefined) {
      updateFields.address = address;
      if (address !== settingsBeforeUpdate?.address) updatedFields.push("address");
    }
    if (bio !== undefined) {
      updateFields.bio = bio;
      if (bio !== settingsBeforeUpdate?.bio) updatedFields.push("bio");
    }

    const settings = await Settings.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: updateFields },
      { new: true, upsert: true, runValidators: true }
    );

    // Get updated user data
    const user = await User.findById(req.user.userId).select('phone name email');

    // ================= NOTIFICATION: Profile Settings Updated =================
    if (updatedFields.length > 0) {
      await notificationService.createNotification(
        req.user.userId,
        "Profile Settings Updated ✅",
        `Your ${updatedFields.join(", ")} has been updated successfully.`,
        "system",
        null,
        "/settings",
        "medium"
      );
    }

    // ================= NOTIFICATION: Security Alert for Phone Change =================
    if (phone !== undefined && phone !== userBeforeUpdate.phone) {
      await notificationService.createNotification(
        req.user.userId,
        "Phone Number Changed 📱",
        `Your phone number has been updated from ${userBeforeUpdate.phone} to ${phone}.`,
        "system",
        null,
        "/security",
        "high"
      );
    }

    res.json({
      success: true,
      message: 'Profile settings updated successfully',
      data: {
        ...settings.toObject(),
        phone: user.phone,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Update profile settings error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error updating profile settings',
      error: error.message
    });
  }
};

// ========================
// Update Preferences
// ========================
exports.updatePreferences = async (req, res) => {
  try {
    const { emailNotifications, smsNotifications, newsletter, language, theme } = req.body;

    // Get current preferences for comparison
    const currentSettings = await Settings.findOne({ userId: req.user.userId });
    const currentPrefs = currentSettings?.preferences || {};

    const updateFields = {};
    const changedPreferences = [];

    if (emailNotifications !== undefined) {
      updateFields['preferences.emailNotifications'] = emailNotifications;
      if (emailNotifications !== currentPrefs.emailNotifications) {
        changedPreferences.push(`Email notifications: ${emailNotifications ? 'ON' : 'OFF'}`);
      }
    }
    if (smsNotifications !== undefined) {
      updateFields['preferences.smsNotifications'] = smsNotifications;
      if (smsNotifications !== currentPrefs.smsNotifications) {
        changedPreferences.push(`SMS notifications: ${smsNotifications ? 'ON' : 'OFF'}`);
      }
    }
    if (newsletter !== undefined) {
      updateFields['preferences.newsletter'] = newsletter;
      if (newsletter !== currentPrefs.newsletter) {
        changedPreferences.push(`Newsletter: ${newsletter ? 'SUBSCRIBED' : 'UNSUBSCRIBED'}`);
      }
    }
    if (language !== undefined) {
      updateFields['preferences.language'] = language;
      if (language !== currentPrefs.language) {
        changedPreferences.push(`Language: ${language}`);
      }
    }
    if (theme !== undefined) {
      updateFields['preferences.theme'] = theme;
      if (theme !== currentPrefs.theme) {
        changedPreferences.push(`Theme: ${theme}`);
      }
    }

    const settings = await Settings.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: updateFields },
      { new: true, upsert: true }
    );

    // ================= NOTIFICATION: Preferences Updated =================
    if (changedPreferences.length > 0) {
      await notificationService.createNotification(
        req.user.userId,
        "Preferences Updated ⚙️",
        `Your notification preferences have been updated:\n${changedPreferences.join('\n')}`,
        "system",
        null,
        "/settings/notifications",
        "low"
      );
    }

    // ================= NOTIFICATION: Important Preference Changes =================
    if (emailNotifications === false && currentPrefs.emailNotifications === true) {
      await notificationService.createNotification(
        req.user.userId,
        "Email Notifications Disabled 📧",
        "You will no longer receive email notifications. Important alerts will still appear in-app.",
        "system",
        null,
        "/settings/notifications",
        "medium"
      );
    }

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: settings.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating preferences',
      error: error.message
    });
  }
};

// ========================
// Reset Settings to Default
// ========================
exports.resetSettings = async (req, res) => {
  try {
    const defaultSettings = {
      businessName: '',
      address: '',
      bio: '',
      preferences: {
        emailNotifications: true,
        smsNotifications: false,
        newsletter: true,
        language: 'en',
        theme: 'light'
      }
    };

    const settings = await Settings.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: defaultSettings },
      { new: true, upsert: true }
    );

    // ================= NOTIFICATION: Settings Reset =================
    await notificationService.createNotification(
      req.user.userId,
      "Settings Reset to Default 🔄",
      "All your settings have been reset to default values.",
      "system",
      null,
      "/settings",
      "medium"
    );

    // ================= NOTIFICATION: Preferences Summary =================
    await notificationService.createNotification(
      req.user.userId,
      "Default Settings Applied ⚙️",
      "Email notifications: ON, SMS: OFF, Newsletter: ON, Language: English, Theme: Light",
      "system",
      null,
      "/settings",
      "low"
    );

    res.json({
      success: true,
      message: 'Settings reset to default successfully',
      settings
    });
  } catch (error) {
    console.error('Reset settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting settings',
      error: error.message
    });
  }
};

// ========================
// Update Notification Preferences Only
// ========================
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const { emailNotifications, smsNotifications, pushNotifications } = req.body;

    const updateFields = {};
    const changes = [];

    if (emailNotifications !== undefined) updateFields['preferences.emailNotifications'] = emailNotifications;
    if (smsNotifications !== undefined) updateFields['preferences.smsNotifications'] = smsNotifications;
    if (pushNotifications !== undefined) updateFields['preferences.pushNotifications'] = pushNotifications;

    const settings = await Settings.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: updateFields },
      { new: true, upsert: true }
    );

    // ================= NOTIFICATION: Notification Preferences Updated =================
    // But only send if push notifications are enabled (to avoid spam)
    if (pushNotifications !== false) {
      await notificationService.createNotification(
        req.user.userId,
        "Notification Settings Updated 🔔",
        `Your notification preferences have been updated.`,
        "system",
        null,
        "/settings/notifications",
        "low"
      );
    }

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      preferences: settings.preferences
    });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification preferences',
      error: error.message
    });
  }
};