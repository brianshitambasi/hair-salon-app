const { Shop } = require("../models/model");

/**
 * @desc Create new shop
 * @route POST /shops
 * @access Private (Shop owner)
 */
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

    const shop = new Shop({
      owner: req.user.userId,
      name: name.trim(),
      location: location.trim(),
      description: description.trim(),
      services: servicesArray,
      image: req.file ? `/uploads/shops/${req.file.filename}` : "",
    });

    await shop.save();
    await shop.populate("owner", "name email");

    console.log("Shop created successfully:", shop._id);

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

/**
 * @desc Get all shops (public)
 * @route GET /shops
 */
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

/**
 * @desc Get shops owned by the logged-in user
 * @route GET /shops/my
 * @access Private (Shop owner)
 */
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

/**
 * @desc Get single shop by ID
 * @route GET /shops/:id
 */
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

/**
 * @desc Update shop details
 * @route PUT /shops/:id
 * @access Private (Shop owner or Admin)
 */
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

    // Handle new image upload
    if (req.file) {
      updateData.image = `/uploads/shops/${req.file.filename}`;
    }

    console.log("Updating shop with data:", updateData);

    const updatedShop = await Shop.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate("owner", "name email");

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

/**
 * @desc Delete shop
 * @route DELETE /shops/:id
 * @access Private (Shop owner or Admin)
 */
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
