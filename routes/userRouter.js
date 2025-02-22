const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");
const upload = require("../helpers/multer");
const {userAuth } = require("../middlewares/auth");
const productController = require("../controllers/user/productController");
const profileController = require('../controllers/user/profileController');
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



//profile management

router.get('/forgot-password',profileController.getForgotPassword )
router.post('/forgot-email-valid',profileController.forgotEmailValid)
router.post('/forgotPassword-otp',profileController.verifyForgotPassOtp)
router.get('/reset-password',profileController.getResetPassword)
router.post('/resend-forgot-otp',profileController.resendOtp)
router.post('/reset-password',profileController.postNewPassword)
router.get("/userProfile",profileController.userProfile)

//account management
router.get('/account',profileController.getAccount)
router.put('/account',profileController.updateAccount)

//address management
router.get('/address',profileController.getAddress)
router.get('/add-address',profileController.addAddress)
router.post('/add-address',profileController.postAddress)
router.get('/edit-address/:id',profileController.editAddress)
router.post("/edit-address",profileController.updateAddress);
//router.post('/user/address/edit/:id', profileController.updateAddress);

//router.post('/address',profileController.deleteAddress)
router.delete('/address/:id', profileController.deleteAddress);



module.exports = router;
