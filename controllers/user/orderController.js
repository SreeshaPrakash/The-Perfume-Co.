const User = require("../../models/userschema");
const Address = require("../../models/addressschema");
const Product = require("../../models/productschema");
const Category = require("../../models/categoryschema");
const Brand = require("../../models/brandschema");
const Cart = require("../../models/cartschema");
const Order = require("../../models/orderschema");
const { v4: uuidv4 } = require('uuid');
const Razorpay = require("razorpay")



const dotenv = require("dotenv");
const { getResetPassword } = require("./profileController");
const { default: mongoose } = require("mongoose");
const ObjectId = mongoose.Types.ObjectId
dotenv.config();


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const getCheckoutPage = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const userData = req.session.user; // ✅ Retrieve user data

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
      userData: userData, // ✅ Pass userData to EJS
    });
    console.log(req.session.user)
  } catch (error) {
    console.error("Error fetching checkout page:", error);
    res.status(500).json({ message: "Server error" });
  }
};







const createOrder = async (req, res) => {
  try {
    const { addressId, cartId, paymentMethod, finalAmount } = req.body;
    const userId = req.session.user._id;


    console.log('this is the final total from the ui => ', finalAmount)

  
    const cart = await Cart.aggregate([{$match:{userId:new ObjectId(userId)}},{
      $lookup:{
        from:"products",
        localField:"items.productId",
        foreignField:"_id",
        as:"productDetails"
      }
    }])
    
    const orderItems = cart[0].items.map((cartItem) => {
      const product = cart[0].productDetails.find(
        (prod) => prod._id.toString() === cartItem.productId.toString()
      );
    
      return {
        product: product?._id,
        productName: product?.productName,
        productImage:product?.productImage[0],
        quantity: cartItem.quantity, 
        price: product?.salePrice,
      };
    });
    
    console.log(orderItems)

    if (!orderItems.length) {
      return res
        .status(400)
        .json({ success: false, message: "No valid products in cart" });
    }

    const currentAddress = await Address.findById(addressId);

    
    const newOrder = new Order({
      userId:userId,
      orderItems: orderItems,
      totalPrice: finalAmount,
      finalAmount: finalAmount,
      address: {
        fullName: currentAddress.fullName,
        city: currentAddress.city,
        state: currentAddress.state,
        street: currentAddress.street,
        zipcode: currentAddress.zipcode,
        phone: currentAddress.phone,
      },
      Date: new Date().toISOString(),
      orderStatus: "Pending",
      orderId: uuidv4()
    });

   await newOrder.save();
   for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { quantity: -item.quantity }, 
    });
  }
    
    await Cart.findByIdAndDelete(cartId);

    res.json({
      success: true,
      orderId:newOrder.orderId,
      message: "Order placed successfully",
    });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
    });
  }
};



// const getOrderDetails = async (req, res) => {
//   try {
//     //const { orderId } = req.params;
//     const orderId = req.params.orderId;

//     // const order = await Order.findOne({ orderId })
//     //   .populate('orderItems.product')
//     //   .populate('address');

//     const order = await Order.findOne({ orderId }).populate({
//       path: "orderItems.product",
//     });

//     if (!order) {
//       return res.status(404).render("error", { message: "Order not found" });
//     }

//     res.render("order-details", { order });
//   } catch (error) {
//     console.error("Error fetching order details:", error);
//     //res.status(500).render('pageerror', { message: 'Failed to fetch order details' });
//     res.status(500).json({
//       success: false,
//       message: "An error occurred while updating the quantity",
//     });
//   }
// };


const orderDetail=async(req,res)=>{
  try {
    const userId = req.session.user._id;
    const orders=await Order.aggregate([{
      $lookup:{
        from:"users",
        localField:"userId",
        foreignField:"_id",
        as:"userDetails"
      }
    },{$match:{userId:new ObjectId(userId)}}])
    console.log(orders)
    res.render("orders",{orders})
  } catch (error) {
    console.log(error)
  }
}


const viewOrder=async(req,res)=>{
  try {
    const orderId=req.query.orderId
    const orders=await Order.find({_id:orderId})
    const Totalprice=orders[0].orderItems.reduce((sum,element)=>{
      return sum+=element.quantity*element.price
    },0)
    console.log(Totalprice)
    console.log(orders[0].orderItems)
    res.render('viewMoreOrder',{orders,Totalprice})
  } catch (error) {
    console.log(error)
  }
}

// const cancelOrder=async(req,res)=>{
//   try {

