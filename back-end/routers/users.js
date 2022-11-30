const express = require('express');
const router = express.Router();

var crypto = require('crypto')
var shasum = crypto.createHash('sha256');

/**
 * hash sha256 of input
 * @param {*} input 
 * @returns hashed value of input
 * 
 * @author Jean-Bernard Cavelier
 */
var sha256 = function(input) {
    return shasum.update(JSON.stringify(input)).digest('hex');
}


// add data to req.body (for POST requests)
router.use(express.urlencoded({ extended: true }));

const sqlite3 = require('sqlite3').verbose();

/**
 * connecting an existing database (handling errors)
 * @author Jean-Bernard Cavelier
 */
const db = new sqlite3.Database('./db/pixelwar.sqlite', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database! via users router');
});



router.post("/signup",
    /**
     * create an account with login and password provided
     * 
     * @param {*} req 
     * @param {*} res 
     * 
     * @author Jean-Bernard Cavelier
     */
    function (req,res) {
        if (req.session.loggedin) {
            res.redirect('/');
        } else {
            let data = req.body;
            if (data['login']!= null && data['login']!= ""  &&  data['password']!= null && data['password']!= ""){
                db.serialize(() => {
                    // check if the password is okay
                    const statement = db.prepare("INSERT INTO users VALUES(?,?);");
                    statement.run(data['login'], sha256(data['password']));
                    statement.finalize();
                });

                // once the user is created, redirect to login
                res.redirect('/login');
            } else {
                res.status(400).send('Bad request!');
            }
        }
    }
);



router.use('/signup', function (req, res) {
    res.render('signup.ejs', { logged: req.session.loggedin, login: req.session.login, error: false });
});

router.post('/login', 
    /**
     * check credentials in database + initialize session
     * @author Jean-Bernard Cavelier
     */
    function (req, res, next) {
        let data = req.body;
        if (data['login'] != null && data['login'] != "" && data['password'] != null && data['password'] != "") {

            db.serialize(() => {
                // check if the password is okay
                const statement = db.prepare("SELECT login FROM users WHERE login=? and password=?;");
                statement.get(data['login'], sha256(data['password']), (err, result) => {
                    if (err) {
                        next(err);
                    } else {
                        if (result) {
                            req.session.loggedin = true;
                            req.session.login = result['login'];
                            next();
                        } else {
                            res.render('login.ejs', { logged: false, login: req.session.login, error: true });
                        }
                    }
                });
                statement.finalize();

            });

        } else {
            res.status(400).send('Bad request!');
        }
    }
);

router.use('/login', function (req, res) {
    res.render('login.ejs', { logged: req.session.loggedin, login: req.session.login, error: false });
});

router.use('/logout', function (req, res) {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;