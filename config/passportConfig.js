const LocalStrategy = require("passport-local").Strategy;
const {pool} = require('./dbConfig');
const bcrypt = require("bcrypt");

function initialize(passport) {
    console.log("Initialised");
    const authenticateUser = (email, password, done) => {
        console.log(email, password);
        pool.query(
            `SELECT * FROM users WHERE email = $1`,
            [email],
            (err, results) => {
                if (err) {
                    return done(err);
                }
                console.log(results.rows);

                if (results.rows.length > 0) {

                    const user = results.rows[0];

                    bcrypt.compare(password, user.password, (err, isMatch) => {
                        
                        if (isMatch) {
                            return done(null, user);
                        }
                        else {
                            return done(null, false, { message: "password is incorrect" });
                        }
                    });
                }
                else {
                    return done(null, false, { message: "Email is not registered" });
                }
            }
        );
    };
    
    passport.use(new LocalStrategy(
        {
            usernameField: "email",
            passwordField: "password"
        },
        authenticateUser
    ));

    passport.serializeUser((user, done) => done(null, user.id));

    passport.deserializeUser((id, done) => {
        pool.query(
            `SELECT * FROM users WHERE id= $1`, [id], (err, results) => {
                if (err) {
                    return done(err, null);
                }
                console.log(`ID is ${results.rows[0].id}`);
                return done(null, results.rows[0]);
            }
        );
    });
}

module.exports = initialize;