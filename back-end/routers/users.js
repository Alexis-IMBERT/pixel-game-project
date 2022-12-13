const express = require('express');
const router = express.Router();

var crypto = require('crypto');
const { render } = require('ejs');
//var shasum = crypto.createHash('sha256');

/**
 * hash sha256 of input
 * @param {*} input 
 * @returns hashed value of input
 * 
 * @author Jean-Bernard Cavelier
 */
var sha256 = function(input) {
    return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
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


function loggedIn(req,res) {
    console.log(req.session);
    if (req.session.loggedin) {
        console.log("already logged in");
        res.redirect('/');
    }
}


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

        var tests = req.query['tests'];

        console.log("signup method accessed");

        loggedIn(req,res);
        
        let data = req.body;
        var username = data['login'];

        if (!(username != null && username != "" && data['password'] != null && data['password'] != "")) {
            res.status(400).send('Bad request!');
            return;
        }
    
        db.serialize(() => {

            db.run("INSERT INTO users VALUES(?,?);", [username,sha256(data['password'])], function(err,result){
                console.log(err);
                if (!err) {
                    console.log("ACCOUNT CREATED OK");
                    if (tests)
                        res.send("ACCOUNT CREATED")
                    else
                        res.redirect('users/login');

                } else {
                    console.log("ACCOUNT ALREADY IN DB");
                    if (tests)
                        res.status(400).send("ALREADY IN USE")
                    else
                        renderSignupPage(req,res,"USERNAME ALREADY IN USE")
                }
                    
            });
 
        });
        
    }
);

router.use('/signup', function (req, res, err) {
    console.log("signup page accessed");
    loggedIn(req,res);
    renderSignupPage(req,res,null);
});

function renderSignupPage(req,res,err) {
    loggedIn(req,res);
    res.render('signup.ejs', { logged: false, login: false, error: err?err:false });
}

router.post('/login', 
    /**
     * check credentials in database + initialize session
     * @author Jean-Bernard Cavelier
     */
    function (req, res, next) {

        var tests = req.query['tests'];

        let data = req.body;
        console.log(data);

        if (!(data['login'] != null && data['login'] != "" && data['password'] != null && data['password'] != "") )
            res.status(400).send('Bad request!');
        
        db.serialize(() => {

            // check if the password is okay
            const statement = db.prepare("SELECT login FROM users WHERE login=? and password=?;");
            statement.get(data['login'], sha256(data['password']), (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(400).send("Bad request");
                    //next(err);
                } 

                if (result) {
                    req.session.loggedin = true;
                    req.session.login = result['login'];
                    console.log("LOG IN OK");

                    if (tests)
                        res.send("CONNECTION ESTABLISHED");
                    else
                        res.redirect('/');
                } else {
                    if (tests)
                        res.send("CONNECTION FAILED, WRONG PASSWORD OR USERNAME");
                    else
                        renderLoginPage(req,res,true);
                }
                
            });
            statement.finalize();

        });
    }
);

router.use('/login', function (req, res) {
    renderLoginPage(req,res,false);
});

function renderLoginPage(req,res,err) {
    res.render('login.ejs', { logged: req.session.loggedin, login: req.session.login, error: err });
}

router.use('/logout', function (req, res) {
    req.session.destroy();

    if (req.query['tests'])
        res.send("SESSION DESTROYED");
    else
        res.redirect('/users/login');
});




module.exports = router;