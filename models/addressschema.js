const mongoose = require("mongoose");
const { Schema } = mongoose;

const addressSchema = new mongoose.Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  
      
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

  { timestamps: true}
);

const Address = mongoose.model("Address", addressSchema);
module.exports = Address;
