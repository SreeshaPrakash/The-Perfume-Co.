const express = require("express");
const router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");
const upload = require("../helpers/multer");
const { userAuth } = require("../middlewares/auth");
const productController = require("../controllers/user/productController")

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

router.get("/productDetails",productController.productDetails)


module.exports = router;
