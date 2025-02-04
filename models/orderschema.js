const mongoose = require("mongoose");
const { Schema } = mongoose;
const { v4: uuidv4 } = require("uuid");

const orderschema = new Schema({
  orderId: {
    type: String,
    default: () => uuidv4(),
    unique: true,
  },
  orderItems: [
    {
      product: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
      },
      price: {
        type: Number,
        default: 0,
      },
    },
  ],
  totalPrice: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  finalAmount: {
    type: NUmber,
    required: true,
  },
  address: {
    type: Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  invoiceDate: {
    type: String,
    required: true,
    enum: [
      "Pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "return request",
      "returned",
    ],
  },
  // createdAt: {
  //   type: Date,
  //   default: Date.now,
  //   required: true,
  // },
  couponapplied: {
    type: Boolean,
    default: false,
  },
},  { timestamps: true });
const Order = mongoose.model("Order", orderschema);

module.exports = Order;
