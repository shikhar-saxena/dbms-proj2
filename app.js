var express = require("express");
const bcrypt = require("bcrypt");
const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
var path = require("path");
var https = require("https");
var logger = require("morgan");
var dotenv = require("dotenv");

// Load Config
dotenv.config({ path: "./config/config.env" });

var { pool } = require("./config/dbConfig");

const initializePassport = require("./config/passportConfig");

initializePassport(passport);

var storeStatus = {
  "A+":0, "A-":0, "B+":0, "B-":0, "O+":0, "O-":0, "AB+":0, "AB-":0
};

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "public")));

app.use(
  session({
    // Key we want to keep secret which will encrypt all of our information
    secret: process.env.SESSION_SECRET,
    // Should we resave our session variables if nothing has changes which we dont
    resave: false,
    // Save empty value if there is no vaue which we do not want to do
    saveUninitialized: false,
  })
);

// Funtion inside passport which initializes passport
app.use(passport.initialize());
// Store our variables to be persisted across the whole session. Works with app.use(Session) above
app.use(passport.session());
app.use(flash());

// GET routes
app.get("/", (req, res) => {
  pool.query(
    "select bloodgroup, count(*) from finale group by bloodgroup",
    (err, results) => {
      if (err) {
        console.log(err);
      }
      console.log(results.rows);
      results.rows.forEach(res => {
        storeStatus[res.bloodgroup] = res.count;
      });
    }
  );
  console.log(storeStatus);
  res.render("index.ejs",{storeStatus});
});

app.get("/users/register", checkAuthenticated, (req, res) => {
  res.render("register.ejs");
});

app.get("/users/login", checkAuthenticated, (req, res) => {
  res.render("login.ejs");
});

app.get("/users/dashboard", checkNotAuthenticated, (req, res) => {
  console.log(req.isAuthenticated());
  var query = 'select name, email, mobile, bloodgroup, address, pincode from finale';
  pool.query(query,
    (err, results) => {
      if (err) {
        console.log(err);
      }
      console.log(results.rows);
      res.render("dashboard", {
        user: req.user.name,
        email: req.user.email,
        title: "Donor",
        results: results.rows
      });
    }
  );
});

app.get("/users/donor", checkNotAuthenticated, function (req, res, next) {
  res.render("donor", { user: req.user.name, title: "Donor" });
});

app.get("/users/home", checkNotAuthenticated, function (req, res, next) {
  res.render("home", { user: req.user.name, title: "Donor", storeStatus });
});

app.get("/users/search", checkNotAuthenticated, function (req, res) {
  res.render("loginsearch");
});

