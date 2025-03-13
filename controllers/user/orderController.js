const User = require("../../models/userschema");
const Address = require("../../models/addressschema");
const Product = require("../../models/productschema");
const Category = require("../../models/categoryschema");
const Brand = require("../../models/brandschema");
const Cart = require("../../models/cartschema");
const Order = require("../../models/orderschema");
const Coupon = require("../../models/couponschema");
const Wallet = require("../../models/walletschema");
const { v4: uuidv4 } = require("uuid");
const Razorpay = require("razorpay");
const PDFDocument = require("pdfkit"); // ✅ Import PDFKit

const dotenv = require("dotenv");
const { getResetPassword } = require("./profileController");
const { default: mongoose } = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
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

    const couponCode = req.session.couponCode || req.body.couponCode || null; // ✅ Define couponCode

    res.render("checkout", {
      cart: cart.items,
      addresses: addresses,
      total: subtotal,
      cartId: cart._id,
      userId: userId,
      userData: userData, // ✅ Pass userData to EJS
      couponCode: couponCode,
    });
    console.log(req.session.user);
  } catch (error) {
    console.error("Error fetching checkout page:", error);
    res.status(500).json({ message: "Server error" });
  }
};



const createOrder = async (req, res) => {
  try {
    console.log("Session Data:", req.session);
    if (!req.session.user || !req.session.user._id) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    if (!req.session.user || !req.session.user._id) {
      return res
        .status(401)
        .json({ success: false, message: "User not authenticated" });
    }

    const { addressId, cartId, paymentMethod, finalAmount } = req.body;
    const userId = req.session.user._id;

    console.log("Session User:", req.session.user);

    console.log("this is the final total from the ui => ", finalAmount);


        // Restrict COD for orders above 1000
        if (paymentMethod === "COD" && finalAmount > 1000) {
          return res.status(400).json({
            success: false,
            message: "COD is not allowed for orders above ₹1000",
          });
        }
    


    const cart = await Cart.aggregate([
      { $match: { userId: new ObjectId(userId) } },
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
    ]);

    console.log("here is the cart itemssssssssss=>", cart);

    const orderItems = cart[0].items.map((cartItem) => {
      const product = cart[0].productDetails.find(
        (prod) => prod._id.toString() === cartItem.productId.toString()
      );
      console.log(product);

      return {
        product: product?._id,
        productName: product?.productName,
        productImage: product?.productImage[0],
        quantity: cartItem.quantity,
        price: product?.salePrice,
        subdiscount:
          ((product.productOffer ? product.productOffer : 1) *
            cartItem.quantity *
            product.salePrice) /
          100,
      };
    });

    console.log(orderItems);
   
    const totalDiscount = orderItems.reduce(
      (sum, num) => sum + (num.subdiscount || 0),
      0
    );
    console.log(totalDiscount);

    if (!orderItems.length) {
      return res
        .status(400)
        .json({ success: false, message: "No valid products in cart" });
    }

    const currentAddress = await Address.findById(addressId);

    const newOrder = new Order({
      userId: userId,
      orderItems: orderItems,
      totalPrice: finalAmount,
      finalAmount: finalAmount,
      paymentMethod: paymentMethod,
      address: {
        fullName: currentAddress.fullName,
        city: currentAddress.city,
        state: currentAddress.state,
        street: currentAddress.street,
        zipcode: currentAddress.zipcode,
        phone: currentAddress.phone,
      },
      orderStatus: "Pending",
      discount: totalDiscount,
      orderId: uuidv4(),
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
      orderId: newOrder.orderId,
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

const orderDetail = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const orders = await Order.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $match: { userId: new ObjectId(userId) } },
    ]);
    console.log(orders);
    res.render("orders", { orders });
  } catch (error) {
    console.log(error);
  }
};
const viewOrder = async (req, res) => {
  try {
    const { orderId } = req.query;

    if (!orderId) {
      return res.status(400).send("Order ID is missing");
    }

    // const order = await Order.findById(orderId)
    //     .populate("userId", "firstName lastName phone email")
    //     .populate("orderItems.product", "productName price productImage");

    const order = await Order.findById(orderId)
      .populate("userId", "firstName lastName phone email")
      .populate({
        path: "orderItems.product",
        select: "productName regularPrice salePrice productImage",
      });

    if (!order) {
      return res.status(404).send("Order not found");
    }

    // Calculate total price from all order items
    let Totalprice = 0;
    let totalOfferDiscount = 0;

    // order.orderItems.forEach(item => {
    //     const originalPrice = item.product.regularPrice;
    //     const salePrice = item.product.salePrice;
    //     const discount = originalPrice - salePrice;

    order.orderItems.forEach((item) => {
      const originalPrice = item.product.regularPrice; // ✅ Fetch original price
      const salePrice = item.product.salePrice; // ✅ Fetch sale price
      const discount = originalPrice - salePrice; // ✅ Calculate discount

      //     item.originalPrice = originalPrice;
      //     item.price = salePrice;
      //     item.totalPrice = salePrice * item.quantity;
      //     Totalprice += item.totalPrice;
      //     totalOfferDiscount += discount * item.quantity;
      // });

      // Assign the values correctly
      item.originalPrice = originalPrice;
      item.price = salePrice;
      item.totalPrice = salePrice * item.quantity;

      // Calculate totals
      Totalprice += item.totalPrice;
      totalOfferDiscount += discount * item.quantity;
    });

    let finalAmount = Totalprice;
    if (order.couponapplied) {
      finalAmount -= order.discount;
    }

    res.render("viewMoreOrder", {
      order,
      Totalprice,
      totalOfferDiscount,
      finalAmount,
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).send("Failed to fetch order details");
  }
};




const { addToWallet } = require("../../controllers/user/walletController"); // ✅ Import wallet function

const cancelOrder = async (req, res) => {
  try {
    const { orderId, productId } = req.body;
    const order = await Order.findOne({ _id: orderId });

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    // Find the specific product in the order
    const productItem = order.orderItems.find(
      (item) => item._id.toString() === productId
    );

    if (!productItem) {
      return res.status(404).json({ message: "Product not found in order." });
    }

    if (productItem.orderStatus.toLowerCase() === "cancelled") {
      return res
        .status(400)
        .json({ message: "This order has already been cancelled." });
    }

    if (productItem.orderStatus.toLowerCase() === "delivered") {
      return res
        .status(400)
        .json({ message: "Delivered orders cannot be cancelled." });
    }

    // Update order status to "Cancelled"
    await Order.updateOne(
      { _id: orderId, "orderItems._id": productId },
      { $set: { "orderItems.$.orderStatus": "cancelled" } }
    );

    // Restore product quantity
    await Product.findByIdAndUpdate(productItem.product, {
      $inc: { quantity: productItem.quantity },
    });

    // Refund to Wallet if paid via Wallet or Razorpay
    if (
      order.paymentMethod === "wallet" ||
      order.paymentMethod === "razorpay"
    ) {
      await addToWallet({
        userId: order.userId,
        amount: productItem.price * productItem.quantity,
        description: `Refund for cancelled order #${orderId}`,
      });
    }

    return res.json({ success: true, message: "Order successfully cancelled" });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getOrderPlacedPage = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = userId ? await User.findById(userId) : null;
    console.log("Userdata", userData);
    let orderId = req.query.orderId; // Get orderId from query params

    const order = await Order.findOne({ orderId }).populate(
      "orderItems.product"
    );
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

// const returnOrder = async (req, res) => {
//   try {
//       const { orderId, productId, returnReason } = req.body;

//       // Find the order
//       const order = await Order.findOne({ _id: orderId, "orderItems._id": productId });

//       if (!order) {
//           return res.status(404).json({ success: false, message: "Order not found" });
//       }

//       // Update the order status and save the return reason
//       const item = order.orderItems.find(item => item._id.toString() === productId);
//       item.orderStatus = "return request";  // ✅ Correct status
//       item.returnReason = returnReason;  // ✅ Store the return reason

//       await order.save();

//       return res.json({ success: true, message: "Return request submitted successfully" });
//   } catch (error) {
//       console.error("Return request error:", error);
//       return res.status(500).json({ success: false, message: "Internal server error" });
//   }
// };

const returnOrder = async (req, res) => {
  try {
    const { orderId, productId, returnReason } = req.body;

    // Find the order
    const order = await Order.findOne({
      _id: orderId,
      "orderItems._id": productId,
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Get the item
    const item = order.orderItems.find(
      (item) => item._id.toString() === productId
    );
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found in order" });
    }

    // Only allow return for delivered items
    if (item.orderStatus !== "delivered") {
      return res.status(400).json({
        success: false,
        message: "Only delivered orders can be returned.",
      });
    }

    // Update order item status
    item.orderStatus = "return request";
    item.returnReason = returnReason;

    await order.save();

    return res.json({
      success: true,
      message: "Return request submitted successfully",
    });
  } catch (error) {
    console.error("Return request error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal Server Error" });
  }
};

// const getAvailableCoupons = async (req, res) => {
//   try {
//     const currentDate = new Date();
//     const availableCoupons = await Coupon.find({
//       isListed: true,
//       isDeleted: false,
//       startOn: { $lte: currentDate },
//       expireOn: { $gte: currentDate }
//     });
//     res.json(availableCoupons);
//   } catch (error) {
//     console.error('Error fetching coupons:', error);
//     res.status(500).json({ message: 'Error fetching coupons' });
//   }
// };

const getAvailableCoupons = async (req, res) => {
  if (!req.session.user) {
    console.log("User not logged in, preventing coupon access.");
    return res.status(401).json({ message: "User not authenticated" });
  }

  try {
    const currentDate = new Date();
    const availableCoupons = await Coupon.find({
      isListed: true,
      isDeleted: false,
      startOn: { $lte: currentDate },
      expireOn: { $gte: currentDate },
    });

    console.log("Available coupons:", availableCoupons); // Add this for debugging

    res.json(availableCoupons);
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({ message: "Error fetching coupons" });
  }
};

const applyCoupon = async (req, res) => {
  try {
    const { couponCode, total } = req.body;
    const userId = req.session.user;

    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isListed: true,
      isDeleted: false,
      startOn: { $lte: new Date() },
      expireOn: { $gte: new Date() },
    });

    if (!coupon) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired coupon",
      });
    }

    // Check minimum price condition
    if (total < coupon.minimumPrice) {
      return res.status(400).json({
        success: false,
        message: `Coupon is valid for minimum purchase of ₹${coupon.minimumPrice}`,
      });
    }

    // Check max uses
    const userUse = coupon.userUses.find(
      (use) => use.userId.toString() === userId
    );
    if (userUse && userUse.count >= coupon.maxUses) {
      return res.status(400).json({
        success: false,
        message: "You have exceeded the maximum uses for this coupon",
      });
    }

    // Apply coupon
    const discount = coupon.offerPrice;

    // Update coupon usage
    if (userUse) {
      await Coupon.updateOne(
        { _id: coupon._id, "userUses.userId": userId },
        { $inc: { "userUses.$.count": 1, usesCount: 1 } }
      );
    } else {
      await Coupon.updateOne(
        { _id: coupon._id },
        {
          $push: {
            userUses: {
              userId,
              count: 1,
            },
          },
          $inc: { usesCount: 1 },
        }
      );
    }

    res.json({
      success: true,
      discount,
      message: "Coupon applied successfully",
    });
  } catch (error) {
    console.error("Error applying coupon:", error);
    res.status(500).json({
      success: false,
      message: "Error applying coupon",
    });
  }
};

