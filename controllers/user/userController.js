const User = require("../../models/userschema");
const Category = require("../../models/categoryschema")
const Product = require("../../models/productschema")
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");


const pageNotFound = async (req, res) => {
  try {
    res.render("page-404");
  } catch (error) {
    console.error("error rendering 404 page", error);
    res.redirect("/pageNotFound");
  }
};

const loadHomepage = async (req, res) => {
  
  try {
    
    const userId = req.session.userId;
    const categories = await Category.find({isListed : true})
    let productData = await Product.find({
      isBlocked:false,
      category :{ $in : categories.map(category=>category._id)},
      quantity:{$gt : 0}
    })

    productData.sort((a,b)=>new Date(b.createdOn)-new Date(a.createdOn))
    productData = productData.slice(0,4)
    // const recentProducts = productData.slice(0, 4);


    const products = await Product.find(); // Fetch all products from MongoDB
    //res.render("home", { products }); 

    if (userId) {
      const userData = await User.findById(userId);
  
      // return res.render("home", { user: userData, products:recentProducts });
      return res.render("home", { user: userData, products:productData });
    }
    else{
    // return res.render("home", {products : products});
    return res.render("home", {products : productData});
    }
  } catch (error) {
    console.log("home page not found", error);
    res.status(500).send("server error");
  }
};


// const loadHomepage = async (req, res) => {
//   try {
//     console.log("helleo ")
//     console.log("req.files",req.files);
//     console.log("req.body",req.body); 
    
//     const userId = req.session.userId;
//     let userData = null;

//     if (userId) {
//          userData = await User.findById(userId);
//     }

//     const products = await Products.find();
     
//     return res.render("home", { user: userData, products});


//     //else{
//    // return res.render("home");
//     //}
//   } catch (error) {
//     console.error("home page not found", error);
//     res.status(500).send("server error");
//   }
// };


const loadSignUp = async (req, res) => {
  try {
    return res.render("signup");
  } catch (error) {
    console.log("Home page not loading:", error);
    res.status(500).send("server error");
  }
};

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "verify your account",
      text: `Your OTP is ${otp}`,
      html: `<b>Your otp: ${otp} </b>`,
    });
    return info.accepted.length > 0;
  } catch (error) {
    console.error("error sending email", error);
    return false;
  }
}

const signup = async (req, res) => {
  try {
    const { firstName, lastName, phone, email, password, confirmPassword } =
      req.body;

    if (password !== confirmPassword) {
      return res.render("signup", { message: "passwords do not match" });
    }

    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.render("signup", {
        message: "user with this mail already exists",
      });
    }

    const otp = generateOtp();
    console.log("otp:", otp);

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.json({ success: false, message: "email-error" });
    }

    req.session.userOtp = otp;
    req.session.userData = { firstName, lastName, phone, email, password };

    return res.render("verify-otp");
  } catch (error) {
    console.error("signup error", error);
    //res.redirect("/pageNotFound")
    res.status(500).render("page-404");
  }
};

const securePassword = async (password) => {
  try {
    return await bcrypt.hash(password, 10);
  } catch (error) {
    console.error("error hashing password:", error);

    throw error;
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    console.log("Received OTP:", otp);

    if (otp == req.session.userOtp) {
      const user = req.session.userData;

      //console.log("Session userData:", user);

      if (!user.firstName || !user.lastName) {
        console.error("Error: firstName or lastName is missing");
        return res.status(400).json({
          success: false,
          message: "First name and last name are required",
        });
      }

      if (!user.password) {
        console.error("Error: user.password is undefined");
        return res
          .status(400)
          .json({ success: false, message: "Password is missing" });
      }

      const passwordHash = await securePassword(user.password);
      //console.log("Hashed Password Before Saving:", passwordHash);

      const saveUserData = new User({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: passwordHash,
      });

      //console.log(user.firstName, user.lastName);

      const savedUser = await saveUserData.save();
      //console.log("Saved User:", savedUser);

      req.session.user = savedUser._id;

      res.json({ success: true, redirectUrl: "/" });
    } else {
      res
        .status(400)
        .json({ success: false, message: "Invalid OTP, please try again" });
    }
  } catch (error) {
    console.error("Error verifying OTP", error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};

const resendOtp = async (req, res) => {
  try {
    //const {email} = req.session.userData;

    if (!req.session.userData || !req.session.userData.email) {
      return res
        .status(400)
        .json({ success: false, message: "email not found in session" });
    }

    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSent = await sendVerificationEmail(
      req.session.userData.email,
      otp,
    );

    if (emailSent) {
      console.log("Resend OTP", otp);
      return res
        .status(200)
        .json({ success: true, message: "otp resend successfully" });
    }

    return res.status(500).json({
      success: false,
      message: "failed to resend otp. Please try again",
    });
  } catch (error) {
    console.error("Error resending OTP", error);
    res.status(500).json({
      success: false,
      message: "Internal server error.Please try again ",
    });
  }
};

const loadLogin = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.render("login");
    } else {
      res.redirect("/");
    }
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await User.findOne({
      isAdmin: 0,
      email: email,
    });

    if (!findUser) {
      return res.render("login", { message: "User not found" });
    }
    if (findUser.isBlocked) {
      return res.render("login", { message: "User is blocked by admin" });
    }

    //console.log("stored Password:",findUser.password)
    const passwordMatch = await bcrypt.compare(password, findUser.password);
    // console.log('PassWord:', passwordMatch)
    if (!passwordMatch) {
      return res.render("login", { message: "incorrect password" });
    }
    //console.log("findUser._id:",findUser._id)
    req.session.userId = findUser._id;
    // req.session.user = findUser._id
    //console.log("user logged in:",req.session.userId)
    res.redirect("/");
  } catch (error) {
    console.error("login error", error);
    res.render("login", { message: "login failed . Please try again later" });
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("session destruction error", err.message);
        return res.redirect("/pageNotFound");
      }
      return res.redirect("/login");
    });
  } catch (error) {
    console.log("Logout error", error);
    res.redirect("/pageNotFound");
  }
};


// const getHomePage = async(req,res)=>{
//   try{
//     const products = await Products.find()
//     res.render('home',{products})
//   }
//   catch (error){
//     console.error(error)
//     res.status(500).end('Servae error')
//   }
// }


const uploadProduct = async(req,res)=>{
  try {
    
    if(!req.file){
      console.log("no file uploaded")
      return res.status(400).json({message : " Please upload an image"})
    }


    console.log("uploaded file:",req.file)

    const newProduct = new Product({
      name : req.body.name,
      image : "/uploads" + req.file.filename,
      description : req.body.description,
      price : req.body.price,
    })

    await newProduct.save()
    res.redirect("/")


  } catch (error) {
    cconsole.log("Error uploading product:",error)
    res.status(500).send("server error")
    
  }
}

module.exports = {
  loadHomepage,
  pageNotFound,
  loadSignUp,
  signup,
  verifyOtp,
  resendOtp,
  loadLogin,
  login,
  logout,
  uploadProduct,
  // getHomePage
};
