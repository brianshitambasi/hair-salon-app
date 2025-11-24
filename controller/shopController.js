const { Shop } = require("../models/model");
const { uploadToCloudinary, deleteFromCloudinary } = require("../config/cloudinary");
const { notificationService } = require("./notificationController"); // Add this import

exports.createShop = async (req, res) => {
  try {
    const { name, location, description, services } = req.body;

    console.log("Received shop data:", {
      name,
      location,
      description,
      services,
      hasFile: !!req.file,
      user: req.user.userId,
    });

    // Validate required fields
    if (!name || !location || !description) {
      return res.status(400).json({
        message: "Name, location, and description are required",
      });
    }

    // Parse and validate services
    let servicesArray = [];
    if (services) {
      try {
        if (typeof services === "string") {
          servicesArray = JSON.parse(services);
        } else {
          servicesArray = services;
        }
      } catch (parseError) {
        console.error("Services parse error:", parseError);
        servicesArray = [];
      }
    }

    if (Array.isArray(servicesArray)) {
      servicesArray = servicesArray.filter(
        (s) => s && s.serviceName && s.price
      );
    } else {
      servicesArray = [];
    }

    // Handle image upload to Cloudinary
    let imageData = {};
    if (req.file && req.file.buffer) {
      try {
        const uploadResult = await uploadToCloudinary(
          req.file.buffer, 
          'shops',
          { width: 800, height: 600, crop: 'limit' }
        );
        
        imageData = {
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url
        };
        
        console.log("Image uploaded to Cloudinary:", imageData);
      } catch (uploadError) {
        console.error("Error uploading image to Cloudinary:", uploadError);
        return res.status(500).json({
          message: "Error uploading image",
          error: uploadError.message
        });
      }
    }

    const shop = new Shop({
      owner: req.user.userId,
      name: name.trim(),
      location: location.trim(),
      description: description.trim(),
      services: servicesArray,
      image: imageData,
    });

    await shop.save();
    await shop.populate("owner", "name email");

    console.log("Shop created successfully with Cloudinary image:", shop._id);

    // ================= NOTIFICATION: Shop Created =================
    await notificationService.createNotification(
      req.user.userId,
      "Shop Created Successfully! 🎉",
      `Your shop "${name}" is now live. Start adding services and accepting bookings!`,
      "system",
      shop._id,
      `/shop/${shop._id}`,
      "high"
    );

    // ================= NOTIFICATION: Next Steps =================
    await notificationService.createNotification(
      req.user.userId,
      "Next Steps for Your Shop 🛠️",
      "Complete your shop setup by adding business hours, contact info, and more services.",
      "system",
      null,
      `/shop/${shop._id}/setup`,
      "medium"
    );

    res.status(201).json({
      message: "Shop created successfully",
      shop,
    });
  } catch (error) {
    console.error("Error creating shop:", error);
    res.status(500).json({
      message: "Error creating shop",
      error: error.message,
    });
  }
};

exports.updateShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop)
      return res.status(404).json({ message: "Shop not found" });

    // Authorization
    if (
      shop.owner.toString() !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    }

    const updateData = {
      name: req.body.name?.trim(),
      location: req.body.location?.trim(),
      description: req.body.description?.trim(),
    };

    // Parse and validate services
    if (req.body.services) {
      try {
        if (typeof req.body.services === "string") {
          updateData.services = JSON.parse(req.body.services);
        } else {
          updateData.services = req.body.services;
        }
      } catch (error) {
        console.error("Error parsing services:", error);
        return res
          .status(400)
          .json({ message: "Invalid services format" });
      }

      if (Array.isArray(updateData.services)) {
        updateData.services = updateData.services.filter(
          (s) => s && s.serviceName && s.price
        );
      }
    }

    // Handle new image upload to Cloudinary
    if (req.file && req.file.buffer) {
      try {
        // Delete old image from Cloudinary if exists
        if (shop.image && shop.image.public_id) {
          await deleteFromCloudinary(shop.image.public_id);
          console.log("Deleted old image from Cloudinary:", shop.image.public_id);
        }

        // Upload new image
        const uploadResult = await uploadToCloudinary(
          req.file.buffer,
          'shops',
          { width: 800, height: 600, crop: 'limit' }
        );

        updateData.image = {
          public_id: uploadResult.public_id,
          url: uploadResult.secure_url
        };
        
        console.log("New image uploaded to Cloudinary:", updateData.image);
      } catch (uploadError) {
        console.error("Error uploading new image:", uploadError);
        return res.status(500).json({
          message: "Error uploading image",
          error: uploadError.message
        });
      }
    }

    console.log("Updating shop with data:", updateData);

    const updatedShop = await Shop.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("owner", "name email");

    // ================= NOTIFICATION: Shop Updated =================
    await notificationService.createNotification(
      shop.owner,
      "Shop Updated ✅",
      `Your shop "${updatedShop.name}" has been updated successfully.`,
      "system",
      updatedShop._id,
      `/shop/${updatedShop._id}`,
      "medium"
    );

    res.status(200).json({
      message: "Shop updated successfully",
      shop: updatedShop,
    });
  } catch (error) {
    console.error("Error updating shop:", error);
    res.status(500).json({
      message: "Error updating shop",
      error: error.message,
    });
  }
};

exports.deleteShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop)
      return res.status(404).json({ message: "Shop not found" });

    if (
      shop.owner.toString() !== req.user.userId &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ message: "You are not authorized to perform this action" });
    }

    // ================= NOTIFICATION: Shop Deleted =================
    await notificationService.createNotification(
      shop.owner,
      "Shop Deleted 🗑️",
      `Your shop "${shop.name}" has been deleted.`,
      "system",
      null,
      "/shop",
      "high"
    );

    // Delete image from Cloudinary if exists
    if (shop.image && shop.image.public_id) {
      try {
        await deleteFromCloudinary(shop.image.public_id);
        console.log("Deleted shop image from Cloudinary:", shop.image.public_id);
      } catch (deleteError) {
        console.error("Error deleting image from Cloudinary:", deleteError);
      }
    }

    await Shop.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Shop deleted successfully" });
  } catch (error) {
    console.error("Error deleting shop:", error);
    res.status(500).json({
      message: "Error deleting shop",
      error: error.message,
    });
  }
};

// Keep other methods the same (they don't need notifications)
exports.getAllShops = async (req, res) => {
  try {
    const shops = await Shop.find().populate("owner", "name email");
    res.status(200).json(shops);
  } catch (error) {
    console.error("Error fetching shops:", error);
    res.status(500).json({
      message: "Error fetching shops",
      error: error.message,
    });
  }
};

exports.getMyShops = async (req, res) => {
  try {
    console.log("Fetching shops for user:", req.user.userId);

    const shops = await Shop.find({ owner: req.user.userId })
      .populate("owner", "name email")
      .sort({ createdAt: -1 });

    console.log("Found shops for user:", shops.length);
    res.status(200).json(shops);
  } catch (error) {
    console.error("Error fetching user shops:", error);
    res.status(500).json({
      message: "Error fetching your shops",
      error: error.message,
    });
  }
};

exports.getShopById = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).populate(
      "owner",
      "name email"
    );
    if (!shop)
      return res.status(404).json({ message: "Shop not found" });
    res.status(200).json(shop);
  } catch (error) {
    console.error("Error fetching shop:", error);
    res.status(500).json({
      message: "Error fetching shop",
      error: error.message,
    });
  }
};