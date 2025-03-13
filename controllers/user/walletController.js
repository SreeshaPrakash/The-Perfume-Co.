const User = require('../../models/userschema');
const Wallet = require('../../models/walletschema');
const Address = require('../../models/addressschema');
const Cart = require('../../models/cartschema');
const Order = require('../../models/orderschema');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  


const loadWalletPage = async (req, res) => {
    try {
        // Fetch user information
        const user = req.session.user; 
        
        // Fetch wallet information, populating user details
        const wallet = await Wallet.findOne({ user: req.session.user });
        
        // Sort transactions in descending order (most recent first)
        const transactions = wallet ? wallet.transactions.sort((a, b) => b.date - a.date) : [];
        
        // Render the page with all necessary data
        res.render('user-wallet', {
            user: user,
            wallet: wallet || { balance: 0 },
            transactions: transactions
        });
    } catch (error) {
        console.error('Error loading wallet page:', error);
        res.status(500).render('page-404', { message: 'Failed to load wallet page' });
    }
};

const addMoneyToWallet = async (req, res) => {
    try {
      const { amount } = req.body;
      
      // Get the user ID from session
      const userId = req.session.user;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }
      
      // Find the user's wallet
      let wallet = await Wallet.findOne({ user: userId });
      
      if (!wallet) {
        wallet = new Wallet({ 
          user: userId,
          balance: 0,
          transactions: []
        });
      }
  
      // Check if the amount exceeds the per-transaction limit
      if (amount > 100000) {
        return res.json({
          success: false,
          error: 'You cannot add more than ₹1,00,000 at a time.'
        });
      }
  
      // Check if adding the amount would exceed the wallet balance limit
      if (wallet.balance + Number(amount) > 200000) {
        return res.json({
          success: false,
          error: 'Your wallet cannot hold more than ₹2,00,000.'
        });
      }
    
      // Create Razorpay order
      const options = {
        amount: amount * 100, // Convert to paise
        currency: "INR",
        receipt: `wallet_${Date.now()}`
      };
      
      const order = await razorpay.orders.create(options);
      
      res.json({
        success: true,
        order,
        keyId: process.env.RAZORPAY_KEY_ID
      });
    } catch (error) {
      console.error('Error adding money to wallet:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create payment order'
      });
    }
  };
  
  // Function to verify Razorpay payment
  const verifyPayment = async (req, res) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      } = req.body;
  
      // Get the user ID from session
      const userId = req.session.user;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }
  
      // Verify signature
      const sign = razorpay_order_id + "|" + razorpay_payment_id;
      const generated_signature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(sign)
        .digest('hex');
  
      if (generated_signature === razorpay_signature) {
        // Get order details
        const order = await razorpay.orders.fetch(razorpay_order_id);
        const amount = order.amount / 100; // Convert from paise to rupees
  
        // Update wallet
        let wallet = await Wallet.findOne({ user: userId });
        
        if (!wallet) {
          wallet = new Wallet({ 
            user: userId,
            balance: 0,
            transactions: []
          });
        }
  
        wallet.transactions.push({
          type: 'credit',
          amount: Number(amount),
          description: `Wallet recharge - ${razorpay_payment_id}`
        });
  
        wallet.balance += Number(amount);
        
        await wallet.save();
  
        res.json({
          success: true,
          message: 'Payment verified successfully',
          newBalance: wallet.balance
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Payment verification failed: Invalid signature'
        });
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to verify payment'
      });
    }
  };
  
  // Utility function to add money to wallet (for refunds, etc.)
  // const addToWallet = async ({ userId, amount, description }) => {
  //   try {
  //     // Validate inputs
  //     if (!userId || !amount || isNaN(amount) || amount <= 0) {
  //       throw new Error('Invalid user ID or amount');
  //     }
  
  //     let wallet = await Wallet.findOne({ user: userId });
  //     if (!wallet) {
  //       wallet = new Wallet({ 
  //         user: userId,
  //         balance: 0,
  //         transactions: []
  //       });
  //     }
  
  //     // Add transaction
  //     wallet.transactions.push({
  //       type: 'credit',
  //       amount: Number(amount),
  //       date: new Date(),
  //       description: description || 'Wallet credit'
  //     });
  
  //     // Update balance
  //     wallet.balance += Number(amount);
  
  //     // Save the wallet
  //     await wallet.save();
  //     console.log(`Wallet updated for user ${userId}: Added ₹${amount} with description "${description}"`);
  //     return true;
  //   } catch (error) {
  //     console.error('Failed to update wallet:', error);
  //     throw new Error('Failed to update wallet: ' + error.message);
  //   }
  // };
  



  const addToWallet = async ({ userId, amount, description }) => {
    try {
      if (!userId || !amount || isNaN(amount) || amount <= 0) {
        throw new Error("Invalid user ID or amount");
      }
  
      let wallet = await Wallet.findOne({ user: userId });
      if (!wallet) {
        wallet = new Wallet({
          user: userId,
          balance: 0,
          transactions: []
        });
      }
  
      wallet.transactions.push({
        type: "credit",
        amount: Number(amount),
        date: new Date(),
        description: description || "Refund credit"
      });
  
      wallet.balance += Number(amount);
      await wallet.save();
  
      console.log(`Wallet updated for user ${userId}: Credited ₹${amount} for ${description}`);
      return true;
    } catch (error) {
      console.error("Failed to update wallet:", error);
      throw new Error("Failed to update wallet: " + error.message);
    }
  };
  
  module.exports = {
    addToWallet, // Export the function to be used in orderController.js
  };
  








   // Add this function to walletController.js
