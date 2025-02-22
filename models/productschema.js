const mongoose = require("mongoose");
const { Schema } = mongoose;
const productschema = new Schema(
  {
    productName: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },
    // brand:{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref:"Brand",
    //     required: true
    // },
    brand: {
      // type: String,
      // required : true
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
    },
    category: {
      // type: ObjectId,
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    regularPrice: {
      type: Number,
      required: true,
    },
    salePrice: {
      type: Number,
      required: true,
    },
    // productOffer :{
    //     type:Number,
    //     default : 0,

    // },
    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    productImage: {
      type: [String],
      required: true,
    },
    // productImage :[
    //     {
    //         url : String,
    //         format : String,
    //         size : Number
    //     }
    // ],
    isBlocked: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Available", "out of stock", "isOnSale"],
      required: true,
      default: "Available",
    },
  },
  { timestamps: true },
);

const Product = mongoose.model("Product", productschema);

module.exports = Product;
