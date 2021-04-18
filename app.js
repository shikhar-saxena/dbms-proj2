var express = require('express');
const bcrypt = require("bcrypt");
const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
var path = require('path');
var logger = require('morgan');
var dotenv = require('dotenv');

// Load Config
dotenv.config({ path: './config/config.env'});

var {pool} = require('./config/dbConfig');

const initializePassport = require("./config/passportConfig");

initializePassport(passport);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    // Key we want to keep secret which will encrypt all of our information
    secret: process.env.SESSION_SECRET,
    // Should we resave our session variables if nothing has changes which we dont
    resave: false,
    // Save empty value if there is no vaue which we do not want to do
    saveUninitialized: false
  })
);

// Funtion inside passport which initializes passport
app.use(passport.initialize());
// Store our variables to be persisted across the whole session. Works with app.use(Session) above
app.use(passport.session());
app.use(flash());

// GET routes
app.get('/', (req, res) => {
  res.render('index.ejs');
});

app.get("/users/register", checkAuthenticated, (req, res) => {
  res.render("register.ejs");
});

app.get("/users/login", checkAuthenticated, (req, res) => {
  res.render("login.ejs");
});

app.get("/users/dashboard", checkNotAuthenticated, (req, res) => {
  console.log(req.isAuthenticated());
  res.render("dashboard", { user: req.user.name, email: req.user.email, title: 'Donor' });
});

app.get('/users/donor', checkNotAuthenticated, function(req, res, next) {
  res.render('donor', { user: req.user.name, title: 'Donor' });
});

app.get('/users/home', checkNotAuthenticated, function(req, res, next) {
  res.render('home', { user: req.user.name, title: 'Donor' });
});

app.get("/users/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

// POST requests
app.post("/users/register", async (req, res) => {
  let { name, email, password, password2 } = req.body;

  let errors = [];

  console.log({
    name,
    email,
    password,
    password2
  });

  if (!name || !email || !password || !password2) {
    errors.push({ message: "Please enter all fields" });
  }

  if (password.length < 6) {
    errors.push({ message: "Password must be a least 6 characters long" });
  }

  if (password !== password2) {
    errors.push({ message: "Passwords do not match" });
  }

  if (errors.length > 0) {
    res.render("register", { errors, name, email, password, password2 });
  } else {
    hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);
    // Validation passed
    pool.query(
      `SELECT * FROM users
        WHERE email = $1`,
      [email],
      (err, results) => {
        if (err) {
          console.log(err);
        }
        console.log(results.rows);
        
        if (results.rows.length > 0) {
          req.flash("failed_msg","Email already registered");
          res.redirect("/users/register");
        } else {
          pool.query(
            `INSERT INTO users (name, email, password)
                VALUES ($1, $2, $3)
                RETURNING id, password`,
            [name, email, hashedPassword],
            (err, results) => {
              if (err) {
                throw err;
              }
              console.log(results.rows);
              req.flash("success_msg", "You are now registered. Please log in");
              res.redirect("/users/login");
            }
          );
        }
      }
    );
  }
});

app.post(
  "/users/login",
  passport.authenticate("local", {
    successRedirect: "/users/dashboard",
    failureRedirect: "/users/login",
    failureFlash: true
  })
);

app.post('/users/donor', async (req, res) => {
  let { bgroup, g, bdate, bmonth, byear, wt, ldd, ldm, ldy, address, pincode, state, district, city, mobile } = req.body;

  let errors = [];

  console.log({
    bgroup, g, bdate, bmonth, byear, wt, ldd, ldm, ldy, address, pincode, state, district, city, mobile
  });

  if (!bgroup || !g || !bdate || !bmonth || !byear || !wt || !address || !pincode || !state || !district || !city || !mobile) {
    errors.push({ message: "Please enter the necessary fields" });
  }

  var age = (bdate, bmonth, byear) => {
    var today = new Date();
    var birthDate = new Date(`${byear}${bmonth}${bdate}`);
    return today.getFullYear() - birthDate.getFullYear();
  }

  if (age < 18) {
    errors.push({ message: "Donating blood is not permitted" });
  }

  if (wt < 50) {
    errors.push({ message: "Donating blood is not permitted" });
  }

  if (errors.length > 0) {
    res.render("register", { errors, name, email, password, password2 });
  } else {
    hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);
    // Validation passed
    pool.query(
      `SELECT * FROM users
        WHERE email = $1`,
      [email],
      (err, results) => {
        if (err) {
          console.log(err);
        }
        console.log(results.rows);
        
        if (results.rows.length > 0) {
          return res.render("register", {
            message: "Email already registered"
          });
        } else {
          pool.query(
            `INSERT INTO users (name, email, password)
                VALUES ($1, $2, $3)
                RETURNING id, password`,
            [name, email, hashedPassword],
            (err, results) => {
              if (err) {
                throw err;
              }
              console.log(results.rows);
              req.flash("success_msg", "You are now registered. Please log in");
              res.redirect("/users/login");
            }
          );
        }
      }
    );
  }
});

function checkAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/users/dashboard");
  }
  next();
}

function checkNotAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/users/login");
}

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
