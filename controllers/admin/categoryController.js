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
  let { name, description } = req.body;

  try {
    // Convert input name to lowercase for case-insensitive comparison
    name = name.trim().toLowerCase();

    const existingCategory = await Category.findOne({ name: { $regex: `^${name}$`, $options: "i" } });

    if (existingCategory) {
      return res.status(400).json({ error: "Category already exists" });
    }

    const newCategory = new Category({ name, description });
    await newCategory.save();

    return res.json({ message: "Category added successfully" });
  } catch (error) {
    console.error("Error adding category:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};




const addCategoryOffer = async (req, res) => {
  try {
    const percentage = parseInt(req.body.percentage);
    const categoryId = req.body.categoryId;
    
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ status: false, message: 'Category not found' });
    }
    await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } });    
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
