const { Cart } = require("../models/model");

// Add service to cart
exports.addToCart = async (req, res) => {
  try {
    const { shop, serviceName, price } = req.body;
    let cart = await Cart.findOne({ customer: req.user.userId });
    if (!cart) cart = new Cart({ customer: req.user.userId, items: [] });

    cart.items.push({ shop, serviceName, price });
    await cart.save();
    res.status(200).json({ message: "Service added to cart", cart });
  } catch (error) {
    res.status(500).json({ message: "Error adding to cart", error: error.message });
  }
};

// Get customer cart
exports.getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ customer: req.user.userId }).populate("items.shop", "name location");
    if (!cart) return res.json({ message: "Your cart is empty" });
    res.json(cart);
  } catch (error) {
    res.status(500).json({ message: "Error fetching cart", error: error.message });
  }
};

// Remove item from cart
exports.removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;
    const cart = await Cart.findOne({ customer: req.user.userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    cart.items = cart.items.filter((item) => item._id.toString() !== itemId);
    await cart.save();
    res.json({ message: "Item removed from cart", cart });
  } catch (error) {
    res.status(500).json({ message: "Error removing item", error: error.message });
  }
};

// Clear all items in cart
exports.clearCart = async (req, res) => {
  try {
    await Cart.findOneAndDelete({ customer: req.user.userId });
    res.json({ message: "Cart cleared successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error clearing cart", error: error.message });
  }
};
