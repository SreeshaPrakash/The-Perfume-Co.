const mongoose = require("mongoose");
const { Schema } = mongoose
const brandschema = new Schema({
  brandName: {
    type: String,
    required: true,
  },
  brandImage: {
    type: [String],
    required: true,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  // createdAt: {
  //   type: Date,
  //   default: Date.now,
  // },
},  { timestamps: true });

const Brand = mongoose.model("Brand", brandschema);
module.exports = Brand;
