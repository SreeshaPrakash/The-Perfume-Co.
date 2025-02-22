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

const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = parseInt(req.query.page) || 1;
    //const page = Number(req.query.page) || 1;
    const limit = 5;
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

    const count = productData.length / limit;

    const category = await Category.find({ isListed: true });
    const brand = await Brand.find({ isBlocked: false });

    if (category && brand) {
      return res.render("products", {
        data: productData,
        currentPage: page,
        totalPages: Math.ceil(count),
        //totalPages : count,
        cat: category,
        brand: brand,
      });
    } else {
      return res.render("page-404 ");
    }
  } catch (error) {
    console.error("Error in getAllProducts:", error);
    //res.redirect("/pagerror")
    return res.status(500).json({ error: "Message" });
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
    // console.log(req.body);

    const id = req.params.id;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const files = [
      req.body.image1,
      req.body.image2,
      req.body.image3,
      req.body.image4,
    ];
    // console.log(files);

    const data = req.body;

    // Validate uniqueness of product name
    const existingProduct = await Product.findOne({
      productName: data.productName,
      _id: { $ne: id }, // Exclude the current product
    });
    if (existingProduct) {
      return res
        .status(400)
        .json({
          error:
            "Product with this name already exists. Please try another name.",
        });
    }

    // Convert brand & category to ObjectId
    const brandId = mongoose.Types.ObjectId.isValid(data.brand)
      ? new mongoose.Types.ObjectId(data.brand)
      : product.brand;
    const categoryId = mongoose.Types.ObjectId.isValid(data.category)
      ? new mongoose.Types.ObjectId(data.category)
      : product.category;

    let updatedImages = [...product.productImage]; // Preserve existing images

    if (!req.files || req.files.length === 0) {
      // No new images uploaded, keep old images
      const updateFields = {
        productName: data.productName,
        description: data.description,
        brand: brandId,
        category: categoryId,
        regularPrice: data.regularPrice,
        salePrice: data.salePrice,
        quantity: data.quantity,
        size: data.size,
        images: updatedImages,
      };

      await Product.findByIdAndUpdate(id, updateFields, { new: true });
      return res.status(200).json({ message: "Product updated successfully " });
    } else {
      // New images uploaded, update them
      req.files.forEach((file, index) => {
        updatedImages[index] = file.path; // Replace only if a new image is uploaded
      });

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
      return res
        .status(200)
        .json({ message: "Product updated successfully with new images" });
    }
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer } = req.body;

    const product = await Product.findByIdAndUpdate(productIdToServer, {
      $pull: { productImage: imageNameToServer },
    });
    const imagePath = path.join(
      "public",
      "uploads",
      "re-images",
      imageNameToServer,
    );
    if (fs.existsSync(imagePath)) {
      await fs.unlinkSync(imagePath);
      console.log(`Image ${imageNameToServer} deleted successfully`);
    } else {
      console.log(`image ${imageNameToServer} not found`);
    }
    res.send({ status: true });
  } catch (error) {
    res.redirect("/pageerror");
  }
};

module.exports = {
  getProductAddPage,
  addProducts,
  getAllProducts,
  blockProduct,
  unblockProduct,
  getEditProduct,
  editProduct,
  deleteSingleImage,
};
