const { Shop } = require("../models/model");
const { uploadToCloudinary, deleteFromCloudinary } = require("../config/cloudinary");
const NotificationService = require("../services/notificationService");

/**
 * CREATE SHOP
 */
exports.createShop = async (req, res) => {
  try {
    const { name, location, description, services, contactEmail, contactPhone } = req.body;
    const userId = req.user.userId;

    if (!name || !location) {
      return res.status(400).json({
        success: false,
        message: "Name and location are required",
      });
    }

    // Parse services safely
    let servicesArray = [];
    if (services) {
      try {
        servicesArray = typeof services === "string" ? JSON.parse(services) : services;
      } catch (error) {
        console.error("Error parsing services:", error);
      }
    }

    // Validate services
    servicesArray = Array.isArray(servicesArray)
      ? servicesArray.filter(s => s?.serviceName && s?.price !== undefined)
      : [];

    // Upload image (optional)
    let imageData = null;
    if (req.file?.buffer) {
      try {
        const upload = await uploadToCloudinary(req.file.buffer, "shops", {
          width: 800,
          height: 600,
          crop: "limit",
        });

        imageData = {
          public_id: upload.public_id,
          url: upload.secure_url,
        };
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        // Continue without image
      }
    }

    const shop = await Shop.create({
      owner: userId,
      name: name.trim(),
      location: location.trim(),
      description: description?.trim() || "",
      contactEmail: contactEmail?.trim() || "",
      contactPhone: contactPhone?.trim() || "",
      services: servicesArray,
      image: imageData,
    });

    // 🔔 Notification
    try {
      await NotificationService.createNotification(
        userId,
        "Shop Created 🎉",
        `Your shop "${shop.name}" is now live.`,
        "system",
        shop._id,
        `/shop/${shop._id}`,
        "high"
      );
    } catch (notifError) {
      console.error("Notification error:", notifError);
      // Continue even if notification fails
    }

    res.status(201).json({
      success: true,
      message: "Shop created successfully",
      shop,
    });
  } catch (error) {
    console.error("Create shop error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating shop",
      error: error.message,
    });
  }
};

/**
 * UPDATE SHOP
 */
exports.updateShop = async (req, res) => {
  try {
    const shopId = req.params.id;
    const userId = req.user.userId;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ 
        success: false, 
        message: "Shop not found" 
      });
    }

    // Check authorization
    if (shop.owner.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized: You can only update your own shops" 
      });
    }

    const updateData = {};
    
    // Update basic fields
    if (req.body.name) updateData.name = req.body.name.trim();
    if (req.body.location) updateData.location = req.body.location.trim();
    if (req.body.description !== undefined) updateData.description = req.body.description.trim();
    if (req.body.contactEmail !== undefined) updateData.contactEmail = req.body.contactEmail.trim();
    if (req.body.contactPhone !== undefined) updateData.contactPhone = req.body.contactPhone.trim();
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    // Update services
    if (req.body.services) {
      let parsedServices;
      try {
        parsedServices = typeof req.body.services === "string" 
          ? JSON.parse(req.body.services) 
          : req.body.services;
      } catch (parseError) {
        console.error("Error parsing services:", parseError);
        parsedServices = [];
      }

      updateData.services = Array.isArray(parsedServices)
        ? parsedServices.filter(s => s?.serviceName && s?.price !== undefined)
        : [];
    }

    // Handle image update
    if (req.file?.buffer) {
      try {
        // Delete old image if exists
        if (shop.image?.public_id) {
          await deleteFromCloudinary(shop.image.public_id);
        }

        // Upload new image
        const upload = await uploadToCloudinary(req.file.buffer, "shops", {
          width: 800,
          height: 600,
          crop: "limit",
        });

        updateData.image = {
          public_id: upload.public_id,
          url: upload.secure_url,
        };
      } catch (imageError) {
        console.error("Image update error:", imageError);
        // Don't update image if upload fails
      }
    }

    // Handle image removal (if image is being removed)
    if (req.body.removeImage === "true" && shop.image?.public_id) {
      try {
        await deleteFromCloudinary(shop.image.public_id);
        updateData.image = null;
      } catch (deleteError) {
        console.error("Image deletion error:", deleteError);
      }
    }

    const updatedShop = await Shop.findByIdAndUpdate(
      shopId,
      updateData,
      { new: true, runValidators: true }
    ).populate("owner", "name email");

    // 🔔 Notification
    try {
      await NotificationService.createNotification(
        shop.owner,
        "Shop Updated ✅",
        `Your shop "${updatedShop.name}" was updated.`,
        "system",
        updatedShop._id,
        `/shop/${updatedShop._id}`
      );
    } catch (notifError) {
      console.error("Notification error:", notifError);
    }

    res.json({ 
      success: true, 
      message: "Shop updated successfully",
      shop: updatedShop 
    });
  } catch (error) {
    console.error("Update shop error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error updating shop",
      error: error.message 
    });
  }
};

