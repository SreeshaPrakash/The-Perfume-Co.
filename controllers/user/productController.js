const Product = require("../../models/productschema");
const Category = require("../../models/categoryschema");
const User = require("../../models/userschema");
const Brand = require('../../models/brandschema')

const productDetails = async (req, res) => {
  try {
    const userId = req.session.user._id;
    //const userData = await User.findById(userId)
    const userData = userId ? await User.findById(userId) : null;
    const productId = req.query.id;
    const product = await Product.findById(productId)
      .populate("category")
      .populate("brand");

    const findCategory = product.category;
    //const categoryOffer = findCategory ?.categoryOffer || 0
    //const productOffer = product.productOffer || 0
    // const totalOffer = categoryOffer + productOffer

    const relatedProducts = await Product.find({
      category: findCategory?._id,
      _id: { $ne: productId },
    }).limit(3);

    res.render("product-details", {
      user: userData,
      product: product,
      quantity: product.quantity,
      //totalOffer : totalOffer,
      category: findCategory,
      relatedProducts: relatedProducts,
    });
  } catch (error) {
    console.error("Error for fetching product details", error);
    res.redirect("/pageNotFound");
  }
};

 
// const loadshop = async(req,res)=>{
//   try {
//     const userId = req.session.user
//     const category = await Category.find({isListed : true})
//     const brand = await Brand.find({ isListed: true });
  
//     const page = parseInt(req.query.page) || 1;
//     const limit = 9;
//    const search = req.query.search || '';
//           const query = search ? { productName: { $regex: search, $options: 'i' } } : {};
  
//           const product = await Product.find({ ...query, isListed: true, quantity: { $gt: 0 } })
//               .sort({ createdAt: -1 })
//               .skip((page - 1) * limit)
//               .limit(limit)
//               .populate('category')
//               .populate('brand');
  
//           const totalproduct = await Product.countDocuments({ ...query, isListed: true });
//           const totalpage = Math.ceil(totalproduct / limit);
  
//           if (userId) {
//               const userData = await User.findById({ _id: userId });
//               if (userData) {
//                   return res.render("shop", {
//                       user: userData,
//                       product: product,
//                       category: category,
//                       brand: brand,
//                       totalproduct: totalproduct,
//                       currentpage: page,
//                       totalpage: totalpage,
//                       search: ''
//                   });
//               }
//           } else {
//               return res.render("shop", {
//                   product: product,
//                   category: casdtegory,
//                   brand: brand,
//                   totalproduct: totalproduct,
//                   currentpage: page,
//                   totalpage: totalpage,
//                   search: ''
//               });
//           }
//   } catch (error) {
//     console.error(error);
//           res.status(500).json("server error");
    
//   }
// }

const loadshop = async (req, res) => {
  try {
      // Initialize userData as null
      //let userData ;
      //console.log("hellooo");
      const userId = req.session.user._id;
      let userData = userId ? await User.findById(userId) : null;
      
      console.log("userId:",userData)
      
      // Check if user is logged in and get user data if they are
      if (req.session.user) {
          userData = await User.findOne({ _id: req.session.user?._id });
          console.log("user data inside:",userData)
      }

      const query = {
          search: req.query.search || '',
          sort: req.query.sort || '',
          category: req.query.category || '',
          brand: req.query.brand || '',
          maxPrice: req.query.maxPrice || '',
          minPrice: req.query.minPrice || ''
      };

      // Base filter conditions
      const filter = {
          isBlocked: false,
          status: "Available"
      };

      // Add search filter if provided
      if (query.search) {
          filter.productName = { $regex: query.search, $options: 'i' };
      }

      // Add category filter if provided
      if (query.category) {
          filter.category = query.category;
      }

      // Add brand filter if provided
      if (query.brand) {
          filter.brand = query.brand;
      }

      // Add price range filter if provided
      if (query.minPrice || query.maxPrice) {
          filter.salePrice = {};
          if (query.minPrice) filter.salePrice.$gte = parseInt(query.minPrice);
          if (query.maxPrice) filter.salePrice.$lte = parseInt(query.maxPrice);
      }

      // Sort options
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

      // Fetch all required data
      const [products, categories, brands] = await Promise.all([
          Product.find(filter)
                 .sort(sortOptions)
                 .populate('category')
                 .populate('brand'),
          Category.find({ isListed: true }),
          Brand.find()
      ]);

      //console.log('Products:', products); // Debug log

      // Render the shop page with or without user data
      res.render('shop', {
          products,
          categories,
          brands,
          query,
          userData, // This will be null for non-logged-in users
          isLoggedIn: !!req.session.user // Add a boolean flag for login status
      });

  } catch (error) {
      console.error('Shop page error:', error);
      res.status(500).send('Internal Server Error');
    }
};




module.exports = {
  productDetails,
  loadshop

};
