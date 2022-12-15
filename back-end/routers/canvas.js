const express = require('express');
const db = require('./database');
const router = express.Router();

const usersUtil = require('./usersUtilitaries')

const crypto = require('crypto');
const uuid = crypto.randomUUID;


// add data to req.body (for POST requests)
router.use(express.urlencoded({ extended: true }));

router.post("/generate", function (req,res) {
    console.log("generate canva method accessed");

    if (!usersUtil.isLoggedIn(req)) {
        res.status(400).send("YOU ARE NOT LOGGED IN");
        return;
    }
        
    if (!usersUtil.isVip(req)) {
        res.status(400).send("YOU ARE NOT A VIP");
        return;
    }
    
    let tests = req.query['tests'];

    let data = req.body

    console.log(data)

    let name = data['name']
    let height = data['height']
    let length = data['length']
    let owner  = req.session.login
    let idcanva = uuid();

    if (height == null || length == null) {
        res.status(400).send("MISSING DATA");
        return;
    }

    db.serialize(() => {

        db.run("INSERT INTO canvas(id,name,owner,height,length) VALUES(?,?,?,?,?);", [idcanva,name,owner, height,length], function (err, result) {
            console.log(err);
            if (!err) {
                console.log("CANVA CREATED OK id="+owner);

                db.serialize(() => {
                    db.run("INSERT INTO usersInCanva(idCanva,idUser) VALUES (?,?)", [idcanva,owner], function (err, result) {
                        console.log(err);
                    
                        if (!err) {
                            if (tests)
                                res.send("CANVA CREATED id=" + idcanva);
                            else
                                res.redirect('/canvas/' + idcanva);   
                        } 

                    })});

               
            } else {
                console.log("CANVA ALREADY IN DB");
                if (tests)
                    res.status(400).send("ID ALREADY USED")
                //else
                    //renderSignupPage(req, res, "USERNAME ALREADY IN USE")
            }

        });

    });

    //res.send("IT IS OK");
    
});

router.post("/accessible", function(req,res) {

    if (!usersUtil.isLoggedIn(req)) {
        res.status(400).send("YOU ARE NOT LOGGED IN");
        return;
    }

    console.log(req.session.login)

    db.serialize( () => {

        const statement = db.prepare("SELECT u.idCanva, c.owner, c.name FROM usersInCanva u, canvas c WHERE u.idCanva =c.id AND u.idUser=?;");
        statement.all([req.session.login], function (err, result) {
            console.log(err);
            if (err) {
                console.log(err);
                res.status(400).end("Bad request");
                return;
            } 

            if (result) {

                console.log(result)

                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(result));

            } else {
                res.status(400).end("USERNAME NOT FOUND / USER NOT IN A CANVA");
                return;
            }

        });
        statement.finalize();
    });
});


router.use("/:id", function(req,res) {
    res.render("canvas.ejs", { logged: req.session.loggedin, login: req.session.login, error: false })
});

router.use("/", function (req, res) {
    res.render("canvas.ejs", { logged: req.session.loggedin, login: req.session.login, error: false })
});


module.exports = router;