// const User = require("../../models/userschema")

const mongoose = require("mongoose");
// const {Schema} = mongoose;

const userschema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },

    lastName: {
      type: String,
    },

    password: {
      type: String,
      required: false,
    },

    email: {
      type: String,
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      default: null,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },
    // cart:[{
    //     type : mongoose.Schema.Types.ObjectId,
    //     ref:"Cart",
    // }],
    googleId: {
      type: String,
      unique: true,
    },
    wallet: {
      type: Number,
      default: 0,
    },
    // wishlist:[{
    //     type:mongoose.Schema.Types.ObjectId,
    //     ref: "Wishlist"
    // }],
    // orderHistory:[{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "Order"
    // }],
    //   createdOn: {
    //     type: Date,
    //     default: Date.now,
    //},
    referalcode: {
      type: String,
    },
    redeemed: {
      type: Boolean,
    },
    // redeemedUsers :[{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "user"
    // }],
    searchHistory :[{
        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref :"Category"
        },
        brand:{
            type: String
        },
        searchOn : {
            type:Date,
            default: Date.now
        }

    }]
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userschema);
