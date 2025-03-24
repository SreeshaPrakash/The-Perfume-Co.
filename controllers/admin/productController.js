const Product = require("../../models/productschema");
const Category = require("../../models/categoryschema");
const Brand = require("../../models/brandschema");
const User = require("../../models/userschema");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp"); // Module to resize images
const mongoose = require("mongoose");

// Render Add Product Page
const getProductAddPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });
    res.render("product-add", { cat: category, brand: brand });
  } catch (error) {
    console.error("Error loading add product page:", error);
    res.redirect("/pageerror");
  }
};

// Add Product
const addProducts = async (req, res) => {
  try {
    const products = req.body;

    // Check if product already exists
    const productExists = await Product.findOne({
      productName: products.productName,
    });

    if (!productExists) {
      const images = [];

      if (req.files && req.files.length > 0) {
        const uploadDir = path.join(
          __dirname,
          "../../public/uploads/re-images",
        );

        // Resize and save images
        for (let i = 0; i < req.files.length; i++) {
          images.push(req.files[i].filename);
          // const originalImagePath = req.files[i].path;
          // //const resizedImagePath = path.join(uploadDir, req.files[i].filename);
          // //const resizedImagePath = path.join('public','uploads','re-images',req.files[i].filename)
          // const resizedImageName = `${Date.now()}-${req.files[i].filename}`;
          // const resizedImagePath = path.join(uploadDir, resizedImageName);

          // await sharp(originalImagePath)
          //     .resize({ width: 440, height: 440 })
          //     .toFile(resizedImagePath);

          // images.push(`{req.files[i].filename}`);
          //images.push(resizedImageName);
        }

        // for (let i = 0; i < req.files.length; i++) {
        //     const originalImagePath = req.files[i].path;
        //     const resizedImageName = `${Date.now()}-${req.files[i].filename}`;
        //     const resizedImagePath = path.join(uploadDir, resizedImageName);

        //     try {
        //         await sharp(originalImagePath)
        //             .resize({ width: 440, height: 440 })
        //             .jpeg({ quality: 80 }) // Convert to JPEG format
        //             .toFile(resizedImagePath);

        //         images.push(resizedImageName);
        //     } catch (sharpError) {
        //         console.error("Error resizing image:", sharpError);
        //     }
        // }
      }

      // Find the category ID
      const categoryId = await Category.findOne({ name: products.category });
      const brandId = await Brand.findOne({ brandName: products.brand });
      // console.log(brandId)
      if (!categoryId) {
        return res.status(400).json({ error: "Invalid category name" });
      }

      // Create new product
      const newProduct = new Product({
        productName: products.productName,
        description: products.description,
        brand: brandId._id,
        category: categoryId._id,
        regularPrice: products.regularPrice,
        salePrice: products.salePrice,
        createdOn: new Date(),
        quantity: products.quantity,
        size: products.size,
        productImage: images,
        status: "Available",
      });

      await newProduct.save();
      return res.redirect("/admin/addProducts");
    } else {
      return res
        .status(400)
        .json({
          error: "Product already exists, please try with another name",
        });
    }
  } catch (error) {
    console.error("Error saving product:", error);
    return res.redirect("/admin/pageerror");
  }
};




// const getAllProducts = async (req, res) => {
//   try {
//     const search = req.query.search || "";
//     const page = parseInt(req.query.page) || 1;
//     //const page = Number(req.query.page) || 1;
//     const limit = 10;
//     const skip = (page - 1) * limit;

//     const productData = await Product.aggregate([
//       {
//         $lookup: {
//           from: "brands",
//           localField: "brand",
//           foreignField: "_id",
//           as: "brandDetails",
//         },
//       },
//       {
//         $lookup: {
//           from: "categories",
//           localField: "category",
//           foreignField: "_id",
//           as: "categoryDetails",
//         },
//       },
//       {
//         $match: {
//           $or: [
//             { productName: { $regex: search, $options: "i" } },
//             { "brandDetails.name": { $regex: search, $options: "i" } },
//             { "categoryDetails.name": { $regex: search, $options: "i" } },
//           ],
//         },
//       },
//       {
//         $limit: limit,
//       },
//       {
//         $skip: skip,
//       },
//     ]);

    
//   //----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

