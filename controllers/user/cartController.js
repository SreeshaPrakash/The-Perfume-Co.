const Product = require("../../models/productschema");
const Category = require("../../models/categoryschema");
const Brand = require("../../models/brandschema");
const User = require("../../models/userschema");
const Cart = require("../../models/cartschema");

const loadCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const itemsPerPage = 3;
    const page = parseInt(req.query.page) || 1;

    //const categories = await Category.find();
    //const brands = await Brand.find();
    // Find cart and populate with product, category, and brand details
    const cart = await Cart.findOne({ userId: userId }).populate({
      // path: "items.product",
      path: "items.productId",
      populate: [
        {
          path: "category",
          select: "name isListed categoryOffer",
        },
        {
          path: "brand",
          select: "name isListed",
        },
      ],
    });

    if (cart) {



     

      // Calculate price with any applicable offers
      console.log("cart items=> ", cart.items);
      const totalPrice = cart.items.reduce((total, item) => {
        console.log("---------------", item);
        const product = item.productId;
        let price = product.regularPrice;

        console.log("before first price==>", price);
        console.log("before product offer price==>", product?.productOffer);
        // Apply product offer if exists
        if (product?.productOffer > 0) {
          price = price - (price * product.productOffer / 100);
      }
      
      if (product.category && product.category.categoryOffer > 0) {
          const categoryDiscount = (price * product.category.categoryOffer) / 100;
          price -= categoryDiscount;
      }
      

        console.log("after first price==>", price);

        // Apply category offer if exists

        console.log(
          "category. offer field before",
          product.category.categoryOffer,
          product.category.categoryOffer > 0
        );
        if (product.category && product.category.categoryOffer > 0) {
          const categoryDiscount =
            (price * product.category.categoryOffer) / 100;
          console.log("inside category discount==>", categoryDiscount, price);
          price -= categoryDiscount;
        }

        return total + price * item.quantity;
      }, 0);

      console.log("here is the total priceeeeeeeeeeeee", totalPrice);

      const user = await User.findById({ _id: userId });

      // Pagination
      const totalItems = cart.items.length;
      const totalPages = Math.ceil(totalItems / itemsPerPage);
      const startIndex = (page - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;

      const paginatedItems = cart.items.slice(startIndex, endIndex);
      const paginatedCart = {
        ...cart.toObject(),
        items: paginatedItems,
      };

      cart.items = cart.items;
      await cart.save();
      console.log("cartDetailssss",cart)

      res.render("cart", {
        cart: paginatedCart,
        totalPrice: Math.floor(totalPrice),
        currentPage: page,
        totalPages: totalPages,
        hasNextPage: endIndex < totalItems,
        hasPrevPage: page > 1,
        message:
          cart.items.length < cart.items.length
            ? "Some items were removed from your cart because they are no longer available."
            : null,
      });
    } else {
      res.render("cart", { message: "Cart is empty" });
    }
  } catch (error) {
    console.error("Cart loading error:", error);
    res.status(500).json("server error");
  }
};