//     console.log(req.body)
//     const {orderId,productId}=req.body
//     const orders=await Order.findOne({_id:orderId})
//     await Order.updateOne(
//       { _id: orderId, "orderItems._id": productId },
//       { $set: { "orderItems.$.orderStatus": "cancelled" } } 
//     );
//     for (const item of orders.orderItems) {
//       await Product.findByIdAndUpdate(
//         item.product, 
//         { $inc: { quantity: item.quantity } } 
//       );
//     }    
    
//     return res.json({ success: "Successfully cancelled" });
    
//   } catch (error) {
//     console.log(error)
//   }
// }

const cancelOrder = async (req, res) => {
  try {
    console.log(req.body);
    const { orderId, productId } = req.body;
    const order = await Order.findOne({ _id: orderId });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    // Find the specific product in the order
    const productItem = order.orderItems.find(item => item._id.toString() === productId);

    if (!productItem) {
      return res.status(404).json({ message: "Product not found in order." });
    }

    // Prevent cancellation if already delivered
    if (productItem.orderStatus === "delivered") {
      return res.status(400).json({ message: "Delivered orders cannot be cancelled." });
    }

    // If not delivered, allow cancellation
    await Order.updateOne(
      { _id: orderId, "orderItems._id": productId },
      { $set: { "orderItems.$.orderStatus": "cancelled" } }
    );

    await Product.findByIdAndUpdate(productItem.product, {
      $inc: { quantity: productItem.quantity },
    });

    return res.json({ success: "Successfully cancelled" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



const getOrderPlacedPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = userId ? await User.findById(userId) : null;
    console.log("Userdata",userData)
    let orderId = req.query.orderId; // Get orderId from query params

    const order = await Order.findOne({orderId}).populate("orderItems.product");
    if (!order) {
      return res.status(404).send("Order not found");
    }

    res.render("order-placed", { order, userData });
  } catch (error) {
    console.error("Error rendering order-placed page:", error);
    res.status(500).send("Server error");
  }
};

// const returnOrder = async (req, res) => {
//   try {
//     const { orderId, productId } = req.body;

//     const order = await Order.findOne({ _id: orderId, "orderItems._id": productId });

//     if (!order) {
//       return res.status(404).json({ message: "Order not found." });
//     }

//     // Check if the order status is 'delivered' before allowing return
//     const productItem = order.orderItems.find(item => item._id.toString() === productId);
    
//     if (productItem.orderStatus !== "delivered") {
//       return res.status(400).json({ message: "Return not allowed. Only delivered orders can be returned." });
//     }

//     // Update the order status to "return request"
//     await Order.updateOne(
//       { _id: orderId, "orderItems._id": productId },
//       { $set: { "orderItems.$.orderStatus": "return request" } }
//     );

//     return res.json({ success: "Return request submitted successfully!" });
//   } catch (error) {
//     console.error("Error handling return request:", error);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };



// const returnOrder = async (req, res) => {
//     try {
//         const { orderId, productId, returnReason } = req.body;
        
//         // Find the order
//         const order = await Order.findOne({ _id: orderId, "orderItems._id": productId });

//         if (!order) {
//             return res.status(404).json({ success: false, message: "Order not found" });
//         }

//         // Update the order status and save the return reason
//         const item = order.orderItems.find(item => item._id.toString() === productId);
//         item.orderStatus = "return request";
//         item.returnReason = returnReason;

//         await order.save();

//         return res.json({ success: true, message: "Return request submitted successfully" });
//     } catch (error) {
//         console.error("Return request error:", error);
//         return res.status(500).json({ success: false, message: "Internal server error" });
//     }
// };



const returnOrder = async (req, res) => {
  try {
      const { orderId, productId, returnReason } = req.body;

      // Find the order
      const order = await Order.findOne({ _id: orderId, "orderItems._id": productId });

      if (!order) {
          return res.status(404).json({ success: false, message: "Order not found" });
      }

      // Update the order status and save the return reason
      const item = order.orderItems.find(item => item._id.toString() === productId);
      item.orderStatus = "return request";  // ✅ Correct status
      item.returnReason = returnReason;  // ✅ Store the return reason

      await order.save();

      return res.json({ success: true, message: "Return request submitted successfully" });
  } catch (error) {
      console.error("Return request error:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
  }
};



module.exports = {
  getCheckoutPage,
  createOrder,
  //getOrderDetails,
  orderDetail,
  viewOrder,
  cancelOrder,
  getOrderPlacedPage,
  returnOrder
};
