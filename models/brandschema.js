const mongoose = require("mongoose");
const { Schema } = mongoose
const brandschema = new Schema({
  brandName: {
    type: String,
    required: true,
  },
//   brandName: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Brand", // Reference to Brand model
//     required: true
// },

  brandImage: {
    type: [String],
    required: true,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  
},  { timestamps: true });

const Brand = mongoose.model("Brand", brandschema);
module.exports = Brand;