const addToCart = async (req, res) => {
  try {
    const userId = req.session.user._id;
    const productId = req.params.productId;
    const quantity = parseInt(req.body.quantity, 10);

    console.log("this is id of product =>", productId);

    if (!userId || !productId) {
      return res.status(400).send("User ID and Product ID are required");
    }

    const product = await Product.findById(productId).populate("category");

    if (!product) {
      return res.status(404).send("Product not found");
    }
    const productOffer = product.productOffer || 0;
    const categoryOffer = product.category.categoryOffer || 0;
    const bestOffer = Math.max(productOffer, categoryOffer);
    const finalPrice =
      bestOffer > 0
        ? product.regularPrice - (product.regularPrice * bestOffer) / 100
        : product.regularPrice;

    let cart = await Cart.findOne({ userId: userId });

    if (!cart) {
      // Ensure the user cannot add more than 5 in a new cart
      if (quantity > 5) {
        return res.status(400).json({
          success: false,
          message: "Cannot add more than 5 of this product",
        });
      }
      cart = new Cart({
        userId: userId,
        items: [
          {
            productId: productId,
            quantity,
            price: finalPrice,
            totalPrice: Math.floor(finalPrice * quantity),
          },
        ],
      });
    } else {
      const existingItemIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId
      );

      if (existingItemIndex !== -1) {
        // Check if adding the new quantity exceeds the limit
        if (cart.items[existingItemIndex].quantity + quantity > 5) {
          return res.status(400).json({
            success: false,
            message: "Maximum limit of 5 per product reached",
          });
        }
        cart.items[existingItemIndex].quantity += quantity;
        cart.items[existingItemIndex].totalPrice = Math.floor(
          cart.items[existingItemIndex].quantity * finalPrice
        );
      } else {
        if (quantity > 5) {
          return res.status(400).json({
            success: false,
            message: "Cannot add more than 5 of this product",
          });
        }
        cart.items.push({
          productId: productId,
          quantity,
          price: finalPrice,
          totalPrice: Math.floor(finalPrice * quantity),
        });
      }
    }

    await cart.save();
    res.json({ success: true, message: "added to cart" });
  } catch (error) {
    console.error("Add to cart error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const increaseQuantity = async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const userId = req.session.user._id;

    const cart = await Cart.findOne({ userId: userId }).populate({
      path: "items.productId",
      populate: { path: "category", select: "categoryOffer" },
    });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.find((item) => item._id.toString() === itemId);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });
    }

    const product = await Product.findById(item.productId).populate("category");

    const currentQuantity = item.quantity;
    const maxLimit = 5; // Maximum limit per product

    // const maxQtyPerPerson = 5;
    // if (currentQuantity >= product.quantity) {
    //     return res.status(400).json({ success: false, message: "Quantity exceeded" });
    // }
    // //else if

    // if (currentQuantity >= product.maxQtyPerPerson) {
    //     return res.status(400).json({ success: false, message: "Maximum quantity for one product exceeded" });
    // }
    // //else {

    // Check if current quantity has reached the maximum allowed limit
    if (currentQuantity >= maxLimit) {
      return res.status(400).json({
        success: false,
        message: "Maximum limit of 5 per product reached",
      });
    }

    // Check if current quantity exceeds available stock
    if (currentQuantity >= product.quantity) {
      return res
        .status(400)
        .json({ success: false, message: "Not enough stock available" });
    }

    // Apply any available discounts
    const productOffer = product.productOffer || 0;
    const categoryOffer = product.category.categoryOffer || 0;

    const bestOffer = Math.max(productOffer, categoryOffer);
    const finalPrice =
      bestOffer > 0
        ? product.regularPrice - (product.regularPrice * bestOffer) / 100
        : product.regularPrice;
    item.quantity += 1;
    item.price = Math.floor(item.quantity * finalPrice);

    // const test = await cart.save();
    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Quantity incremented",
      newQuantity: item.quantity,
      newPrice: item.price,
    });
    //}
  } catch (error) {
    console.error("Cart increment error:", error);
    res.status(500).json({
      success: false,
      message: "An error occurred while updating the quantity",
    });
  }
};

const decreaseQuantity = async (req, res) => {
  try {
    console.log("Haii");
    const itemId = req.params.itemId;
    const userId = req.session.user._id;
    const cart = await Cart.findOne({ userId: userId }).populate({
      path: "items.productId",
      populate: { path: "category", select: "categoryOffer" },
    });

    if (!cart) {
      return res
        .status(404)
        .json({ success: false, message: "Cart not found" });
    }
    const item = cart.items.find((item) => item._id.toString() === itemId);
    if (!item) {
      return res
        .status(404)
        .json({ success: false, message: "Item not found in cart" });
    }
    if (item.quantity === 1) {
      return res.status(400).json("Minimum quantity reached");
    }
    const product = await Product.findById(item.productId).populate("category");
    console.log(item);

    const currentQuantity = item.quantity;

    // else {
    const productOffer = product.productOffer || 0;
    const categoryOffer = product.category.categoryOffer || 0;

    const bestOffer = Math.max(productOffer, categoryOffer);
    const finalPrice =
      bestOffer > 0
        ? product.regularPrice - (product.regularPrice * bestOffer) / 100
        : product.regularPrice;
    item.quantity = item.quantity - 1;
    item.price = Math.floor(item.quantity * finalPrice);
    console.log(item.quantity);
    await cart.save();
    return res.status(200).json({
      success: true,
      message: "Quantity incremented",
      newQuantity: item.quantity,
      newPrice: item.price,
    });
    //}
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "server error" });
  }
};

const removeItem = async (req, res) => {
  try {
    console.log("Received request to remove item:", req.params.itemId);
    if (!req.session.user) {
      console.log("User not logged in");
      return res
        .status(401)
        .json({ success: false, message: "User not logged in" });
    }
    const itemId = req.params.itemId;
    const userId = req.session.user._id;
    console.log("User ID:", userId);

    const cart = await Cart.findOne({ userId: userId });
    if (cart) {
      console.log("Cart found:", cart);
      const cartLength = cart.items.length;
      //cart.items = cart.items.filter((item) => item._id.toString() !== itemId);
      cart.items = cart.items.filter(
        (item) => item._id.toString() !== itemId.toString()
      );

      if (cart.items.length < cartLength) {
        await cart.save();
        return res.json({
          success: true,
          message: "item removed successfully",
        });
      }
    }
    console.log("Item not found in cart.");
    return res.status(404).json({ success: false, message: "Item not found." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "server error" });
  }
};

module.exports = {
  loadCart,
  addToCart,
  increaseQuantity,
  decreaseQuantity,
  removeItem,
};
