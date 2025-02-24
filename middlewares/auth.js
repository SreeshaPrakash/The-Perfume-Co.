// const User = require("../models/userschema");


// const userAuth = (req, res, next) => {
//   console.log("Session User ID:", req.session.user); // Debugging
//   if (req.session.user) {
//     User.findById(req.session.user)
//       .then((data) => {
//         if (data) {
//           console.log("User Found:", data);
//           if (!data.isBlocked) {
//             return next();
//           } else {
//             console.log("User is blocked");
//           }
//         } else {
//           console.log("User not found in DB");
//         }
//         res.redirect("/login");
//       })
//       .catch((error) => {
//         console.log("Error in userAuth middleware:", error);
//         res.status(500).send("Internal server error");
//       });
//   } else {
//     console.log("No session user found");
//     res.redirect("/login");
//   }
// };




// const adminAuth = (req, res, next) => {
//   User.findOne({ isAdmin: true })
//     .then((data) => {
//       if (data) {
//         next();
//       } else {
//         res.redirect("/admin/login");
//       }
//     })

//     .catch((error) => {
//       console.log("error in adminAuth middleware", error);
//       res.status(500).send("internal server error");
//     });
// };

// module.exports = {
//   userAuth,
//   adminAuth,
// };







const User = require("../models/userschema");

const userAuth = async (req, res, next) => {
  //console.log("Session User:", req.session.user);
  try {
    if (!req.session.user) {
      console.log("User not logged in. Redirecting...");
      return res.redirect("/login"); // User not logged in
    }
  

    const user = await User.findById(req.session.user); // Fix case issue here

    if (!user) {
      console.log("User not found in database");
      req.session.destroy(); // Clear session if user is missing
      return res.redirect("/login");
    }

    if (user.isBlocked) {
      console.log("User is blocked");
      req.session.destroy(); // Destroy session if user is blocked
      return res.redirect("/login");
    }

    next(); // Proceed if user is authenticated and not blocked
  } catch (error) {
    console.log("Error in User auth middleware:", error);
    res.status(500).send("Internal server error");
  }
};

const adminAuth = (req, res, next) => {
  if (req.session.admin || req.path === "/admin/login") {
    return next();
  }
  
  return res.redirect("/admin/login");
};

module.exports = {
  userAuth,
  adminAuth,
};