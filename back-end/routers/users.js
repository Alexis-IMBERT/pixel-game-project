const express = require('express');
const router = express.Router();

// add data to req.body (for POST requests)
router.use(express.urlencoded({ extended: true }));

const sqlite3 = require('sqlite3').verbose();

// connecting an existing database (handling errors)
const db = new sqlite3.Database('./db/pixelwar.sqlite', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database! via users router');
});

// check credentials in database + initialize session
router.post('/login', function (req, res, next) {
    let data = req.body;
    if (data['login'] != null && data['login'] != "" && data['password'] != null && data['password'] != "") {

        db.serialize(() => {
            // check if the password is okay
            const statement = db.prepare("SELECT login FROM users WHERE login=?;");
            statement.get(data['login'], (err, result) => {
                if (err) {
                    next(err);
                } else {
                    if (result) {
                        req.session.loggedin = true;
                        req.session.login = result['login'];
                        req.session.cart = {};
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
});

router.use('/login', function (req, res) {
    res.render('login.ejs', { logged: req.session.loggedin, login: req.session.login, error: false });
});

router.use('/logout', function (req, res) {
    req.session.destroy();
    res.redirect('/login');
});

module.exports = router;