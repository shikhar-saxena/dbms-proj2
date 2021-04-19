// var express = require('express');
// const bcrypt = require("bcrypt");
// const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
// var path = require('path');
// var https = require('https');
// var logger = require('morgan');
// var dotenv = require('dotenv');
// var bodyParser = require("body-parser");

var {pool} = require('./config/dbConfig');

const getAllItems = function(req, res) {
    const sql = 'SELECT * FROM users ORDER BY id';
    pool.query(
        sql,
        (err, results) => {
          if (err) {
            throw err;
          }
          console.log(results.rows);
          req.flash("all_msg", results.rows);
          res.redirect("/query");
        }
      );
};
module.exports = {
    getAllItems
}