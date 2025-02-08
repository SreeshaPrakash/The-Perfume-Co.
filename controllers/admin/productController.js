// const Product = require('../../models/productschema')
// const Category = require("../../models/categoryschema")
// const Brand = require("../../models/brandschema")
// const User = require("../../models/userschema")
// const fs = require("fs")
// const path = require('path')
// const sharp = require("sharp")  //module to resize image

// const getProductAddPage = async(req,res)=>{
//     try {
//         const category = await Category.find({isListed:true})
//         const brand = await Brand.find({isBlocked :false})
//         res.render("product-add",{
//             cat: category,
//             brand: brand,

//         })

//     } catch (error) {
//         res.redirect("/pageerror")
        
//     }
// }




// const addProducts = async(req,res)=>{
//     try {
//         const products = req.body
//         const productExists = await Product.findOne({
//             productName:products.productName

//         })


//         if(!productExists){
//             const images = []

//             if(req.files && req.files.length>0){
//                 for(let i=0;i<req.files.length;i++){
//                     const originalImagePath = req.files[i].path
//                     const resizedImagesPath = path.join('public','uploads','re-images',req.files[i].filename)
//                     await sharp(originalImagePath).resize({width:440, height:440}).toFile(resizedImagesPath)
//                     images.push(req.files[i].filename)

//                 }
//             }


//             const categoryId = await Category.findOne({name:products.category})

//             if(!categoryId){
//                 return res.status(400).join("Invalid category name")
                
//             }

//             const newProduct = new Product ({
//                 productName:products.productName,
//                 description:products.description,
//                 brand:products.brand,
//                 category :categoryId._id,
//                 regularPrice:products.regularPrice,
//                 salePrice:products.salePrice,
//                 createdOn: new Date(),
//                 quantity : products.quantity,
//                 size: products.size,
//                 color: products.color,
//                 productImage : images,
//                 status: 'Available',

//             })


//             await newProduct.save()
//             return res.redirect("/admin/addProducts")


//         }else{
//             return res.status(400).json("product already exist, please try with another name")
//         }

//     } catch (error) {
//         console.error("error saving product",error)
//         return res.redirect("/admin/pageerror")
//     }
// }


// module.exports = {
//     getProductAddPage,
//     addProducts,

// }








const Product = require('../../models/productschema');
const Category = require("../../models/categoryschema");
const Brand = require("../../models/brandschema");
const User = require("../../models/userschema");
const fs = require("fs");
const path = require('path');
const sharp = require("sharp"); // Module to resize images

// Render Add Product Page
const getProductAddPage = async (req, res) => {
    try {
        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });
        res.render("product-add", { cat: category, brand: brand });
    } catch (error) {
        console.error("Error loading add product page:", error);
        res.redirect("/admin/pageerror");
    }
};

// Add Product
const addProducts = async (req, res) => {
    try {
        const products = req.body;

        // Check if product already exists
        const productExists = await Product.findOne({ productName: products.productName });

        if (!productExists) {
            const images = [];

            if (req.files && req.files.length > 0) {
                const uploadDir = path.join(__dirname, "../../public/uploads/re-images");

                // ✅ Ensure the directory exists
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // Resize and save images
                for (let i = 0; i < req.files.length; i++) {
                    const originalImagePath = req.files[i].path;
                    const resizedImagePath = path.join(uploadDir, req.files[i].filename);

                    await sharp(originalImagePath)
                        .resize({ width: 440, height: 440 })
                        .toFile(resizedImagePath);

                    images.push(req.files[i].filename);
                }
            }

            // Find the category ID
            const categoryId = await Category.findOne({ name: products.category });
            if (!categoryId) {
                return res.status(400).json({ error: "Invalid category name" });
            }

            // Create new product
            const newProduct = new Product({
                productName: products.productName,
                description: products.description,
                brand: products.brand,
                category: categoryId._id,
                regularPrice: products.regularPrice,
                salePrice: products.salePrice,
                createdOn: new Date(),
                quantity: products.quantity,
                size: products.size,
                color: products.color,
                productImage: images,
                status: "Available",
            });

            await newProduct.save();
            return res.redirect("/admin/addProducts");
        } else {
            return res.status(400).json({ error: "Product already exists, please try with another name" });
        }
    } catch (error) {
        console.error("Error saving product:", error);
        return res.redirect("/admin/pageerror");
    }
};


const getAllProducts = async(req,res)=>{
    try {
      
        const search = req.query.search || ""
        const page = req.query.page || 1
        const limit = 5
        const productData = await Product.find({
            $or:[

                {productName :{$regex :new RegExp(". *"+search +".*","i")}},
                {brand :{$regex :new RegExp(".*"+search +".*","i")}},

            ],
        })
        .limit(limit*1).skip((page-1)*limit).populate('category').exec()

        const count = await Product.find({
            $or:[
                {productName :{$regex :new RegExp(".*"+search+".*","i")}},
                {brand:{$regex: new RegExp(".*"+search+".*","i")}},
            ],
        }).countDocuments()


        const category = await Category.find({isListed:true})
        const brand = await Brand.find({isBlocked: false})

        if(category && brand){
            res.render("products",{
                data:productData,
                currentPage : page,
                totalPages : page,
                totalPages : Math.ceil(count/limit),
                cat : category,
                brand : brand,


            })
        }
else{
    res.render("page-404 ")

}

    } catch (error) {
        res.redirect("/pageerror")
    }
}


module.exports = { getProductAddPage,
                    addProducts ,
                    getAllProducts
};

