const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const productController = require("../controllers/user/productController");
const profileController = require('../controllers/user/profileController');
const cartController = require("../controllers/user/cartController")
const orderController = require("../controllers/user/orderController")
const passport = require("passport");
const upload = require("../helpers/multer");
const {userAuth } = require("../middlewares/auth");
const auth = require('../middlewares/auth')
const address = require('../models/addressschema')
const { addAddress } = require("../controllers/user/profileController")



router.get("/", userController.loadHomepage);
router.get("/pageNotFound", userController.pageNotFound);
router.get("/signup", userController.loadSignUp);
router.post("/signup", userController.signup);
router.post("/verify-otp", userController.verifyOtp);
router.post("/resend-otp", userController.resendOtp);

router.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);
router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  (req, res) => {
    req.session.user = req.user
    res.redirect("/");
  },
);

router.get("/login", userController.loadLogin);
router.post("/login", userController.login);

router.get("/logout", userController.logout);

//router.get('/',userController.getHomePage)
router.post("/upload", upload.single("image"), userController.uploadProduct);

//product management
router.get("/productDetails", productController.productDetails);
router.get('/shop',productController.loadshop)

//cart management
router.get('/cart',cartController.loadCart)
router.post('/addToCart/:productId',userAuth,cartController.addToCart)
router.patch('/increment/:itemId',userAuth,cartController.increaseQuantity); 
router.patch('/decrement/:itemId',userAuth,cartController.decreaseQuantity);
router.post('/remove/:itemId',userAuth,cartController.removeItem);




//profile management

router.get('/forgot-password',profileController.getForgotPassword )
router.post('/forgot-email-valid',profileController.forgotEmailValid)
router.post('/forgotPassword-otp',profileController.verifyForgotPassOtp)
router.get('/reset-password',profileController.getResetPassword)
router.post('/resend-forgot-otp',profileController.resendOtp)
router.post('/reset-password',profileController.postNewPassword)
router.get("/userProfile",userAuth,profileController.userProfile)

//account management
router.get('/account',userAuth,profileController.getAccount)
router.put('/account',userAuth,profileController.updateAccount)

//address management
router.get('/address',userAuth,profileController.getAddress)
router.get('/add-address',userAuth,profileController.addAddress)
router.post('/add-address',userAuth,profileController.postAddress)
router.get('/edit-address/:id',userAuth,profileController.editAddress)
router.post("/edit-address",userAuth,profileController.updateAddress);
router.delete('/address/:id',userAuth, profileController.deleteAddress);



//checkout management
router.get('/checkout',userAuth,orderController.getCheckoutPage);



module.exports = router;
