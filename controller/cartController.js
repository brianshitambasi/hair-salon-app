const { Cart, Shop } = require("../models/model");
const { notificationService } = require("./notificationController"); // Add this import

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { shop, serviceName, price } = req.body;

    if (!shop || !serviceName || !price) {
      return res.status(400).json({ 
        message: "Shop, serviceName, and price are required" 
      });
    }

    // Verify shop exists
    const shopExists = await Shop.findById(shop);
    if (!shopExists) {
      return res.status(404).json({ message: "Shop not found" });
    }

    let cart = await Cart.findOne({ customer: customerId });

    if (!cart) {
      cart = new Cart({
        customer: customerId,
        items: [{ shop, serviceName, price }],
      });
    } else {
      // Check if item already exists in cart
      const existingItem = cart.items.find(
        item => item.shop.toString() === shop && item.serviceName === serviceName
      );

      if (existingItem) {
        return res.status(400).json({ message: "Service already in cart" });
      }

      cart.items.push({ shop, serviceName, price });
    }

    await cart.save();
    
    // ================= NOTIFICATION: Cart Item Added =================
    await notificationService.createNotification(
      customerId,
      "Service Added to Cart 🛒",
      `${serviceName} has been added to your cart`,
      "system",
      null,
      "/cart",
      "low"
    );

    res.status(200).json({ 
      message: "Service added to cart", 
      cart 
    });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ 
      message: "Error adding to cart", 
      error: error.message 
    });
  }
};

// Get cart
exports.getCart = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const cart = await Cart.findOne({ customer: customerId }).populate("items.shop");

    if (!cart) {
      return res.status(200).json({ items: [], total: 0 });
    }

    res.status(200).json(cart);
  } catch (error) {
    console.error("Get cart error:", error);
    res.status(500).json({ 
      message: "Error fetching cart", 
      error: error.message 
    });
  }
};

// Remove from cart
exports.removeFromCart = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { itemId } = req.params;

    const cart = await Cart.findOne({ customer: customerId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" });
    }

    // Find the item being removed for notification
    const removedItem = cart.items.find(item => item._id.toString() === itemId);
    
    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    await cart.save();

    // ================= NOTIFICATION: Cart Item Removed =================
    if (removedItem) {
      await notificationService.createNotification(
        customerId,
        "Service Removed from Cart 🗑️",
        `${removedItem.serviceName} has been removed from your cart`,
        "system",
        null,
        "/cart",
        "low"
      );
    }

    res.status(200).json({ 
      message: "Item removed from cart", 
      cart 
    });
  } catch (error) {
    console.error("Remove from cart error:", error);
    res.status(500).json({ 
      message: "Error removing from cart", 
      error: error.message 
    });
  }
};

// Clear cart
exports.clearCart = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const cart = await Cart.findOne({ customer: customerId });
    
    if (cart && cart.items.length > 0) {
      // ================= NOTIFICATION: Cart Cleared =================
      await notificationService.createNotification(
        customerId,
        "Cart Cleared 🗑️",
        `All items have been removed from your cart`,
        "system",
        null,
        "/cart",
        "low"
      );
    }

    await Cart.findOneAndDelete({ customer: customerId });

    res.status(200).json({ 
      message: "Cart cleared successfully" 
    });
  } catch (error) {
    console.error("Clear cart error:", error);
    res.status(500).json({ 
      message: "Error clearing cart", 
      error: error.message 
    });
  }
};