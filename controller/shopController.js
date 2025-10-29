const {Shop} = require("../models/model"); // ✅ correct import

// Create new shop
// Create new shop - FIXED VERSION
exports.createShop = async (req, res) => {
  try {
    const { name, location, description, services } = req.body;

    console.log("Received shop data:", {
      name,
      location,
      description,
      services,
      hasFile: !!req.file,
      user: req.user.userId
    });

    // Validate required fields
    if (!name || !location || !description) {
      return res.status(400).json({ 
        message: "Name, location, and description are required" 
      });
    }

    let servicesArray = [];
    
    // Handle services parsing safely
    if (services) {
      try {
        // Check if services is already an object/array (from FormData)
        if (typeof services === 'string') {
          servicesArray = JSON.parse(services);
        } else {
          servicesArray = services; // It's already parsed
        }
      } catch (parseError) {
        console.error("Services parse error:", parseError);
        servicesArray = []; // Fallback to empty array
      }
    }

    // Validate services structure
    if (servicesArray && Array.isArray(servicesArray)) {
      servicesArray = servicesArray.filter(service => 
        service && service.serviceName && service.price
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
      shop 
    });
    
  } catch (error) {
    console.error("Error creating shop:", error);
    res.status(500).json({ 
      message: "Error creating shop", 
      error: error.message 
    });
  }
};
// Get all shops
// In your shopController.js

// Get all shops (public - no auth required)
exports.getAllShops = async (req, res) => {
  try {
    const shops = await Shop.find().populate("owner", "name email");
    res.json(shops);
  } catch (error) {
    res.status(500).json({ message: "Error fetching shops", error: error.message });
  }
};

// Get my shops (protected - requires auth)
exports.getMyShops = async (req, res) => {
  try {
    console.log("Fetching shops for user:", req.user.userId);
    
    const shops = await Shop.find({ owner: req.user.userId })
      .populate("owner", "name email")
      .sort({ createdAt: -1 });
    
    console.log("Found shops for user:", shops.length);
    res.json(shops);
  } catch (error) {
    console.error("Error fetching user shops:", error);
    res.status(500).json({ message: "Error fetching your shops", error: error.message });
  }
};
// Get shop by ID
exports.getShopById = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id).populate("owner", "name email");
    if (!shop) return res.status(404).json({ message: "Shop not found" });
    res.json(shop);
  } catch (error) {
    res.status(500).json({ message: "Error fetching shop", error: error.message });
  }
};

// Update shop
// Update shop - FIXED VERSION
exports.updateShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    if (shop.owner.toString() !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Prepare update data properly
    const updateData = {
      name: req.body.name,
      location: req.body.location,
      description: req.body.description
    };

    // Handle services - parse JSON string
    if (req.body.services) {
      try {
        updateData.services = JSON.parse(req.body.services);
      } catch (error) {
        console.error("Error parsing services:", error);
        return res.status(400).json({ message: "Invalid services format" });
      }
    }

    // Handle image upload
    if (req.file) {
      updateData.image = `/uploads/shops/${req.file.filename}`;
    }

    console.log("Updating shop with data:", updateData);

    const updatedShop = await Shop.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      {
        new: true,
        runValidators: true // This ensures validation runs on update
      }
    ).populate("owner", "name email");

    res.json({ message: "Shop updated successfully", shop: updatedShop });
  } catch (error) {
    console.error("Error updating shop:", error);
    res.status(500).json({ 
      message: "Error updating shop", 
      error: error.message 
    });
  }
};

// Delete shop
exports.deleteShop = async (req, res) => {
  try {
    const shop = await Shop.findById(req.params.id);
    if (!shop) return res.status(404).json({ message: "Shop not found" });

    if (shop.owner.toString() !== req.user.userId && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Shop.findByIdAndDelete(req.params.id);
    res.json({ message: "Shop deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting shop", error: error.message });
  }
};