//     // Calculate effective price for each product
//     for (const product of productData) {
//       // Check if category offer exists and is higher than product offer
//       const categoryOffer = product.categoryDetails[0]?.categoryOffer || 0;
//       const productOffer = product.productOffer || 0;
      
//       if (categoryOffer > productOffer) {
//         // Apply category offer
//         const discountAmount = Math.floor(product.regularPrice * (categoryOffer / 100));
//         product.salePrice = product.regularPrice - discountAmount;
//         product.effectiveOffer = categoryOffer;
//       } else if (productOffer > 0) {
//         // Apply product offer
//         const discountAmount = Math.floor(product.regularPrice * (productOffer / 100));
//         product.salePrice = product.regularPrice - discountAmount;
//         product.effectiveOffer = productOffer;
//       } else {
//         // No offer
//         product.salePrice = product.regularPrice;
//         product.effectiveOffer = 0;
//       }
//     }

//   //----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

//     const count = productData.length / limit;

//     const category = await Category.find({ isListed: true });
//     const brand = await Brand.find({ isBlocked: false });

//     if (category && brand) {
//       return res.render("products", {
//         data: productData,
//         currentPage: page,
//         totalPages: Math.ceil(count),
//         //totalPages : count,
//         cat: category,
//         brand: brand,
//       });
//     } else {
//       return res.render("page-404 ");
//     }
//   } catch (error) {
//     console.error("Error in getAllProducts:", error);
//     //res.redirect("/pagerror")
//     return res.status(500).json({ error: "Message" });
//   }
// };




