const User = require("../../models/userschema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const flash = require("express-flash");
const Order = require("../../models/orderschema");

const pageerror = async (req, res) => {
  res.render("admin-error");
};

const loadLogin = (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  }
  const errorMessage = req.flash("message");
  res.render("admin-login", { errorMessage });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await User.findOne({ email, isAdmin: true });
    if (admin) {
      if (password == admin.password) {
        req.session.admin = true;
        return res.redirect("/admin/dashboard");
      } else {
        req.flash("message", "Password is wrong");
        return res.redirect("/admin/login");
      }
    } else {
      req.flash("message", "invalid email");
      return res.redirect("/admin/login");
    }
  } catch (error) {
    console.log("login error", error);
    return res.redirect("/pageerror");
  }
};

// const loadDashboard = async (req, res) => {
//   if (req.session.admin) {
//     try {
//       res.redirect("/admin/dashboard");
//     } catch (error) {
//       res.redirect("/pageerror");
//     }
//   }
// };

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("error destroying session", err);
        return res.redirect("/pageerror");
      }

      res.redirect("/admin/login");
    });
  } catch (error) {
    console.log("unexpected error during logout", error);
    res.redirect("/pageerror");
  }
};



module.exports = {
  loadLogin,
  login,
  pageerror,
  logout,
  
};
