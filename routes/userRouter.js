const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const productController = require("../controllers/user/productController");
const profileController = require('../controllers/user/profileController');
const cartController = require("../controllers/user/cartController")
const orderController = require("../controllers/user/orderController")
const wishlistController = require("../controllers/user/wishlistController")
const walletController = require("../controllers/user/walletController")
const { createOrder, getOrderDetails } = require('../controllers/user/orderController');

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
/router.post('/addToCart/:productId',userAuth,cartController.addToCart)
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



//checkout and order management
router.get('/checkout',userAuth,orderController.getCheckoutPage);


//coupon side
router.get("/get-available-coupons", userAuth, orderController.getAvailableCoupons);
router.post("/apply-coupon", userAuth, orderController.applyCoupon);



//router.get('/order-details/:orderId', gets);

router.post('/create-order',userAuth, createOrder);
router.get("/order-placed", userAuth, orderController.getOrderPlacedPage);

router.post('/payment-failed', userAuth, orderController.handlePaymentFailed);


router.get('/orders',orderController.orderDetail)
router.get('/viewOrder',userAuth,orderController.viewOrder)
router.post('/cancelOrder',userAuth,orderController.cancelOrder)
//router.get("/viewMoreOrder",userAuth, orderController.viewOrder);

router.post('/returnOrder',userAuth, orderController.returnOrder);


// //wishlist management
 router.get("/wishlist",userAuth,wishlistController.getWishlist)
router.post('/wishlist/add',userAuth, wishlistController.addToWishlist)
router.post("/wishlist/remove",userAuth,wishlistController.removeFromWishlist)
router.post('/add/:productId', wishlistController.addToCart);
//router.post('/cart/add', wishlistController.addToCart);
//router.post('/cart/add', userAuth, wishlistController.addToCart);


//wallet management

router.get('/user-wallet', userAuth, walletController.loadWalletPage);
router.get('/user-wallet', userAuth, walletController.loadWalletPage);
// router.post('/add-money-to-wallet', userAuth, walletController.addMoneyToWallet);
// router.post('/verify-payment', userAuth, walletController.verifyPayment);
router.post('/wallet/add-money', userAuth, walletController.addMoneyToWallet);
router.post('/wallet/verify-payment', userAuth, walletController.verifyPayment);
// Add this to your routes file
router.post('/process-wallet-payment', userAuth, walletController.processWalletPayment);




//invoice
router.get('/download-invoice/:orderId',userAuth, orderController.downloadInvoice);
router.post('/initiate-payment', userAuth, orderController.initiatePayment);
router.post('/verify-payment', userAuth, orderController.verifyPayment);



module.exports = router;
