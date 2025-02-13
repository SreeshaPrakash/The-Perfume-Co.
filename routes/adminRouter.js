const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin/adminController");
const customerController = require("../controllers/admin/customerController");
const categoryController = require("../controllers/admin/categoryController")
const brandController = require("../controllers/admin/brandController")
const productController = require("../controllers/admin/productController")
const { userAuth, adminAuth } = require("../middlewares/auth");
const multer = require("multer")
const storage = require("../helpers/multer")
const upload = require("../helpers/multer")
//const upload = multer({storage:storage})
//const upload= require("../middlewares/multer");





router.get("/pageerror", adminController.pageerror);
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/", adminAuth, adminController.loadDashboard);
router.get("/logout", adminController.logout);

router.get("/users", adminAuth, customerController.customerInfo);
router.get("/blockCustomer", adminAuth, customerController.customerBlocked);
router.get("/unblockCustomer", adminAuth, customerController.customerunBlocked);
//category management
router.get("/category",adminAuth,categoryController.categoryInfo)
router.post("/addCategory",adminAuth,categoryController.addCategory)

//router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer)
//router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer)
router.get("/listCategory",adminAuth,categoryController.getListCategory)
router.get("/unlistCategory",adminAuth,categoryController.getUnlistCategory)
router.get("/editCategory",adminAuth,categoryController.getEditCategory)
router.post("/editCategory",adminAuth,categoryController.getEditCategory)
router.post("/editCategory/:id",adminAuth,categoryController.editCategory)
//brand mangement
router.get("/brands",adminAuth,brandController.getBrandPage)
router.post("/addBrand",adminAuth,upload.single("image"),brandController.addBrand)
router.get("/blockBrand",adminAuth,brandController.blockBrand)
router.get("/unblockBrand",adminAuth,brandController.unBlockBrand)
router.get("/deleteBrand", adminAuth,brandController.deleteBrand)

//product management
router.get("/addProducts",adminAuth,productController.getProductAddPage)
router.post("/addProducts",adminAuth,upload.array("images",4),productController.addProducts)
router.get("/products",adminAuth,productController.getAllProducts)


router.get("/blockProduct",adminAuth,productController.blockProduct)
router.get("/unblockProduct",adminAuth,productController.unblockProduct)
router.get("/editProduct",adminAuth,productController.getEditProduct)
router.post("/editProduct/:id",adminAuth,upload.array("images",4),productController.editProduct)
router.post("/deleteImage",adminAuth,productController.deleteSingleImage)
router.post("/upload",adminAuth, upload.single("image"), (req, res) => {
    // console.log(req.body); // Should contain form fields
    // console.log(req.file); // Should contain file data

    if (!req.file) {
        return res.status(400).json({ message: "File not uploaded" });
    }

    res.status(200).json({ message: "File uploaded successfully", file: req.file });
});




module.exports = router;
