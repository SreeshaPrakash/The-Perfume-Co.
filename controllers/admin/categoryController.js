const Category = require("../../models/categoryschema");
const Product = require("../../models/productschema");

const categoryInfo = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const categoryData = await Category.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments();
    const totalPages = Math.ceil(totalCategories / limit);
    res.render("category", {
      cat: categoryData,
      currentPage: page,
      totalPages: totalPages,
      totalCategories: totalCategories,
    });
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};

const addCategory = async (req, res) => {
  const { name, description } = req.body;
  try {
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    }
    const newCategory = new Category({
      name,
      description,
    });
    await newCategory.save();
    return res.json({ message: "category added successfully" });
  } catch (error) {
    console.error("Error adding category:", error);
    return res.status(500).json({ error: "internal server error" });
  }
};


// const addCategoryOffer=async(req,res)=>{
//   try {
      
//       const percentage=parseInt(req.body.percentage);
//       const categoryId=req.body.categoryId;
//       const category=await Category.findById(categoryId);
//       if(!category){
//           return res.status(404).json({status:false,message:'Category not found'})
//       }
//       const products=await Product.find({category:category._id});
//       const hasProductOffer=products.some((product)=>product.ProductOffer > percentage);
//       if(hasProductOffer){
//           return res.json({status:false,message:'Products within this category already have product offer'});
//       }
//       await Category.updateOne({_id:categoryId},{$set:{categoryOffer:percentage}});

//       for(const product of products){
//           product.ProductOffer=0;
//           product.salePrice=product.regularPrice;
//       }
//       res.json({status:true});
//   } catch (error) {
//       res.status(500).json({status:false,message:'Internal Server Error'});
//   }
// };


// const removeCategoryOffer=async(req,res)=>{
//   try {
//       const categoryId=req.body.categoryId;
//       console.log("Removing offer for category ID:", categoryId);  // Debugging line

//       const category=await Category.findById(categoryId);

//       if(!category){
//           return res.status(404).json({status:false,message:'Category not found'});
//       }

//       const percentage=category.categoryOffer;
//       const products=await Product.find({category:category._id});

//       if(products.length >0){
//           for(const product of products){
//               product.salePrice += Math.floor(product.regularPrice * (percentage/100));
//               product.ProductOffer=0;
//               await product.save();
//           }
//       }

//     //   if (products.length > 0) {
//     //     for (const product of products) {
//     //        product.salePrice = product.regularPrice;  // Reset to original price
//     //        product.ProductOffer = 0;
//     //        await product.save();
//     //     }
//     //  }
//       category.categoryOffer=0;
//       await category.save();
//       console.log("Offer removed successfully for:", category.name); // Debugging line
    
//       res.json({status:true});
//   } catch (error) {
//     console.error("Error in removeCategoryOffer:", error);
//       res.status(500).json({status:false, message:'Internal Server Error'});
//   }
// };







// const addCategoryOffer = async (req, res) => {
//   try {
//     const percentage = parseInt(req.body.percentage);
//     const categoryId = req.body.categoryId;
    
//     const category = await Category.findById(categoryId);
//     if (!category) {
//       return res.status(404).json({ status: false, message: 'Category not found' });
//     }
    
//     // Find all products in this category
//     const products = await Product.find({ category: category._id });
    
    
//     // Update category offer
//     await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });
    
//     // Update all products in this category
//     for (const product of products) {
//       // If product doesn't have its own offer, apply category offer
//      // if (product.productOffer === 0 || !product.productOffer) {
//       if (!product.productOffer || product.productOffer < percentage) {
//         const discountAmount = Math.floor(product.regularPrice * (percentage / 100));
//         product.salePrice = product.regularPrice - discountAmount;
//         await product.save();
//       }
//     }
    
//     res.json({ status: true });
//   } catch (error) {
//     console.error("Error adding category offer:", error);
//     res.status(500).json({ status: false, message: 'Internal Server Error' });
//   }
// };

// const removeCategoryOffer = async (req, res) => {
//   try {
//     const categoryId = req.body.categoryId;
//     console.log("Removing offer for category ID:", categoryId);
    
//     const category = await Category.findById(categoryId);
//     if (!category) {
//       return res.status(404).json({ status: false, message: 'Category not found' });
//     }
    
//     //const previousOfferPercentage = category.categoryOffer;
    
//     // Find all products in this category
//     const products = await Product.find({ category: category._id });
    
//     // Reset prices for products that don't have their own offer
//     if (products.length > 0) {
//       for (const product of products) {
//         if (product.productOffer === 0 || !product.productOffer) {
//           // Reset to original price only if they were using the category offer
//           product.salePrice = product.regularPrice;
//           await product.save();
//         }
//       }
//     }
    
