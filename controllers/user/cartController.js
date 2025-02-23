const Product = require("../../models/productschema");
const Category = require("../../models/categoryschema");
const Brand = require("../../models/brandschema");
const User = require("../../models/userschema");
const Cart = require("../../models/cartschema");

const loadCart = async (req, res) => {
  try {
    const userId = req.session.user?._id;
    const itemsPerPage = 2;
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
      // Filter out items where product, category, or brand is not listed
      //   const validItems = cart.items.filter((item) => {
      //     const product = item.productId;
      //     if (
      //       product &&
      //       product.isListed && // Check if product is listed
      //       product.category &&
      //       product.category.isListed && // Check if category is listed
      //       product.brand &&
      //       product.brand.isListed
      //     ) {
      //       return item;
      //     }
      //   });

      //   console.log("this is valid items=>", validItems)

      // Calculate price with any applicable offers
      console.log("cart items=> ", cart.items);
      const totalPrice = cart.items.reduce((total, item) => {
        const product = item.productId;
        let price = product.salePrice;

        // Apply product offer if exists
        if (product.productOffer > 0) {
          price -= product.offerAmount;
        }

        // Apply category offer if exists
        if (product.category && product.category.categoryOffer > 0) {
          const categoryDiscount =
            (price * product.category.categoryOffer) / 100;
          price -= categoryDiscount;
        }

        return total + price * item.quantity;
      }, 0);

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
  const userId = req.session.user._id;
  const productId = req.params.productId;
  const quantity = parseInt(req.body.quantity, 10);

  console.log("this is id of product =>", productId);

  if (!userId || !productId) {
    return res.status(400).send("User ID is required");
  }

  const product = await Product.findById(productId).populate("category");
  const productOffer = product.productOffer || 0;
  const categoryOffer = product.category.categoryOffer || 0;

  const bestOffer = Math.max(productOffer, categoryOffer);
  const finalPrice =
    bestOffer > 0
      ? product.salePrice - (product.salePrice * bestOffer) / 100
      : product.salePrice;
  if (!product) {
    return res.status(404).send("Product not found");
  }
  let cart = await Cart.findOne({ userId: userId });

  if (!cart) {
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
  } else if (cart) {
    cart.items.push({
      productId: productId,
      quantity,
      price: finalPrice,
      totalPrice: Math.floor(finalPrice * quantity),
    });
  } else {
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (existingItemIndex !== -1) {
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].price += finalPrice * quantity;
    } else {
      cart.items.push({
        productId: productId,
        quantity,
        price: Math.floor(finalPrice * quantity),
      });
    }
  }

  await cart.save();
  res.json({ success: true, message: "added to cart" });
};

module.exports = {
  loadCart,
  addToCart,
};
