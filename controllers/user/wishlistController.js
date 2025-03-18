// controllers/wishlistController.js
const Wishlist = require('../../models/wishlistschema');
const Product = require('../../models/productschema');
const User = require('../../models/userschema');
const Category = require("../../models/categoryschema")
const Brand = require("../../models/brandschema")
const Cart = require("../../models/cartschema")



const getWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    let wishlistItems = await Wishlist.findOne({ userId }).populate('products.productId');

    if (!wishlistItems) wishlistItems = { products: [] };

    let cartItems = [];
    if (userId) {
      const cart = await Cart.findOne({ userId }).select("items.productId");
      cartItems = cart ? cart.items.map(item => item.productId.toString()) : [];
    }

    res.render('wishlist', {
      wishlistItems,
      cartItems,
      pageTitle: 'My Wishlist'
    });

  } catch (error) {
    console.error('Error fetching wishlist:', error);
    req.flash('error', 'Failed to load wishlist. Please try again.');
    res.redirect('/wishlist');
  }
};


// Add a product to wishlist
const addToWishlist = async (req, res) => {
  try {
    const userId = req.session.user;  // Ensure this is storing the actual userId
    const { productId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    let wishlist = await Wishlist.findOne({ userId });

    if (!wishlist) {
      wishlist = new Wishlist({ userId, products: [{ productId }] });
      await wishlist.save();
      return res.status(201).json({ success: true, message: "Added to wishlist" });
    }

    const exists = wishlist.products.some(item => item.productId.toString() === productId.toString());
    if (exists) {
      return res.status(200).json({ success: true, message: "Already in wishlist" });
    }

    wishlist.products.push({ productId });
    await wishlist.save();

    res.status(201).json({ success: true, message: "Added to wishlist" });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Remove a product from wishlist
const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      return res.status(404).json({ success: false, message: "Wishlist not found" });
    }

    const initialLength = wishlist.products.length;
    wishlist.products = wishlist.products.filter(item => item.productId.toString() !== productId.toString());

    if (wishlist.products.length === initialLength) {
      return res.status(404).json({ success: false, message: "Product not found in wishlist" });
    }

    await wishlist.save();
    res.status(200).json({ success: true, message: "Removed from wishlist" });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


// Replace your current addToCart method with this one
const addToCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const productId = req.params.productId;
    const quantity = parseInt(req.body.quantity, 10) || 1;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    const product = await Product.findById(productId).populate("category");
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Check if product is in stock
    if (product.quantity <= 0) {
      return res.status(400).json({ success: false, message: "Out of Stock" });
    }

    const productOffer = product.productOffer || 0;
    const categoryOffer = product.category.categoryOffer || 0;
    const bestOffer = Math.max(productOffer, categoryOffer);
    const finalPrice = bestOffer > 0
      ? product.salePrice - (product.salePrice * bestOffer) / 100
      : product.salePrice;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      // Ensure the user cannot add more than 5 in a new cart
      if (quantity > 5) {
        return res.status(400).json({
          success: false,
          message: "Cannot add more than 5 of this product",
        });
      }
      cart = new Cart({
        userId,
        items: [
          {
            productId,
            quantity,
            price: finalPrice,
            totalPrice: Math.floor(finalPrice * quantity),
          },
        ],
      });
    } else {
      const existingItemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (existingItemIndex !== -1) {
        // Check if adding the new quantity exceeds the limit
        if (cart.items[existingItemIndex].quantity + quantity > 5) {
          return res.status(400).json({
            success: false,
            message: "Maximum limit of 5 per product reached",
          });
        }
        cart.items[existingItemIndex].quantity += quantity;
        cart.items[existingItemIndex].totalPrice = Math.floor(
          cart.items[existingItemIndex].quantity * finalPrice
        );
      } else {
        if (quantity > 5) {
          return res.status(400).json({
            success: false,
            message: "Cannot add more than 5 of this product",
          });
        }
        cart.items.push({
          productId,
          quantity,
          price: finalPrice,
          totalPrice: Math.floor(finalPrice * quantity),
        });
      }
    }

    await cart.save();
    res.json({ success: true, message: "Added to cart" });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};


module.exports = {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    addToCart,
    

}