const { Product } = require("../models/model");

// ==================== CREATE PRODUCT ====================
exports.createProduct = async (req, res) => {
  try {
    if (req.user.role !== "shopowner" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, description, price, category, stock } = req.body;
    const image = req.file ? req.file.path : null;
    const shop = req.user.role === "shopowner" ? req.user.shop : req.body.shop;

    const product = new Product({ name, description, price, category, image, stock, shop });
    await product.save();

    res.status(201).json({ message: "Product created successfully", product });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: error.message });
  }
};

// ==================== GET ALL PRODUCTS ====================
exports.getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().populate("shop", "name location");
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== GET PRODUCT BY ID ====================
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate("shop", "name location");
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== UPDATE PRODUCT ====================
exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (
      req.user.role !== "admin" &&
      req.user.role !== "shopowner"
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    Object.assign(product, req.body);
    if (req.file) product.image = req.file.path;
    await product.save();

    res.status(200).json({ message: "Product updated successfully", product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==================== DELETE PRODUCT ====================
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (
      req.user.role !== "admin" &&
      req.user.role !== "shopowner"
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    await product.deleteOne();
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