const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const productData = await Product.aggregate([
      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brandDetails",
        },
      },
      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      {
        $match: {
          $or: [
            { productName: { $regex: search, $options: "i" } },
            { "brandDetails.name": { $regex: search, $options: "i" } },
            { "categoryDetails.name": { $regex: search, $options: "i" } },
          ],
        },
      },
      {
        $limit: limit,
      },
      {
        $skip: skip,
      },
    ]);

    // Process each product to ensure correct pricing based on offers
    for (const product of productData) {
      // Get category offer percentage
      const categoryOffer = product.categoryDetails[0]?.categoryOffer || 0;
      
      // Get product offer percentage
      const productOffer = product.productOffer || 0;
      
      // Calculate effective offer (the higher of the two)
      const effectiveOfferPercentage = Math.max(categoryOffer, productOffer);
      
      // Calculate the sale price based on the effective offer
      if (effectiveOfferPercentage > 0) {
        const discountAmount = Math.floor(product.regularPrice * (effectiveOfferPercentage / 100));
        product.salePrice = product.regularPrice - discountAmount;
        
        // Add a displayOffer field to show which offer is being applied
        if (productOffer >= categoryOffer) {
          product.displayOffer = `Product: ${productOffer}%`;
        } else {
          product.displayOffer = `Category: ${categoryOffer}%`;
        }
      } else {
        // No offers
        product.salePrice = product.regularPrice;
        product.displayOffer = "No Offer";
      }
    }

    const count = productData.length / limit;

    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    if (category && brand) {
      return res.render("products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count),
        cat: category,
        brand: brand,
      });
    } else {
      return res.render("page-404");
    }
  } catch (error) {
    console.error("Error in getAllProducts:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};




const addProductOffer = async (req, res) => {
  try {
    const { productId, percentage } = req.body;
    const findProduct = await Product.findOne({ _id: productId });
    const findCategory = await Category.findOne({ _id: findProduct.category });
    
    if (findCategory.categoryOffer > percentage) {
      return res.json({ status: false, Cmessage: 'This product\'s category already has a higher category offer' });
    }

    // Calculate the discounted price by SUBTRACTING the discount amount
    const discountAmount = Math.floor(findProduct.regularPrice * (percentage / 100));
    findProduct.salePrice = findProduct.regularPrice - discountAmount;
    findProduct.productOffer = parseInt(percentage);
    
    await findProduct.save(); 
    res.json({ status: true });
  } catch (error) {
    console.error("Error adding product offer:", error);
    res.status(500).json({ status: false, message: 'Internal Server Error' });
  }
};

const removeProductOffer = async (req, res) => {
  try {
    const { productId } = req.body;
    
    // Find the product
    const findProduct = await Product.findOne({ _id: productId });
    if (!findProduct) {
      return res.status(404).json({ status: false, message: "Product not found" });
    }

    // If no offer exists, return early
    if (findProduct.productOffer === 0) {
      return res.json({ status: false, message: "No offer to remove" });
    }

    // Restore the original price
    findProduct.salePrice = findProduct.regularPrice;  // Reset price to regular price
    findProduct.productOffer = 0; // Remove the offer
    
    await findProduct.save();
    res.json({ status: true });
  } catch (error) {
    console.error("Error removing product offer:", error);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};



const blockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    //console.log("Blocking product ID:", id);
    await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/products");
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};

const unblockProduct = async (req, res) => {
  try {
    let id = req.query.id;
    await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/products");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const getEditProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const product = await Product.findOne({ _id: id });

    if (!product) {
      return res.redirect("/pageerror"); // Redirect if product is not found
    }

    const category = await Category.find({});
    const brand = await Brand.find({});

    res.render("edit-product", {
      product: product,
      cat: category,
      brand: brand,
    });
  } catch (error) {
    console.error("Error fetching product for edit:", error);
    res.redirect("/pageerror, occured while getEditProduct");
  }
};


const editProduct = async (req, res) => {
  try {
      const id = req.params.id;
      const product = await Product.findById(id);
      if (!product) {
          return res.status(404).json({ error: "Product not found" });
      }

      const data = req.body;

      console.log("1234567890", data)

      // Validate uniqueness of product name
      const existingProduct = await Product.findOne({
          productName: data.productName,
          _id: { $ne: id }, 
      });

      if (existingProduct) {
          return res.status(400).json({ error: "Product name already exists." });
      }

      const brandId = mongoose.Types.ObjectId.isValid(data.brand)
          ? new mongoose.Types.ObjectId(data.brand)
          : product.brand;
      const categoryId = mongoose.Types.ObjectId.isValid(data.category)
          ? new mongoose.Types.ObjectId(data.category)
          : product.category;

      let updatedImages = [...product.productImage];

      // ✅ If new images are uploaded, replace old ones
      if (req.files && req.files.length > 0) {
          updatedImages = [...product.productImage,...req.files.map((file) => file.filename)];
      }

      // ✅ Ensure at least one image is always available
      if (updatedImages.length === 0) {
          return res.status(400).json({ error: "At least one image is required" });
      }

      const updateFields = {
          productName: data.productName,
          description: data.description,
          brand: brandId,
          category: categoryId,
          regularPrice: data.regularPrice,
          salePrice: data.salePrice,
          quantity: data.quantity,
          size: data.size,
          productImage: updatedImages, 
      };

      await Product.findByIdAndUpdate(id, updateFields, { new: true });

      return res.redirect("/admin/products");
  } catch (error) {
      console.error("Error updating product:", error);
      return res.status(500).json({ error: "Internal server error" });
  }
};


const deleteSingleImage = async (req, res) => {
  try {
      const { imageNameToServer, productIdToServer } = req.body;

      const product = await Product.findById(productIdToServer);
      if (!product) {
          return res.status(404).json({ error: "Product not found" });
      }

      // Remove image from database
      await Product.findByIdAndUpdate(productIdToServer, {
          $pull: { productImage: imageNameToServer },
      });

      // Remove image from file storage
      const imagePath = path.join(__dirname, "../../public/uploads/re-images", imageNameToServer);
      if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
      }
      
      res.json({ status: true, message: "Image deleted successfully" });
  } catch (error) {
      console.error("Error deleting image:", error);
      res.json({ status: false });
  }
};


// Update product stock in productController.js
const updateProductStock = async (req, res) => {
  try {
    const { productId, newQuantity } = req.body;
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    product.quantity = newQuantity;
    product.status = newQuantity > 0 ? "Available" : "out of stock";

    await product.save();
    res.json({ success: true, message: "Stock updated successfully" });
  } catch (error) {
    console.error("Error updating stock:", error);
    res.status(500).json({ message: "Server error" });
  }
};


module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  addProductOffer,
  removeProductOffer,
  blockProduct,
  unblockProduct,
  getEditProduct,
  editProduct,
  deleteSingleImage,
  updateProductStock
};
