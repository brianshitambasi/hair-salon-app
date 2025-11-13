// controller/cartController.js
const { Cart, Shop } = require("../models/model");

// Add item to cart
exports.addToCart = async (req, res) => {
  try {
    const customerId = req.user.userId;
    const { shop, serviceName, price } = req.body;

    if (!shop || !serviceName || !price) {
      return res.status(400).json({ message: "Shop, serviceName, and price are required" });
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
    res.status(200).json({ message: "Service added to cart", cart });
  } catch (error) {
    res.status(500).json({ message: "Error adding to cart", error: error.message });
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
    res.status(500).json({ message: "Error fetching cart", error: error.message });
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

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);
    await cart.save();

    res.status(200).json({ message: "Item removed from cart", cart });
  } catch (error) {
    res.status(500).json({ message: "Error removing from cart", error: error.message });
  }
};

// Clear cart
exports.clearCart = async (req, res) => {
  try {
    const customerId = req.user.userId;
    await Cart.findOneAndDelete({ customer: customerId });

    res.status(200).json({ message: "Cart cleared successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error clearing cart", error: error.message });
  }
};