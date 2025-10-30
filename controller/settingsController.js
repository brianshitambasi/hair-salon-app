const Settings = require('../models/model');
const User = require('../models/model');

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

    // Update User model (name and phone)
    if (name || phone !== undefined) {
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
    if (businessName !== undefined) updateFields.businessName = businessName;
    if (address !== undefined) updateFields.address = address;
    if (bio !== undefined) updateFields.bio = bio;

    const settings = await Settings.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: updateFields },
      { new: true, upsert: true, runValidators: true }
    );

    // Get updated user data
    const user = await User.findById(req.user.userId).select('phone name email');

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

    const updateFields = {};
    if (emailNotifications !== undefined) updateFields['preferences.emailNotifications'] = emailNotifications;
    if (smsNotifications !== undefined) updateFields['preferences.smsNotifications'] = smsNotifications;
    if (newsletter !== undefined) updateFields['preferences.newsletter'] = newsletter;
    if (language !== undefined) updateFields['preferences.language'] = language;
    if (theme !== undefined) updateFields['preferences.theme'] = theme;

    const settings = await Settings.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: updateFields },
      { new: true, upsert: true }
    );

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