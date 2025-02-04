const mongoose = require("mongoose");
const { Schema } = mongoose;

const couponSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  // createdAt: {
  //   type: Date,
  //   default: Date.now,
  //   required: true,
  // },
  offerPrice: {
    type: Number,
    required: true,
  },
  minimumPrice: {
    type: Number,
    required: true,
  },
  isList: {
    type: Boolean,
    default: true,
  },
  userId: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },
  ],
},  { timestamps: true });

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;