// const processWalletPayment = async (req, res) => {
//     try {
//       const { orderId, amount } = req.body;
//       //const userId = req.session.user;
//       const userId = req.session.user?._id;
  
//       if (!userId) {
//         return res.status(401).json({
//           success: false,
//           message: 'User not authenticated'
//         });
//       }
  
//       // Find user's wallet
//       let wallet = await Wallet.findOne({ user: userId });
      
//       if (!wallet) {
//         return res.status(400).json({
//           success: false,
//           message: 'Wallet not found'
//         });
//       }
  
//       // Check if sufficient balance
//       if (wallet.balance < amount) {
//         return res.status(400).json({
//           success: false,
//           message: 'Insufficient wallet balance'
//         });
//       }
  
//       // Deduct amount from wallet
//       wallet.balance -= amount;
      
//       // Add transaction record
//       wallet.transactions.push({
//         type: 'debit',
//         amount: Number(amount),
//         date: new Date(),
//         description: `Payment for order #${orderId}`
//       });
      
//       await wallet.save();
  
//       // Update order payment status if needed
//       await Order.findByIdAndUpdate(orderId, {
//         $set: { 
//           paymentStatus: 'Paid'
//         }
//       });
  
//       return res.status(200).json({
//         success: true,
//         message: 'Payment successful',
//         newBalance: wallet.balance
//       });
//     } catch (error) {
//       console.error('Error processing wallet payment:', error);
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to process payment'
//       });
//     }
//   };
  

const processWalletPayment = async (req, res) => {
    try {
      const { orderId, amount } = req.body;
      const userId = req.session.user?._id;
  
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }
  
      // Find user's wallet
      let wallet = await Wallet.findOne({ user: userId });
      
      if (!wallet) {
        return res.status(400).json({
          success: false,
          message: 'Wallet not found'
        });
      }
  
      // Check if sufficient balance
      if (wallet.balance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient wallet balance'
        });
      }
  
      // Deduct amount from wallet
      wallet.balance -= amount;
      
      // Add transaction record
      wallet.transactions.push({
        type: 'debit',
        amount: Number(amount),
        date: new Date(),
        description: `Payment for order #${orderId}`
      });
      
      await wallet.save();
  
      // FIXED: Use findOne with orderId field instead of findById
      await Order.findOneAndUpdate(
        { orderId: orderId },
        { $set: { paymentStatus: 'Paid' } }
      );
  
      return res.status(200).json({
        success: true,
        message: 'Payment successful',
        newBalance: wallet.balance
      });
    } catch (error) {
      console.error('Error processing wallet payment:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to process payment'
      });
    }
};

module.exports = {
  loadWalletPage,
  addMoneyToWallet,
  verifyPayment,
  addToWallet,
  processWalletPayment
}