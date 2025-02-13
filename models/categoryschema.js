const mongoose = require("mongoose");
const { Schema } = mongoose;

const categoryschema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    isListed: {
      type: Boolean,
      default: true,
    },
    // categoryOffer: {
    //   type: Number,
    //   default: 0,
    // },
   
  },
  { timestamps: true },
);

const Category = mongoose.model("Category", categoryschema);
module.exports = Category;
