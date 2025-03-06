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
      ? product.salePrice - (product.salePrice * bestOffer) / 100
      : product.salePrice;




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
  
  } else {
    const existingItemIndex = cart.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (existingItemIndex !== -1) {
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].totalPrice = Math.floor(
        cart.items[existingItemIndex].quantity * finalPrice
      );

    } else {
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
};


const increaseQuantity = async (req, res) => {
  try {
      const itemId = req.params.itemId
      const userId = req.session.user._id


      const cart = await Cart.findOne({ userId: userId }).populate({ path: "items.productId", populate: { path: "category", select: "categoryOffer" } })


      if (!cart) {
          return res.status(404).json({ success: false, message:"Cart not found" });
      }

      const item = cart.items.find(item => item._id.toString() === itemId);
      if (!item) {
          return res.status(404).json({ success: false, message: "Item not found in cart" });
      }

      const product = await Product.findById(item.productId).populate('category')


      const currentQuantity = item.quantity
      const maxQtyPerPerson = 5;
      if (currentQuantity >= product.quantity) {
          return res.status(400).json({ success: false, message: "Quantity exceeded" });
      } 
      //else if
      
      if (currentQuantity >= product.maxQtyPerPerson) {
          return res.status(400).json({ success: false, message: "Maximum quantity for one product exceeded" });
      } 
      //else {
          const productOffer = product.productOffer || 0
          const categoryOffer = product.category.categoryOffer || 0
  
          const bestOffer = Math.max(productOffer, categoryOffer)
          const finalPrice = bestOffer > 0 ? product.salePrice - (product.salePrice * bestOffer / 100) : product.salePrice
          item.quantity += 1;
          item.price = Math.floor(item.quantity * finalPrice);
         
          // const test = await cart.save();
          await cart.save()

          return res.status(200).json({ success: true,
                                        message: "Quantity incremented",
                                        newQuantity: item.quantity,
                                        newPrice: item.price 
                                    });
      //}


  } catch (error) {
      console.error("Cart increment error:",error)
      res.status(500).json({ success: false, message: "An error occurred while updating the quantity" })

  }
}


const decreaseQuantity = async (req, res) => {
  try {
    console.log("Haii")
      const itemId = req.params.itemId
      const userId = req.session.user._id
      const cart = await Cart.findOne({ userId: userId }).populate({ path: "items.productId", populate: { path: "category", select: "categoryOffer" } })
    
      if (!cart) {
          return res.status(404).json({ success: false, message:"Cart not found" })
      }
      const item = cart.items.find(item => item._id.toString() === itemId)
      if (!item) {
          return res.status(404).json({ success: false, message: "Item not found in cart" })
      }
      if (item.quantity === 1) {
          return res.status(400).json("Minimum quantity reached")
      }
      const product = await Product.findById(item.productId).populate('category')
      console.log(item)

      const currentQuantity = item.quantity

    
      // else {
          const productOffer = product.productOffer || 0
          const categoryOffer = product.category.categoryOffer || 0
  
          const bestOffer = Math.max(productOffer, categoryOffer)
          const finalPrice = bestOffer > 0 ? product.salePrice - (product.salePrice * bestOffer / 100) : product.salePrice
          item.quantity =item.quantity- 1;
          item.price = Math.floor(item.quantity * finalPrice);
          console.log(item.quantity)
          await cart.save();
          return res.status(200).json({ success: true, message: "Quantity incremented",  newQuantity: item.quantity, newPrice: item.price   });
      //}

  } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: "server error" })
  }
}








const removeItem = async (req, res) => {
  try {
      console.log("Received request to remove item:", req.params.itemId);
      if (!req.session.user) {
        console.log("User not logged in");
        return res.status(401).json({ success: false, message: "User not logged in" });
    }
      const itemId = req.params.itemId
      const userId = req.session.user._id
      console.log("User ID:", userId);

      const cart = await Cart.findOne({ userId: userId });
      if (cart) {
        console.log("Cart found:", cart);
          const cartLength = cart.items.length
          //cart.items = cart.items.filter((item) => item._id.toString() !== itemId);
          cart.items = cart.items.filter((item) => item._id.toString() !== itemId.toString());

          if (cart.items.length < cartLength) {
              await cart.save()
              return res.json({ success: true, message: "item removed successfully" })
          }
      }
      console.log("Item not found in cart.");
      return res.status(404).json({ success: false, message: 'Item not found.' });
  } catch (error) {
      console.error(error) 
      return res.status(500).json({ success: false, message: "server error" })
  }
}





module.exports = {
  loadCart,
  addToCart,
  increaseQuantity,
  decreaseQuantity,
  removeItem

};
