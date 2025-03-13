
const Coupon = require('../../models/couponschema'); // Adjust path to match your Coupon model file


// const getCouponPage = async (req, res, next) => {
//     try {
//         // Pagination parameters
//         const page = parseInt(req.query.page) || 1;
//         const limit = 10; // Number of coupons per page
//         const skip = (page - 1) * limit;

//         // Count total active (non-deleted) coupons
//         const totalCoupons = await Coupon.countDocuments({ isDeleted: false });
//         const totalPages = Math.ceil(totalCoupons / limit);

//         // Fetch coupons with pagination and sorting
//         const coupons = await Coupon.find({ isDeleted: false })
//             .skip(skip)
//             .limit(limit)
//             .sort({ createdOn: -1 }) // Sort by creation date, newest first
//             .select('code offerPrice minimumPrice startOn expireOn maxUses usesCount isListed'); // Select only needed fields

//         // Render the EJS page with required data
//         res.render('coupon', {
//             coupons, // Array of coupon objects
//             currentPage: page,
//             totalPages,
//             hasNextPage: page < totalPages,
//             hasPrevPage: page > 1
//         });
//     } catch (error) {
//         console.error('Error in getCouponPage:', error);
//         next(error); // Pass to error-handling middleware
//     }
// };

const getCouponPage = async (req, res, next) => {
    try {
        // Pagination parameters
        const page = parseInt(req.query.page) || 1;
        const limit = 10; // Number of coupons per page
        const skip = (page - 1) * limit;

        // Count total active (non-deleted) coupons
        const totalCoupons = await Coupon.countDocuments();
        const totalPages = Math.ceil(totalCoupons / limit);

        // Fetch coupons
        const coupons = await Coupon.find()
            .skip(skip)
            .limit(limit)
            .sort({ createdOn: -1 });

        // ✅ Debugging logs
        console.log("Fetched Coupons Count:", coupons.length);
        console.log("Fetched Coupons Data:", coupons);

        // Render the EJS page with required data
        res.render('coupon', {
            coupons,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        });

    } catch (error) {
        console.error('❌ Error in getCouponPage:', error);
        next(error);
    }
};



const addCoupon = async (req, res) => {
  try {
      let {
          code,
          offerPrice,
          minimumPrice,
          startOn,
          maxUses,
          expireOn
      } = req.body;

      // Validate required fields
      if (!code || typeof code !== 'string' || code.trim() === '') {
          return res.status(400).json({
              success: false,
              message: 'Valid coupon code is required'
          });
      }

      if (!offerPrice || !minimumPrice || !startOn || !expireOn) {
          return res.status(400).json({
              success: false,
              message: 'All required fields must be provided'
          });
      }

      // Clean and format the code
      code = code.trim().toUpperCase();

       // Check if coupon already exists
       const existingCoupon = await Coupon.findOne({ code });
       if (existingCoupon) {
           return res.status(400).json({
               success: false,
               message: 'This coupon code already exists'
           });
       }

      // Additional validations
      if (Number(offerPrice) <= 0 || Number(minimumPrice) <= 0) {
          return res.status(400).json({
              success: false,
              message: 'Offer price and minimum price must be positive numbers'
          });
      }

      if (new Date(startOn) >= new Date(expireOn)) {
          return res.status(400).json({
              success: false,
              message: 'Start date must be before expiry date'
          });
      }

      const newCoupon = new Coupon({
        code,
        offerPrice: Number(offerPrice),
        minimumPrice: Number(minimumPrice),
        startOn: new Date(startOn),
        maxUses: maxUses ? Number(maxUses) : 5,
        expireOn: new Date(expireOn),
        createdOn: new Date(),
        usesCount: 0,
        isListed: true,
        isDeleted: false // ✅ Add this to ensure coupons are visible
    });

      await newCoupon.save();

      res.status(201).json({
          success: true,
          message: 'Coupon created successfully',
          coupon: newCoupon
      });
  } catch (error) {
      console.error('Error in addCoupon:', error);
      if (error.code === 11000) {
          return res.status(400).json({
              success: false,
              message: 'This coupon code already exists'
          });
      }
      res.status(500).json({
          success: false,
          message: 'Internal server error'
      });
  }
};

const toggleCouponStatus = async (req, res) => {
  try {
      const { couponId } = req.params;

      const coupon = await Coupon.findOne({ 
          _id: couponId, 
          isDeleted: false 
      });

      if (!coupon) {
          return res.status(404).json({
              success: false,
              message: 'Coupon not found'
          });
      }

      const newStatus = !coupon.isListed;
      await Coupon.findByIdAndUpdate(couponId, { isListed: newStatus });

      res.status(200).json({ 
          success: true, 
          message: `Coupon ${newStatus ? 'listed' : 'unlisted'} successfully`,
          isListed: newStatus
      });
  } catch (error) {
      console.error('Error in toggleCouponStatus:', error);
      res.status(500).json({ 
          success: false, 
          message: 'Internal server error' 
      });
  }
};



const deleteCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;

        const coupon = await Coupon.findById(couponId);
        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        await Coupon.findByIdAndDelete(couponId);

        res.status(200).json({ success: true, message: "Coupon deleted successfully" });
    } catch (error) {
        console.error("Error in deleteCoupon:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};




module.exports = {
    getCouponPage,
    addCoupon,
    toggleCouponStatus,
    // ... other exports (addCoupon, toggleCouponStatus, applyCoupon)
    deleteCoupon
};
