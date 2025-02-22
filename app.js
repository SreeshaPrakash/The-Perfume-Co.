const express = require("express");
const app = express();
const env = require("dotenv").config();
const session = require("express-session");

const passport = require("./config/passport");

const userschema = require("./models/userschema");
const path = require("path");
const userRouter = require("./routes/userRouter");
const adminRouter = require("./routes/adminRouter");
const flash = require("express-flash");
const bodyParser = require("body-parser");

const db = require("./config/db");
db();

const mongoose = require("mongoose");
const { Schema } = mongoose;

app.use(bodyParser.json());
//const MongoStore = require('connect-mongo');
//middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  //   store: MongoStore.create({
  //     mongoUrl: process.env.MONGODB_URI, // Change to your DB
  //     collectionName: 'sessions'
  // }),
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    },
  }),
);

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.set("cache-control", "no-store");
  next();
});

//view engine setup
app.set("view engine", "ejs");
app.set("views", [
  path.join(__dirname, "views/user"),
  path.join(__dirname, "views/admin"),
]);

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/", userRouter);
app.use("/admin", adminRouter);



app.listen(process.env.PORT, () => {
  console.log("server running");
});


module.exports = app;