/**
 * DELETE SHOP
 */
exports.deleteShop = async (req, res) => {
  try {
    const shopId = req.params.id;
    const userId = req.user.userId;

    const shop = await Shop.findById(shopId);
    if (!shop) {
      return res.status(404).json({ 
        success: false, 
        message: "Shop not found" 
      });
    }

    // Check authorization
    if (shop.owner.toString() !== userId && req.user.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized: You can only delete your own shops" 
      });
    }

    // Delete image from Cloudinary if exists
    if (shop.image?.public_id) {
      try {
        await deleteFromCloudinary(shop.image.public_id);
      } catch (cloudinaryError) {
        console.error("Cloudinary deletion error:", cloudinaryError);
        // Continue with shop deletion even if image deletion fails
      }
    }

    // Delete the shop
    await Shop.findByIdAndDelete(shopId);

    // 🔔 Notification
    try {
      await NotificationService.createNotification(
        shop.owner,
        "Shop Deleted 🗑️",
        `Your shop "${shop.name}" was deleted.`,
        "system"
      );
    } catch (notifError) {
      console.error("Notification error:", notifError);
    }

    res.json({ 
      success: true, 
      message: "Shop deleted successfully" 
    });
  } catch (error) {
    console.error("Delete shop error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error deleting shop",
      error: error.message 
    });
  }
};

/**
 * GET ALL SHOPS
 */
exports.getAllShops = async (req, res) => {
  try {
    const shops = await Shop.find()
      .populate("owner", "name email")
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      count: shops.length,
      shops 
    });
  } catch (error) {
    console.error("Get all shops error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching shops",
      error: error.message 
    });
  }
};

/**
 * GET MY SHOPS
 */
exports.getMyShops = async (req, res) => {
  try {
    const shops = await Shop.find({ owner: req.user.userId })
      .sort({ createdAt: -1 });
    
    res.json({ 
      success: true, 
      count: shops.length,
      shops 
    });
  } catch (error) {
    console.error("Get my shops error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching your shops",
      error: error.message 
    });
  }
};

/**
 * GET SHOP BY ID
 */
exports.getShopById = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id)
      .populate("owner", "name email profileImage");
    
    if (!shop) {
      return res.status(404).json({ 
        success: false, 
        message: "Shop not found" 
      });
    }
    
    res.json({ 
      success: true, 
      shop 
    });
  } catch (error) {
    console.error("Get shop by ID error:", error);
    
    // Check if error is due to invalid ID format
    if (error.kind === 'ObjectId') {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid shop ID format" 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: "Error fetching shop",
      error: error.message 
    });
  }
};

/**
 * SEARCH SHOPS
 */
exports.searchShops = async (req, res) => {
  try {
    const { query, location, service } = req.query;
    let searchCriteria = {};

    if (query) {
      searchCriteria.$or = [
        { name: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ];
    }

    if (location) {
      searchCriteria.location = { $regex: location, $options: 'i' };
    }

    if (service) {
      searchCriteria['services.serviceName'] = { $regex: service, $options: 'i' };
    }

    const shops = await Shop.find(searchCriteria)
      .populate("owner", "name email")
      .sort({ rating: -1, createdAt: -1 });

    res.json({
      success: true,
      count: shops.length,
      shops
    });
  } catch (error) {
    console.error("Search shops error:", error);
    res.status(500).json({
      success: false,
      message: "Error searching shops",
      error: error.message
    });
  }
};