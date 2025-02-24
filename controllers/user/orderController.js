const User = require("../../models/userschema")
const Address = require("../../models/addressschema")
const Product = require("../../models/productschema")
const Category = require("../../models/categoryschema")
const Brand = require("../../models/brandschema")
const Cart = require("../../models/cartschema")
const Order = require("../../models/orderschema")

const dotenv = require("dotenv")
const { getResetPassword } = require("./profileController")
dotenv.config()


  


const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const cart = await Cart.findOne({ userId }).populate("items.productId");

    if (!cart || cart.items.length === 0) {
      return res.render("cart", { message: "Your cart is empty." });
    }

    const addresses = await Address.find({ userId });
    let subtotal = 0;
    cart.items.forEach((item) => {
      subtotal += item.price; 
    });

    res.render("checkout", {
      cart: cart.items,
      addresses: addresses, 
      total: subtotal,
      cartId: cart._id,
      userId: userId,
    });
  } catch (error) {
    console.error("Error fetching checkout page:", error);
    res.status(500).json({ message: "Server error" });
  }
};






module.exports = {
    getCheckoutPage,
    

}