const downloadInvoice = async (req, res) => {
  try {
    const orderId = req.params.orderId;

    // Fetch the order with populated products and user
    const order = await Order.findOne({ orderId: orderId })
      .populate("orderItems.product")
      .populate("userId");

    if (!order) {
      return res.status(404).send("Order not found");
    }

    // **Filter only delivered products**
    const deliveredItems = order.orderItems.filter(
      (item) => item.orderStatus === "delivered"
    ); // ✅ Fix: Correct field name

    console.log("Order Data:", JSON.stringify(order, null, 2));

    if (deliveredItems.length === 0) {
      return res.status(400).send("No delivered items in this order");
    }

    const address = await Address.findOne({ userId: order.user });
    const specificAddress = address?.address.find(
      (addr) => addr._id.toString() === order.address.toString()
    );

    // Create a PDF document
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${orderId}.pdf`
    );

    doc.pipe(res); // Stream directly to response

    // **Header Section**
    doc
      .font("Helvetica-Bold")
      .fontSize(24)
      .text("THE PERFUME CO.", { align: "left" })
      .moveDown(0.5)
      .fontSize(12)
      .text("Private Limited", { align: "left" });

    doc
      .moveDown(1)
      .fontSize(18)
      .text("Invoice", { align: "right" })
      .fontSize(10)
      .text(`Invoice#: ${order.orderId}`, { align: "right" })
      .text(`Date: ${new Date(order.createdOn).toLocaleDateString()}`, {
        align: "right",
      });

    // **Shipping Address**
    doc
      .moveDown(2)
      .fontSize(12)
      .text("Shipping Address:", { continued: false });

    if (specificAddress) {
      doc
        .font("Helvetica")
        .text(`${order.user.name}`)
        .text(`${specificAddress.addressLine || ""}`)
        .text(
          `${specificAddress.city || ""}, ${specificAddress.state || ""}, ${specificAddress.pincode || ""}`
        )
        .text(`${specificAddress.phone || ""}`);
    }

    doc.moveDown(2).font("Helvetica-Bold").fontSize(10);

    // **Table Headers**
    const tableTop = doc.y;
    doc
      .text("ITEM DESCRIPTION", 50, tableTop, { width: 250 })
      .text("PRICE", 300, tableTop, { width: 100, align: "right" })
      .text("QTY", 400, tableTop, { width: 50, align: "right" })
      .text("TOTAL", 450, tableTop, { width: 100, align: "right" });

    doc
      .moveDown(0.5)
      .strokeColor("#000000")
      .lineWidth(1)
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    doc.font("Helvetica");

    // **List Delivered Items**
    let yPosition = doc.y + 15;
    let subTotal = 0;

    deliveredItems.forEach((item) => {
      const totalItemPrice = item.price * item.quantity;
      subTotal += totalItemPrice;

      doc
        .text(item.product.productName, 50, yPosition, { width: 250 })
        .text(`${item.price.toFixed(2)}`, 300, yPosition, {
          width: 100,
          align: "right",
        })
        .text(item.quantity.toString(), 400, yPosition, {
          width: 50,
          align: "right",
        })
        .text(`${totalItemPrice.toFixed(2)}`, 450, yPosition, {
          width: 100,
          align: "right",
        });

      yPosition += 20;
    });

    // **Totals Section**
    doc
      .moveDown(2)
      .strokeColor("#000000")
      .lineWidth(1)
      .moveTo(300, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    const totalsStart = doc.y + 15;
    const discount = order.productdiscount || 0;
    const couponDiscount = order.couponDiscount || 0;
    const grandTotal = subTotal - discount - couponDiscount;

    doc
      .font("Helvetica")
      .text("SUB TOTAL", 300, totalsStart, { width: 150, align: "left" })
      .text(`${subTotal.toFixed(2)}`, 450, totalsStart, {
        width: 100,
        align: "right",
      })
      .text("Discount", 300, totalsStart + 20, { width: 150, align: "left" })
      .text(`-${discount.toFixed(2)}`, 450, totalsStart + 20, {
        width: 100,
        align: "right",
      })
      .text("Coupon Discount", 300, totalsStart + 40, {
        width: 150,
        align: "left",
      })
      .text(`-${couponDiscount.toFixed(2)}`, 450, totalsStart + 40, {
        width: 100,
        align: "right",
      });

    doc
      .font("Helvetica-Bold")
      .text("Grand Total", 300, totalsStart + 70, { width: 150, align: "left" })
      .text(`${grandTotal.toFixed(2)}`, 450, totalsStart + 70, {
        width: 100,
        align: "right",
      });

    // **Footer**
    doc
      .moveDown(4)
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Contact", 50, doc.y)
      .font("Helvetica")
      .fontSize(9)
      .text("The Perfume Co Inc., 123 Main Street")
      .text("Email: support@timeedge.com")
      .text("www.timeedge.com");

    doc
      .moveDown(2)
      .fontSize(9)
      .text("Thank you for choosing us!", { align: "left" })
      .text(
        "We appreciate your trust in us and hope you enjoy your purchase.",
        { align: "left" }
      )
      .text(
        "If you have any questions, feel free to reach out to our support team.",
        { align: "left" }
      );

    doc.end();
  } catch (error) {
    console.error("Invoice Generation Error:", error);
    res.status(500).send("Error generating invoice");
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
  returnOrder,
  getAvailableCoupons,
  applyCoupon,
  downloadInvoice,
};
