const mongoose = require("mongoose");
const { Schema } = mongoose;

const cartschema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    items: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
          max: 5 
        },
        price: {
          type: Number,
          required: true,
        },
        totalPrice: {
          type: Number,
          required: true,
        },
        status: {
          type: String,
          default: "placed",
        },
        cancellationReason: {
          type: String,
          default: "none",
        },
      },
    ],
  },
  { timestamps: true },
);

const Cart = mongoose.model("Cart", cartschema);
module.exports = Cart;
