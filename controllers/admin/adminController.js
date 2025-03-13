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




// const getSalesReport = async (req, res) => {
//     try {
//         // Get total revenue from completed orders
//         const totalSales = await Order.aggregate([
//             { $match: { "orderItems.orderStatus": "delivered" } }, 
//             { $group: { _id: null, totalRevenue: { $sum: "$finalAmount" } } }
//         ]);

//         // Count total completed orders
//         const totalOrders = await Order.countDocuments({ "orderItems.orderStatus": "delivered" });

//         // Get top-selling products
//         const topProducts = await Order.aggregate([
//             { $unwind: "$orderItems" }, 
//             { $match: { "orderItems.orderStatus": "delivered" } },
//             { $group: { _id: "$orderItems.product", totalSold: { $sum: "$orderItems.quantity" } } },
//             { $sort: { totalSold: -1 } },
//             { $limit: 5 }
//         ]);

//         // Get sales by payment method
//         const salesByPayment = await Order.aggregate([
//             { $match: { "orderItems.orderStatus": "delivered" } }, 
//             { $group: { _id: "$paymentMethod", count: { $sum: 1 }, totalRevenue: { $sum: "$finalAmount" } } }
//         ]);

//         res.render("admin/salesReport", {
//             totalRevenue: totalSales[0]?.totalRevenue || 0,
//             totalOrders,
//             topProducts,
//             salesByPayment
//         });

//     } catch (error) {
//         console.error(error);
//         res.status(500).send("Error generating report");
//     }
// };


module.exports = {
  loadLogin,
  login,
  pageerror,
  logout,
  //getSalesReport
};
