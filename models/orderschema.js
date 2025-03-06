const mongoose = require("mongoose");
const { Schema } = mongoose;


const orderschema = new Schema(
  {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    orderId:{
          type:String
    },
    orderItems: [
      {
        product: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productName:{
          type:String,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          default: 0,
        },
        orderStatus: {
          type: String,
          enum: [
            "Pending",
            "processing",
            "shipped",
            "delivered",
            // "cancelled",
            "return request",
            "returned",
            "return denied"
          ],
          default: "processing", // Default order status
        },
         returnReason: { 
          type: String,
          default: null 
        }, 

        productImage:{
          type: String,
          required: true,
        }
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
      type: Number,
      required: true,
    },
    address: {
      fullName: {
        type: String,
        required: true,
      },
      phone: {
        type: Number,
        required: true,
      },
      street: {
        type: String,
        required: true,
      },
      city: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      zipcode: {
        type: Number,
        required: true,
      },
    },
    Date: {
      type: String,
      required: true,
    },
    couponapplied: {
      type: Boolean,
      default: false,
    }
  },
  { timestamps: true }
);
const Order = mongoose.model("Order", orderschema);

module.exports = Order;
