const Brand = require("../../models/brandschema");
const Product = require("../../models/productschema");

const getBrandPage = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;
    const brandData = await Brand.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const totalBrands = await Brand.countDocuments();
    const totalPages = Math.ceil(totalBrands / limit);
    const reverseBrand = brandData.reverse();
    res.render("brands", {
      data: reverseBrand,
      currentPage: page,
      totalPages: totalPages,
      totalBrands: totalBrands,
    });
  } catch (error) {
    res.redirect("/pageerror");
  }
};




// const addBrand = async (req, res) => {
//   try {

//     const brand = req.body.name;
//     const findBrand = await Brand.findOne({ brand });
//     if (!findBrand) {
//       if (!req.file) {
//         console.log("File not uploaded!");
//         return res.status(400).send("No file uploaded.");
//       }

//       const image = req.file ? req.file.filename : null;
      
//       const newBrand = new Brand({
//         brandName: brand,
//         brandImage: image,
//       });
//       await newBrand.save();
//       res.redirect("/admin/brands");
//     } else {
//       console.log("Brand already exists!");
//     }
//   } catch (error) {
//     console.error("Error in addBrand:", error);
//     res.redirect("/pageerror");
//   }
// };

const addBrand = async (req, res) => {
  try {
    const brand = req.body.name.trim();

    // Case-insensitive check for existing brand
    const findBrand = await Brand.findOne({ brandName: { $regex: `^${brand}$`, $options: "i" } });

    if (findBrand) {
      return res.status(400).json({ error: "Brand already exists!" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded!" });
    }

    const image = req.file.filename;

    const newBrand = new Brand({
      brandName: brand,
      brandImage: [image], // Ensure this matches your schema
    });

    await newBrand.save();

    return res.json({ message: "Brand added successfully!" }); // ✅ Send JSON response
  } catch (error) {
    console.error("Error in addBrand:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};




const blockBrand = async (req, res) => {
  try {
    const id = req.query.id;
    await Brand.updateOne({ _id: id }, { $set: { isBlocked: true } });
    res.redirect("/admin/brands");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const unBlockBrand = async (req, res) => {
  try {
    const id = req.query.id;
    await Brand.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/brands");
  } catch (error) {
    res.redirect("/pageerror");
  }
};

const deleteBrand = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).redirect("/pageerror");
    }
    await Brand.deleteOne({ _id: id });
    res.redirect("/admin/brands");
  } catch (error) {
    console.log("Error deleting brand", error);
    res.status(500).redirect("/pageerror");
  }
};

module.exports = {
  getBrandPage,
  addBrand,
  blockBrand,
  unBlockBrand,
  deleteBrand,
};
