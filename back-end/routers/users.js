const express = require('express');
const router = express.Router();

const { render } = require('ejs');

var usersUtil = require('./usersUtilitaries');
const sha256 = usersUtil.sha256;

const { exit } = require('process');




// add data to req.body (for POST requests)
router.use(express.urlencoded({ extended: true }));


const db = require("./database");





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


        if (usersUtil.redirectLoggedUsers(req, res,debug_mode=true))
            return;
            
        
        let data = req.body;

        console.log(data);

        let username = usersUtil.removeScript(data['login']);

        let password = data['password'];
        let password2 = data['password_confirmation'];

        if (!(username != null && username != "" && password != null && password != "" && password2 != null && password2 != "")) {
            console.log(username)            
            console.log(password)            
            console.log(password2)
            if (tests)
                res.status(400).send("MISSING VALUES");
            else
                renderSignupPage(req, res, "MISSING VALUES");
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
                        connectUser(req,username);
                        console.log("ACCOUNT CREATED OK");
                        if (tests)
                            res.send("ACCOUNT CREATED")
                        else
                            res.redirect('/');
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

router.use('/signup', 
    /**
     * To render signup page
     * @param {*} req 
     * @param {*} res 
     * @param {*} err 
     * @returns 
     * 
     * @author Jean-Bernard CAVELIER
     */
    function (req, res, err) {
        console.log("signup page accessed");
        
        if (usersUtil.redirectLoggedUsers(req, res))
            return;
            
        renderSignupPage(req,res,null);
    }
);

/**
 * Render signup page
 * @param {*} req 
 * @param {*} res 
 * @param {*} err 
 * @returns 
 * @author Jean-Bernard CAVELIER
 */
function renderSignupPage(req,res,err) {
    if (usersUtil.redirectLoggedUsers(req,res))
        return;
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

        if (!(data['login'] != null && data['login'] != "" && data['password'] != null && data['password'] != "") ) {
            if (tests)
                res.status(400).send("MISSING VALUES");
            else
                renderSignupPage(req, res, "MISSING VALUES");
            return;
        }
            
        
        db.serialize(() => {

            // check if the password is okay
            const statement = db.prepare("SELECT login FROM users WHERE login=? and password=?;");
            statement.get(data['login'], sha256(data['password']), (err, result) => {
                if (err) {
                    console.log(err);
                    if (tests)
                        res.status(400).send("ERROR: TRY AGAIN");
                    else
                        renderSignupPage(req, res, "PLEASE TRY AGAIN");
                    //next(err);
                    return;
                } 

                if (result) {
                    connectUser(req,result['LOGIN']);
                    console.log("LOG IN OK");

                    if (tests)
                        res.send("CONNECTION ESTABLISHED");
                    else
                        res.redirect('/');

                } else {
                    if (tests)
                        res.send("CONNECTION FAILED, WRONG PASSWORD OR USERNAME");
                    else
                        renderLoginPage(req,res,"CONNECTION FAILED, WRONG PASSOWRD OR USERNAME");
                }
                
            });
            statement.finalize();

        });
    }

);

router.use('/login', 
    /**
     * To access login page
     * @param {*} req 
     * @param {*} res 
     * 
     * @author Jean-Bernard CAVELIER
     */
    function (req, res) {
        renderLoginPage(req,res,false);
    }
);

/**
 * To render login page
 * @param {*} req 
 * @param {*} res 
 * @param {*} err 
 * 
 * @author Jean-Bernard CAVELIER
 */
function renderLoginPage(req,res,err) {
    res.render('login.ejs', { logged: req.session.loggedin, login: req.session.login, error: err });
}


router.use('/logout', 
    /**
     * To disconnect a user
     * @param {*} req 
     * @param {*} res 
     * 
     * @author Jean-Bernard CAVELIER
     */
    function (req, res) {
        req.session.destroy();

        if (req.query['tests'])
            res.send("SESSION DESTROYED");
        else
            res.redirect('/users/login');
    }
);


const profile = require('./profile');
const { connect } = require('http2');
router.use('/profile', profile);


router.use("/", 
    /**
     * 404 if the link is /users/something
     * @param {*} req 
     * @param {*} res 
     * 
     * @author Jean-Bernard CAVELIER
     */
    function (req, res) {
        res.redirect('/404')
    }
)


function connectUser(req,idUser) {
    req.session.loggedin = true;
    req.session.login = idUser;
}


module.exports = router;