app.get("/users/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

// POST routes
app.post("/users/search", (req, res) => {
  let { __city } = req.body;

  console.log({ __city });

  if (!__city) errors.push({ message: "Please enter your city" });
  else {
    let char = __city[0];
    char = char.toUpperCase();
    __city = char + __city.slice(1);
    https
      .get(
        `https://api.data.gov.in/resource/fced6df9-a360-4e08-8ca0-f283fc74ce15?api-key=${process.env.apikey}&format=json&filters[__city]=${__city}`,
        (resp) => {
          let data = "";

          // A chunk of data has been received.
          resp.on("data", (chunk) => {
            data += chunk;
          });

          // The whole response has been received. Print out the result.
          resp.on("end", () => {
            var Obj = JSON.parse(data);
            var records = Obj.records;
            res.render("loginsearch", { results: records });
          });
        }
      )
      .on("error", (err) => {
        console.log("Error: " + err.message);
      });
  }
});

app.post("/users/register", async (req, res) => {
  let { name, email, password, password2 } = req.body;

  let errors = [];

  console.log({
    name,
    email,
    password,
    password2,
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
          req.flash("failed_msg", "Email already registered");
          res.redirect("/users/register");
        } else {
          pool.query(
            `INSERT INTO users (name, email, password)
                VALUES ($1, $2, $3)
                RETURNING id, password`,
            [name, email, hashedPassword],
            (err, results) => {
              if (err) {
                console.log(err);
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
    successRedirect: "/users/home",
    failureRedirect: "/users/login",
    failureFlash: true,
  })
);

function dte(getDateres) {
  var date;
  switch (getDateres) {
    case 1:
      date = "01";
      break;
    case 2:
      date = "02";
      break;
    case 3:
      date = "03";
      break;
    case 4:
      date = "04";
      break;
    case 5:
      date = "05";
      break;
    case 6:
      date = "06";
      break;
    case 7:
      date = "07";
      break;
    case 8:
      date = "08";
      break;
    case 9:
      date = "09";
      break;
    default:
      date = getDateres;
  }
  return date;
}

function validateDate(dateString) {
  var makeDate = new Date(dateString);

  var getthis =
    "" +
    makeDate.getFullYear() +
    "-" +
    dte(makeDate.getMonth() + 1) +
    "-" +
    dte(makeDate.getDate());
  console.log(makeDate.toString());
  console.log(dateString);
  console.log(getthis);
  return getthis == dateString;
}

// function getAddress(errors, pincode) {

//   var state, district;
//   https.get(`https://api.data.gov.in/resource/6176ee09-3d56-4a3b-8115-21841576b2f6?api-key=${process.env.apikey}&format=json&offset=0&limit=2&filters[pincode]=${pincode}`,
//     (resp) => {
//       let data = '';

//       // A chunk of data has been received.
//       resp.on('data', (chunk) => {
//         data += chunk;
//       });

//       // The whole response has been received. Print out the result.
//       resp.on('end', () => {
//         var Obj = JSON.parse(data);
//         console.log(Obj);
//         var result = Obj.records;
//         state = result[0].statename;
//         district =  result[0].districtname;
//       });

//     }).on("error", (err) => errors.push(err));
//     if( typeof state == undefined || typeof district == undefined) errors.push({message: 'Invalid PIN Code'});

//     return {state, district};
// }

app.post("/users/donor", async (req, res) => {
  let id = req.user.id;
  let name = req.user.name;
  let {
    bloodgroup,
    usergender,
    bdate,
    bmonth,
    byear,
    weight,
    address,
    pincode,
    mobile,
  } = req.body;
  let errors = [];

  console.log(id, {
    bloodgroup,
    usergender,
    bdate,
    bmonth,
    byear,
    weight,
    address,
    pincode,
    mobile,
  });

  if (
    !bloodgroup ||
    !usergender ||
    !bdate ||
    !bmonth ||
    !byear ||
    !weight ||
    !address ||
    !pincode ||
    !mobile
  ) {
    errors.push({ message: "Please enter all the fields" });
  }

  var dateString = "" + byear + "-" + bmonth + "-" + bdate;

  if (!validateDate(dateString)) errors.push({ message: "Invalid Birth Date" });

  var age = (dateString) => {
    var today = new Date();
    var birthDate = new Date(dateString);
    return today.getFullYear() - birthDate.getFullYear();
  };

  if (age < 18) {
    errors.push({ message: "Donating blood is not permitted" });
  }

  if (weight < 50) {
    errors.push({ message: "Donating blood is not permitted" });
  }
  if (mobile.length != 10) {
    errors.push({ message: "Invalid mobile number" });
  }
  if (pincode.length != 6) {
    errors.push({ message: "Invalid PIN code" });
  }
  if (errors.length > 0) {
    res.render("donor", { errors, user: name, title: "Donor" });
  } else {
    // // Validation passed
    // var {state, district} = getAddress(errors, pincode);

    // if (errors.length > 0) {
    //   res.render("donor", { errors, user: name, title: 'Donor' });
    // } else {
    pool.query(
      `INSERT INTO donors VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        bloodgroup,
        usergender,
        dateString,
        weight,
        address,
        pincode,
        mobile,
      ],
      (err, results) => {
        if (err) {
          console.log(err);
        }
        console.log(results.rows);
        req.flash("success_msg", "Your details have been submitted");
        res.redirect("/users/dashboard");
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
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