//     // Reset category offer
//     category.categoryOffer = 0;
//     await category.save();
    
//     console.log("Offer removed successfully for:", category.name);
//     res.json({ status: true });
//   } catch (error) {
//     console.error("Error in removeCategoryOffer:", error);
//     res.status(500).json({ status: false, message: 'Internal Server Error' });
//   }
// };






// // This function should be called whenever a product is displayed to ensure correct pricing
// const getEffectivePrice = async (product) => {
//   try {
//     // Get the category
//     const category = await Category.findById(product.category);
    
//     // Default to regular price
//     let effectivePrice = product.regularPrice;
//     let effectiveDiscount = 0;
    
//     // Check for product offer
//     if (product.productOffer > 0) {
//       const productDiscount = Math.floor(product.regularPrice * (product.productOffer / 100));
//       effectiveDiscount = productDiscount;
//     }
//     // If no product offer or category offer is higher, use category offer
//     else if (category && category.categoryOffer > 0) {
//       const categoryDiscount = Math.floor(product.regularPrice * (category.categoryOffer / 100));
//       effectiveDiscount = categoryDiscount;
//     }
    
//     // Apply the discount
//     effectivePrice = product.regularPrice - effectiveDiscount;
    
//     return effectivePrice;
//   } catch (error) {
//     console.error("Error calculating effective price:", error);
//     return product.regularPrice; // Fall back to regular price on error
//   }
// };






const addCategoryOffer = async (req, res) => {
  try {
    const percentage = parseInt(req.body.percentage);
    const categoryId = req.body.categoryId;
    
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ status: false, message: 'Category not found' });
    }
    
    // Find all products in this category
    const products = await Product.find({ category: category._id });
    
    // Update category offer - allow any percentage
    await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });
    
    // Update all products in this category that don't have a higher product offer
    for (const product of products) {
      if (!product.productOffer || product.productOffer < percentage) {
        // Apply category offer as it's higher
        const discountAmount = Math.floor(product.regularPrice * (percentage / 100));
        product.salePrice = product.regularPrice - discountAmount;
        await product.save();
      }
      // If product offer is higher, keep the product's current sale price
    }
    
    res.json({ status: true });
  } catch (error) {
    console.error("Error adding category offer:", error);
    res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};

const removeCategoryOffer = async (req, res) => {
  try {
    const categoryId = req.body.categoryId;
    console.log("Removing offer for category ID:", categoryId);
    
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ status: false, message: 'Category not found' });
    }
    
    // Find all products in this category
    const products = await Product.find({ category: category._id });
    
    // For products using category offer (no product offer or lower product offer)
    if (products.length > 0) {
      for (const product of products) {
        if (!product.productOffer || product.productOffer < category.categoryOffer) {
          // These products were using category offer, reset to product offer or regular price
          if (product.productOffer > 0) {
            // Apply product offer instead
            const discountAmount = Math.floor(product.regularPrice * (product.productOffer / 100));
            product.salePrice = product.regularPrice - discountAmount;
          } else {
            // No product offer, reset to regular price
            product.salePrice = product.regularPrice;
          }
          await product.save();
        }
        // Products with higher product offer are unaffected
      }
    }
    
    // Reset category offer
    category.categoryOffer = 0;
    await category.save();
    
    console.log("Offer removed successfully for:", category.name);
    res.json({ status: true });
  } catch (error) {
    console.error("Error in removeCategoryOffer:", error);
    res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};





const getListCategory = async (req, res) => {
  try {
    let id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: false } });
    res.redirect("/admin/category");
  } catch (error) {
    res.redirect("/pageerror");
  }
};


const getUnlistCategory = async (req, res) => {
  try {
    let id = req.query.id;
    await Category.updateOne({ _id: id }, { $set: { isListed: true } });
    res.redirect("/admin/category");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const getEditCategory = async (req, res) => {
  try {
    const id = req.query.id;
    const category = await Category.findOne({ _id: id });
    res.render("edit-category", { category: category });
  } catch (error) {
    res.redirect("/pageerror");
  }
};



const editCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const { categoryName, description } = req.body;
    const existingCategory = await Category.findOne({ name: categoryName });

    if (existingCategory) {
      return res
        .status(400)
        .json({ error: "category exists, please choose another name" });
    }

    const updateCategory = await Category.findByIdAndUpdate(
      id,
      {
        name: categoryName,
        description: description,
      },
      { new: true },
    );

    if (updateCategory) {
      res.redirect("/admin/category");
    } else {
      res.status(404).json({ error: "Category not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};



module.exports = {
  categoryInfo,
  addCategory,
  addCategoryOffer,
  removeCategoryOffer,
  //getEffectivePrice,
  getListCategory,
  getUnlistCategory,
  getEditCategory,
  editCategory,
};
