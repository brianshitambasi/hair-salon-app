const { Cart } = require("../models/model");

// Add service to cart
exports.addToCart = async (req, res) => {
  try {
    const { shop, serviceName, price } = req.body;
    let cart = await Cart.findOne({ customer: req.user.userId });

    if (!cart) cart = new Cart({ customer: req.user.userId, items: [] });

    if (cart.items.length > 0 && cart.items[0].shop.toString() !== shop) {
      return res.status(400).json({ message: "Cart must contain services from one shop only" });
    }

    cart.items.push({ shop, serviceName, price });
    await cart.save();

    res.status(200).json({ message: "Service added to cart", cart });
  } catch (error) {
    res.status(500).json({ message: "Error adding to cart", error: error.message });
  }
};

// Get cart
exports.getCart = async (req, res) => {
  const cart = await Cart.findOne({ customer: req.user.userId }).populate("items.shop", "name location");
  if (!cart) return res.status(200).json({ message: "Cart empty" });
  res.json(cart);
};

// Remove service
exports.removeFromCart = async (req, res) => {
  const cart = await Cart.findOne({ customer: req.user.userId });
  cart.items = cart.items.filter(i => i._id.toString() !== req.params.itemId);
  await cart.save();
  res.json({ message: "Removed from cart", cart });
};

// Clear cart
exports.clearCart = async (req, res) => {
  await Cart.findOneAndDelete({ customer: req.user.userId });
  res.json({ message: "Cart cleared" });
};
