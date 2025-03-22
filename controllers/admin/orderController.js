const mongoose = require("mongoose");
const User = require("../../models/userschema");
const bcrypt = require("bcrypt");
const Category = require("../../models/categoryschema");
const Address = require("../../models/addressschema");
const Brand = require("../../models/brandschema");
const Product = require("../../models/productschema");
const Order = require("../../models/orderschema");
const { addToWallet } = require("../user/walletController");

const getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 7;

    const orders = await Order.find()
      .populate("orderItems.product")
      .populate("userId")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    console.log(orders);

    const count = await Order.countDocuments();
    const totalpage = Math.ceil(count / limit);

    res.render("orderlist", {
      orders,
      currentpage: page,
      totalpage: totalpage,
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: "Error while getting orders" });
  }
};

const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("userId", "firstName+lastName phone email")
      .populate("orderItems.product", "productName price productImage");

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

  
    const overallStatus = order.orderItems.every(
      (item) => item.orderStatus === "delivered"
    )
      ? "delivered"
      : order.orderItems.some(
            (item) =>
              item.orderStatus === "processing" ||
              item.orderStatus === "shipped"
          )
        ? "processing"
        : "pending";

    res.render("orderdetails", {
      order,
      overallStatus,
      specificAddress: order.address,
      user: order.userId || null,
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res.status(500).json({ error: "Failed to fetch order details" });
  }
};

const changeStatus = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { status } = req.body;

    const order = await Order.findOne({ "orderItems._id": itemId });
    if (!order) {
      return res.status(404).json({ success: false, error: "Order not found" });
    }

    const item = order.orderItems.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, error: "Item not found" });
    }

    // Prevent status change if item is delivered or returned
    if (
      ["delivered", "return request", "returned"].includes(
        item.orderStatus.toLowerCase()
      )
    ) {
      return res.status(400).json({
        success: false,
        error: `Cannot change status of a ${item.orderStatus} item.`,
      });
    }

    const statusMap = {
      pending: "Pending",
      processing: "processing",
      shipped: "shipped",
      delivered: "delivered",
      cancelled: "cancelled",
      "return request": "return request",
      returned: "returned",
      // Add uppercase versions to handle variations
      Pending: "Pending",
      Processing: "processing",
      Shipped: "shipped",
      Delivered: "delivered",
      Cancelled: "cancelled",
      "Return request": "return request",
      Returned: "returned",
    };

    // Update item status
    // item.orderStatus = status;
    // await order.save();

    item.orderStatus = statusMap[status] || "processing"; // Default to processing if invalid status
    await order.save();

    // Determine overall order status
    const itemStatuses = order.orderItems.map((i) => i.orderStatus);
    if (itemStatuses.every((s) => s === "delivered")) {
      order.status = "delivered";
    } else if (
      itemStatuses.some((s) => ["processing", "shipped"].includes(s))
    ) {
      order.status = "processing";
    } else if (itemStatuses.some((s) => s === "pending")) {
      order.status = "pending";
    } else {
      order.status = "cancelled";
    }

    await order.save();

    return res.json({ success: true });
  } catch (error) {
    console.error("Error in changeStatus:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to update order status" });
  }
};

const approveReturn = async (req, res) => {
  try {
    const { orderId, productId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      "orderItems._id": productId,
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Update the order item status to "Returned"
    const item = order.orderItems.find(
      (item) => item._id.toString() === productId
    );
    item.orderStatus = "returned";

    const userId = order.userId;
    const refundAmount = item.price * item.quantity;

    await addToWallet({
      userId,
      amount: refundAmount,
      description: "Order returned refund",
    });

    await order.save();

    return res.json({
      success: true,
      message: "Return approved successfully!",
      updatedStatus: "returned",
    });
  } catch (error) {
    console.error("Approve return error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const denyReturn = async (req, res) => {
  try {
    const { orderId, productId } = req.params;

    const order = await Order.findOne({
      _id: orderId,
      "orderItems._id": productId,
    });

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    // Update the order item status to "Return Denied"
    const item = order.orderItems.find(
      (item) => item._id.toString() === productId
    );
    item.orderStatus = "return denied";

    await order.save();

    return res.json({
      success: true,
      message: "Return request denied!",
      updatedStatus: "return denied",
    });
  } catch (error) {
    console.error("Deny return error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

module.exports = {
  getOrders,
  getOrderDetails,
  changeStatus,
  approveReturn,
  denyReturn,
};
