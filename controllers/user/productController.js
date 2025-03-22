const Product = require("../../models/productschema");
const Category = require("../../models/categoryschema");
const User = require("../../models/userschema");
const Brand = require('../../models/brandschema')
const Wishlist = require("../../models/wishlistschema")
const Cart = require("../../models/cartschema")

// const productDetails = async (req, res) => {
//   try {
//     const userId = req.session.user._id;
//     //const userData = await User.findById(userId)
//     const userData = userId ? await User.findById(userId) : null;
//     const productId = req.query.id;
//     const product = await Product.findById(productId)
//       .populate("category")
//       .populate("brand");

//     const findCategory = product.category;
//     //const categoryOffer = findCategory ?.categoryOffer || 0
//     //const productOffer = product.productOffer || 0
//     // const totalOffer = categoryOffer + productOffer


//     if (!product) {
//       return res.redirect("/pageNotFound");
//     }

//     const categoryOffer = product.category ? product.category.categoryOffer : 0;
//     const highestOffer = Math.max(product.productOffer, categoryOffer);
    


//     const relatedProducts = await Product.find({
//       category: findCategory?._id,
//       _id: { $ne: productId },
//     }).limit(3);

//     res.render("product-details", {
//       user: userData,
//       product: product,
//       highestOffer,
//       quantity: product.quantity,
//       //totalOffer : totalOffer,
//       category: findCategory,
//       relatedProducts: relatedProducts,
//     });
//   } catch (error) {
//     console.error("Error for fetching product details", error);
//     res.redirect("/pageNotFound");
//   }
// };



const productDetails = async (req, res) => {
  try {
    // Check if user session exists before accessing `_id`
    const userId = req.session.user ? req.session.user._id : null;
    const userData = userId ? await User.findById(userId) : null;

    const productId = req.query.id;
    if (!productId) {
      return res.redirect("/pageNotFound");
    }

    const product = await Product.findById(productId)
      .populate("category")
      .populate("brand");

    if (!product) {
      return res.redirect("/pageNotFound");
    }

    const categoryOffer = product.category ? product.category.categoryOffer : 0;
    const highestOffer = Math.max(product.productOffer, categoryOffer);
    
    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: productId }
    }).limit(3);

    // Fetch cart items if user is logged in
    let cartItems = [];
    if (userId) {
      const cart = await Cart.findOne({ userId }).select("items.productId");
      cartItems = cart ? cart.items.map(item => item.productId.toString()) : [];
    }

    res.render("product-details", {
      user: userData,
      product: product,
      highestOffer,
      quantity: product.quantity,
      category: product.category,
      relatedProducts: relatedProducts,
      cartItems // Pass cartItems to the template
    });
  } catch (error) {
    console.error("Error fetching product details:", error);
    res.redirect("/pageNotFound");
  }
};




 

const loadshop = async (req, res) => {
  try {
      const userId = req.session.user ? req.session.user._id : null;
      let userData = userId ? await User.findById(userId) : null;

      
      // Pagination variables
      const page = parseInt(req.query.page) || 1;
      const limit = 6; // Products per page
      const skip = (page - 1) * limit;


      // Build query filters
      const query = {
          search: req.query.search || '',
          sort: req.query.sort || '',
          category: req.query.category || '',
          brand: req.query.brand || '',
          maxPrice: req.query.maxPrice || '',
          minPrice: req.query.minPrice || ''
      };

      // Define filters
      const filter = {
          isBlocked: false,
          status: "Available"
      };

      if (query.search) {
          filter.productName = { $regex: query.search, $options: 'i' };
      }
      if (query.category) {
          filter.category = query.category;
      }
      if (query.brand) {
          filter.brand = query.brand;
      }
      if (query.minPrice || query.maxPrice) {
          filter.salePrice = {};
          if (query.minPrice) filter.salePrice.$gte = parseInt(query.minPrice);
          if (query.maxPrice) filter.salePrice.$lte = parseInt(query.maxPrice);
      }

      // Sorting options
      let sortOptions = {};
      switch (query.sort) {
          case 'price-asc':
              sortOptions = { salePrice: 1 };
              break;
          case 'price-desc':
              sortOptions = { salePrice: -1 };
              break;
          case 'name-asc':
              sortOptions = { productName: 1 };
              break;
          case 'name-desc':
              sortOptions = { productName: -1 };
              break;
          default:
              sortOptions = { createdAt: -1 };
      }

      // // Fetch products, categories, and brands
      // const [products, categories, brands] = await Promise.all([
      //     Product.find(filter).sort(sortOptions).populate("category").populate("brand"),
      //     Category.find({ isListed: true }),
      //     Brand.find()
      // ]);


       // Fetch products with pagination
       const [products, totalProducts, categories, brands] = await Promise.all([
        Product.find(filter).sort(sortOptions).populate("category").populate("brand").skip(skip).limit(limit),
        Product.countDocuments(filter),
        Category.find({ isListed: true }),
        Brand.find()
    ]);

    // Calculate total pages
    const totalPages = Math.ceil(totalProducts / limit);

      // Attach the highest offer to each product
    products.forEach(product => {
      const categoryOffer = product.category ? product.category.categoryOffer : 0;
      product.highestOffer = Math.max(product.productOffer, categoryOffer);
    });

    console.log(products)
      

      let wishlistItems = [];
      let cartItems = [];

      if (userId) {
          const wishlist = await Wishlist.findOne({ userId }).select("products");
          wishlistItems = wishlist ? wishlist.products.map(item => item.productId.toString()) : [];

          const cart = await Cart.findOne({ userId }).select("items.productId");
          cartItems = cart ? cart.items.map(item => item.productId.toString()) : [];
      }

      // Render the shop page
      res.render("shop", {
          products,
          categories,
          brands,
          query,
          userData,
          isLoggedIn: !!userId,
          wishlistItems,
          cartItems ,// Pass cart product IDs to the shop page
          totalPages,
          currentPage: page

      });

  } catch (error) {
      console.error("Shop page error:", error);
      res.render("login");  
  }
};


module.exports = {
  productDetails,
  loadshop

};
