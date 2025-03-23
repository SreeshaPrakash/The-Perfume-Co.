const User = require("../../models/userschema");

const customerInfo = async (req, res) => {
  try {
    let search = "";
    if (req.query.search) {
      search = req.query.search;
    }
    let page = 1;
    if (req.query.page) {
      page = req.query.page;
    }

    const limit = 10;
    const userData = await User.find({
      isAdmin: false,
      $or: [
        { firstName: { $regex: ".*" + search + ".*", $options: "i" } },
        { lastName: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    })
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    //console.log("Fetched User Data:",userData)

    const count = await User.countDocuments({
      isAdmin: false,
      $or: [
        { firstName: { $regex: ".*" + search + ".*", $options: "i" } },
        { lastName: { $regex: ".*" + search + ".*", $options: "i" } },
        { email: { $regex: ".*" + search + ".*", $options: "i" } },
      ],
    });
    // .countDocuments()

    res.render("customers", {
      userData,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.log("error fetching customers", error);
    res.redirect("/pageerror");
  }
};



const customerBlocked = async (req, res) => {
  try {
    let id = req.query.id;
    await User.updateOne({ _id: id }, { $set: { isBlocked: true } });

    // Destroy session if the user is currently logged in
    // if (req.session.user && req.session.user._id == id) {
    //   req.session.user = null
    // }

    res.redirect("/admin/users");
  } catch (error) {
    console.error("Error blocking user:", error);
    res.redirect("/pageerror");
  }
};



const customerunBlocked = async (req, res) => {
  try {
    let id = req.query.id;
    //console.log("unblocking User Id :",id)
    await User.updateOne({ _id: id }, { $set: { isBlocked: false } });
    res.redirect("/admin/users");
  } catch (error) {
    console.log("error unblocking user:", error);
    res.redirect("/pageerror");
  }
};

module.exports = {
  customerInfo,
  customerBlocked,
  customerunBlocked,
};
