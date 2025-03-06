// controllers/wishlistController.js
const Wishlist = require('../../models/wishlistschema');
const Product = require('../../models/productschema');
const User = require('../../models/userschema');
const Category = require("../../models/categoryschema")
const Brand = require("../../models/brandschema")
const Cart = require("../../models/cartschema")

// Get all wishlist items for a user
// const getWishlist = async (req, res) => {
//   try {
//     const userId = req.session.user; // Using session user ID from your middleware
    
//     // Find the wishlist for the current user and populate product details
//     let wishlistItems = await Wishlist.findOne({ userId: userId })
//       .populate('products.productId');
    
//     // If no wishlist exists yet, create an empty object for rendering
//     if (!wishlistItems) {
//       wishlistItems = { products: [] };
//     }
    
//     res.render('wishlist', {
//       wishlistItems,
//       pageTitle: 'My Wishlist'
//     });
//   } catch (error) {
//     console.error('Error fetching wishlist:', error);
//     res.status(500).render('error', {
//       message: 'Failed to load wishlist. Please try again later.'
//     });
//   }
// };

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


// Add a product from wishlist to cart
const addToCart = async (req, res) => {
  try {
    const userId = req.session.user;
    const { productId } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: "User not logged in" });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Check if product is in stock
    if (product.quantity <= 0) {
      return res.status(400).json({ success: false, message: "Out of Stock" });
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    const cartItemIndex = cart.items.findIndex(item => item.productId.toString() === productId.toString());
    
    if (cartItemIndex > -1) {
      cart.items[cartItemIndex].quantity += 1;
    } else {
      cart.items.push({ productId: productId, quantity: 1 });
    }

    await cart.save();
    res.status(200).json({ success: true, message: "Product added to cart" });

  } catch (error) {
    console.error("Error adding to cart:", error);
    res.status(500).json({ success: false, message: "Failed to add product to cart" });
  }
};


module.exports = {
    getWishlist,
    addToWishlist,
    removeFromWishlist,
    addToCart,
    

}