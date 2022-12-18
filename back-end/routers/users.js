const express = require('express');
const router = express.Router();

var crypto = require('crypto');
const { render } = require('ejs');
//var shasum = crypto.createHash('sha256');

var usersUtil = require('./usersUtilitaries');
const { exit } = require('process');

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


const db = require("./database");


function redirectLoggedUsers(req,res) {
    if (usersUtil.isLoggedIn(req)) {
        console.log("already logged in");
        res.redirect('/');
        exit()
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

        redirectLoggedUsers(req, res);
            
        
        let data = req.body;

        console.log(data);

        let username = data['login'];

        let password = data['password'];
        let password2 = data['password_confirmation'];

        if (!(username != null && username != "" && password != null && password != "" && password2 != null && password2 != "")) {
            console.log(username)            
            console.log(password)            
            console.log(password2)
            res.status(400).send('Bad request!');
            return;
        }

        if (password != password2) {
            if (tests)
                res.status(400).send("PASSWORD NOT EQUALS");
            else
                renderSignupPage(req,res,"PASSWORD NOT EQUALS");
            return;
        }
    
        db.serialize(() => {

            // CREATE USER
            db.run("INSERT INTO users(login,password) VALUES(?,?);", [username,sha256(password)], function(err,result){
                console.log(err);
                if (!err) {

                    // ADD USER TO DEFAULT CANVA
                    db.run("INSERT INTO usersInCanva(idCanva, idUser) VALUES(?,?);", ["general",username], function(err,result) {
                        console.log("ACCOUNT CREATED OK");
                        if (tests)
                            res.send("ACCOUNT CREATED")
                        else
                            res.redirect('users/login');
                    })
                    

                } else {
                    console.log("ACCOUNT ALREADY IN DB");
                    if (tests)
                        res.status(400).send("ALREADY USED")
                    else
                        renderSignupPage(req,res,"USERNAME ALREADY IN USE")
                }
                    
            });
 
        });
        
    }
);

router.use('/signup', function (req, res, err) {
    console.log("signup page accessed");
    
    redirectLoggedUsers(req, res);
        
    renderSignupPage(req,res,null);
});

function renderSignupPage(req,res,err) {
    redirectLoggedUsers(req,res);
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
                    return;
                } 

                if (result) {
                    req.session.loggedin = true;
                    req.session.login = result['LOGIN'];
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