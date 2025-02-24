
const User= require('../../models/userschema')
const nodemailer = require('nodemailer')
const bcrypt = require ('bcrypt')
const env = require('dotenv').config()
const session = require('express-session')
const Order = require('../../models/orderschema')
const Address = require('../../models/addressschema')
const mongoose = require("mongoose");

function generateOtp(){
    const digits = "1234567890"
    let otp = ''
    for(let i=0;i<6;i++){
        otp+=digits[Math.floor(Math.random()*10)]

    }
    return otp;
}


const sendVerificationEmail = async(email, otp) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        });

        const mailOptions = {
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: "Your OTP for password reset",
            text: `Your OTP is ${otp}`,
            html: `<b><h4>Your OTP: ${otp}</h4><br></b>`
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent", info);
        return true;

    } catch (error) {
        console.error("Error sending email", error);
        return false;
    }
}



const securePassword = async  (password)=>{

    try {
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash

    } catch (error) {
        
    }
    
}





const getForgotPassword = async(req,res)=>{
    try {
        res.render('forgot-password')
        
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}


const forgotEmailValid = async(req,res)=>{
    try {
        const {email} = req.body
        const findUser = await User.findOne({email : email})
        if(findUser){
            const otp = generateOtp()
            const emailSent = await sendVerificationEmail(email,otp)
            if(emailSent){
                req.session.userOtp = otp
                req.session.email = email

                res.render("forgotPassword-otp")
    

                console.log("OTP:",otp)
            }
            else{
                res.json({success : false, message : "Failed to send OTP. please try again"})

            }

        }
        else{
            res.render('forgot-password', {
                message : "User with this email does not exist"
            })

        }
        
    } catch (error) {
        console.error("Error in forgotEmailValid:", error);
        res.redirect('/pageNotFound')
    }
}





const verifyForgotPassOtp = async(req,res)=>{
    try {
        //console.log(req.body)
        //console.log(req.session.userOtp)
       const otpInput = req.body.otpInput.trim()
       if(otpInput != req.session.userOtp){
        return res.json({ message : "OTP not matching"})
       }
    
         return res.json({success:"OTP Verified SuccessFully"})

       
       
    } catch (error) {
        
        res.status(500).json({success : false, message : "an error occured, please try again"})

    }
}


const getResetPassword  = async(req,res)=>{
    try {

        res.render('reset-password')

    } catch (error) {

        res.redirect('/pageNotFound')

    }
}


const resendOtp = async(req,res)=>{
    try {
        const otp = generateOtp()
        req.session.userOtp = otp
        const email = req.session.email
        console.log("Resending otp to email",email)
        const emailSent = await sendVerificationEmail(email,otp)
        if(emailSent){
            console.log('resend otp',otp)
            res.status(200).json({success : true, message : "resend otp successful"})
        }
    } catch (error) {
        
        console.error("error in resend otp",error)
        res.status(500).json({success:false, message : "internal server error"})

    }
}


const postNewPassword = async(req,res)=>{
    try {
        const {newPass1, newPass2} = req.body
        const email = req.session.email
        if(newPass1 === newPass2){
            const passwordHash = await securePassword(newPass1)
            await User.updateOne(
                {email : email},
                {$set: {password : passwordHash}}
            )
            res.redirect('/login')
        }
        else{
            res.render("reset-password",{message : "passwords do not match"})
        }


    } catch (error) {
        res.redirect('/pageNotFound')
    }
}




const userProfile= async(req,res)=>{
    try {
       
        const userId = req.session.user._id
        if (!userId) {
            console.log("User not logged in!");
            return res.redirect("/login");
        }
        const userData = await User.findOne({_id : userId})
        if (!userData) {
            console.log("User not found in DB!");
            return res.redirect("/pageNotFound"); 
        }
       res.render("profile",{ user:userData })        
    } catch (error) {       
        console.error("error for retrieveing profile data",error)
        res.redirect("/pageNotFound")
    }
}


const getAccount = async(req,res) =>{
    try {
        console.log("session userId:", req.session.user._id);
                if (!req.session.user._id) {
                    console.log("User not logged in, redirecting to login.");
                    return res.redirect('/login'); 
                }
                const userId = req.session.user._id;
        
                const userData = await User.findById(userId);               
                if (!userData) {
                    return res.status(404).send('User not found');
                }
                res.render('account',{ user: userData })        
    } catch (error) {
        console.error(error)
       res.status(500).send('Server error')
    }
}

  
const updateAccount = async (req, res) => {
    try {
      const { userId, firstName, lastName, phone, currentpassword, NewPassword, Cpassword } = req.body;
      console.log(req.body)
      const user = await User.findById(userId);

      if (currentpassword || NewPassword || Cpassword) {
        if (!currentpassword || !NewPassword || !Cpassword) {
          return res.status(400).json({ success: false, message: "All password fields are required." });
        }
        if (!user.password) {
          return res.status(400).json({ success: false, message: "Password change is not allowed for Google login users." });
        }

        const passwordMatch = await bcrypt.compare(currentpassword, user.password);
        if (!passwordMatch) {
          return res.status(401).json({ success: false, message: "Current password is incorrect." });
        }
  
        if (NewPassword !== Cpassword) {
          return res.status(400).json({ success: false, message: "New password and confirm password do not match." });
        }
  
        user.password = await bcrypt.hash(NewPassword, 10);
      }
      if (firstName) {
        user.firstName = firstName;
      }
      if (lastName) {
        user.lastName = lastName;
      }
      if (phone) {
        user.phone = phone;
      }
      await user.save();
  
      return res.status(200).json({ success: true, message: "Profile updated successfully!" });
    } catch (error) {
      console.error("Error updating profile:", error);
      return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
  };


// const getAddress = async(req,res)=>{
//     try {
       
//         if (!req.session.user) {
//             console.log("User not logged in, redirecting to login.");
//             return res.redirect('/login'); 
//         }
//         const userId = req.session.user._id;
//         const userData = await User.findById(userId)
    
//         if (!userData) {
//             return res.status(404).send('User not found');
//         }
//            const userAddress = await Address.find({userId:userId}) ; 
//             //console.log(userData)

//         res.render('address',{ user: userData, userAddress  })
        
//     } catch (error) {
//         console.error("an error occured while loading address page:",error)
//         res.redirect('/pageNotFound')
        
//     }
// }


const getAddress = async(req,res)=>{
    try {
        console.log("1. Session user:", req.session.user._id);
        
        if (!req.session.user._id) {
            console.log("2. No user session found");
            return res.redirect('/login'); 
        }
        
        const userId = req.session.user._id;
        console.log("3. Attempting to find addresses for userId:", userId);
        
        const userData = await User.findById(userId);
        console.log("4. User data found:", !!userData);
    
        if (!userData) {
            console.log("5. User not found in database");
            return res.status(404).send('User not found');
        }
        
        const userAddress = await Address.find({userId: userId});
        console.log("6. Found addresses:", userAddress);

        console.log("7. Rendering address page");
        res.render('address',{ user: userData, userAddress });
        
    } catch (error) {
        console.error("8. Error in getAddress:", error);
        res.redirect('/pageNotFound')
    }
}


const addAddress = async (req, res) => {
    try {      
        // console.log(session)
        // console.log("Session User ID:", req.session.userId);

        if (!req.session.user._id) {
            console.log("User not logged in, redirecting to login.");
            return res.redirect('/login');
        }
        const userId = req.session.user._id;
        const userData = await User.findById(userId);
        console.log("User ID:", userId);
        
        if (!userData) {
            return res.status(404).send('User not found');
        }
        res.render("add-address", { firstLetter: "", userId, user: "" });
    } catch (error) {
        console.log("Error in addAddress route:", error);
        res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
    
};
           

const postAddress = async (req, res) => {
    try {
        const { fullName, phone, street, city, state, zipcode } = req.body;
        const userId = req.session.user._id;
        const userData = await User.findById(userId);
        const newAddress = new Address({
            fullName,
            phone,
            street,
            city,
            state,
            zipcode,
            userId
        });
        await newAddress.save();

        res.redirect('/address');
    } catch (error) {
        console.error("Error adding address:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};


const editAddress = async (req, res) => {     
    try {     
     
        const userId = req.session.user?._id;    
        const addressId = req.params.id;
        const addressData = await Address.findOne({ _id:addressId });

        if (!addressData) {             
            return res.redirect('/profile');         
        }  
        res.render("edit-address", { userId,addressData }); 

    } catch (error) {         
        console.error(error);         
        res.redirect('/profile');     
    } 
  };
  


const updateAddress = async (req, res) => {
    try {
      const userId=req.session.user._id
        console.log(req.body);
      const {fullName, phone, street, city, state, zipcode,addressId } = req.body;
      const updatedAddress = await Address.findByIdAndUpdate(
            {  _id: addressId }, 
            {
              $set: {
                userId:userId,
                fullName: fullName,
                phone: phone,
                street : street,
                city : city,
                state: state,
                zipcode: zipcode,
               
              }
            }
        );
        return res.json({success:"Edited SuccessFully"})
         if (updatedAddress) {
      res.redirect("/admin/category");
    }
  
    } catch (error) {
        console.error(error);
       console.log("error in update address")
    }
  };


const deleteAddress = async (req,res)=>{
    const addressId = req.params.id
    try {    
      const deleteAddress = await Address.findByIdAndDelete({_id: addressId});
      if(!deleteAddress){
        return res.status(404).json({success:false,message:"Addres not found"})
      }
      return res.json({ success: true, message: 'Address deleted successfully!' });
    } catch (error) {
        console.error("deleting error",error.message);
    }
  }


module.exports ={ 
    getForgotPassword,
    forgotEmailValid,
    verifyForgotPassOtp,
    getResetPassword,
    resendOtp,
    postNewPassword,
    userProfile,
    getAccount,
    updateAccount,
    getAddress,
    addAddress,
    postAddress,
    editAddress,
    updateAddress,
    deleteAddress


   }