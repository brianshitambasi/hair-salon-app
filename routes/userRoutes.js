const express = require("express");
const multer = require("multer");
const router = express.Router();
const userController = require("../controller/userController");
const {auth} = require("../middleware/auth");



router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname),
});

// In your user routes
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, businessName, address, bio } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name, phone, businessName, address, bio },
      { new: true }
    ).select('-password');

    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});

// In your user routes
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.userId);
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    await user.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error changing password', error: error.message });
  }
});

const upload = multer({ storage });

router.get("/profile", auth, userController.getUserProfile);
router.put("/profile", auth, upload.single("profileImage"), userController.updateUserProfile);

module.exports = router;
