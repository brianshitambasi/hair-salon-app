const { Hairstyle, Shop } = require("../models/model");
const { notificationService } = require("./notificationController"); // Add this import

exports.createHairstyle = async (req, res) => {
  try {
    const { name, gender, imageUrl, tags, shop } = req.body;
    const shopData = await Shop.findById(shop);
    if (!shopData) return res.status(404).json({ message: "Shop not found" });
    if (shopData.owner.toString() !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    const hairstyle = new Hairstyle({ name, gender, imageUrl, tags, shop });
    await hairstyle.save();
    await hairstyle.populate("shop", "name location");
    
    // ================= NOTIFICATION: New Hairstyle Added =================
    await notificationService.createNotification(
      shopData.owner,
      "New Hairstyle Added ✂️",
      `"${name}" has been added to your shop portfolio`,
      "system",
      hairstyle._id,
      `/shop/hairstyles`,
      "low"
    );

    res.status(201).json({ 
      message: "Hairstyle created successfully", 
      hairstyle 
    });
  } catch (error) {
    console.error("Create hairstyle error:", error);
    res.status(500).json({ 
      message: "Error creating hairstyle", 
      error: error.message 
    });
  }
};

exports.getHairstyles = async (req, res) => {
  try {
    const hairstyles = await Hairstyle.find().populate("shop", "name location");
    res.json(hairstyles);
  } catch (error) {
    console.error("Get hairstyles error:", error);
    res.status(500).json({ 
      message: "Error fetching hairstyles", 
      error: error.message 
    });
  }
};

exports.getHairstylesByShop = async (req, res) => {
  try {
    const hairstyles = await Hairstyle.find({ shop: req.params.shopId }).populate("shop", "name location");
    res.json(hairstyles);
  } catch (error) {
    console.error("Get hairstyles by shop error:", error);
    res.status(500).json({ 
      message: "Error fetching hairstyles", 
      error: error.message 
    });
  }
};

exports.getHairstyleById = async (req, res) => {
  try {
    const hairstyle = await Hairstyle.findById(req.params.id).populate("shop", "name location");
    if (!hairstyle) return res.status(404).json({ message: "Hairstyle not found" });
    res.json(hairstyle);
  } catch (error) {
    console.error("Get hairstyle by ID error:", error);
    res.status(500).json({ 
      message: "Error fetching hairstyle", 
      error: error.message 
    });
  }
};

exports.updateHairstyle = async (req, res) => {
  try {
    const hairstyle = await Hairstyle.findById(req.params.id).populate("shop");
    if (!hairstyle) return res.status(404).json({ message: "Hairstyle not found" });
    if (hairstyle.shop.owner.toString() !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    const updatedHairstyle = await Hairstyle.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    ).populate("shop", "name location");
    
    // ================= NOTIFICATION: Hairstyle Updated =================
    await notificationService.createNotification(
      hairstyle.shop.owner,
      "Hairstyle Updated ✏️",
      `"${hairstyle.name}" has been updated`,
      "system",
      updatedHairstyle._id,
      `/shop/hairstyles`,
      "low"
    );

    res.json({ 
      message: "Hairstyle updated successfully", 
      hairstyle: updatedHairstyle 
    });
  } catch (error) {
    console.error("Update hairstyle error:", error);
    res.status(500).json({ 
      message: "Error updating hairstyle", 
      error: error.message 
    });
  }
};

exports.deleteHairstyle = async (req, res) => {
  try {
    const hairstyle = await Hairstyle.findById(req.params.id).populate("shop");
    if (!hairstyle) return res.status(404).json({ message: "Hairstyle not found" });
    if (hairstyle.shop.owner.toString() !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    // ================= NOTIFICATION: Hairstyle Deleted =================
    await notificationService.createNotification(
      hairstyle.shop.owner,
      "Hairstyle Deleted 🗑️",
      `"${hairstyle.name}" has been removed from your portfolio`,
      "system",
      null,
      `/shop/hairstyles`,
      "low"
    );

    await Hairstyle.findByIdAndDelete(req.params.id);
    res.json({ 
      message: "Hairstyle deleted successfully" 
    });
  } catch (error) {
    console.error("Delete hairstyle error:", error);
    res.status(500).json({ 
      message: "Error deleting hairstyle", 
      error: error.message 
    });
  }
};