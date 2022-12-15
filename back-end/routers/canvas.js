const express = require('express');
const db = require('./database');
const router = express.Router();


const usersUtil = require('./usersUtilitaries')
router.use("/", function (req, res) {
    res.render("canvas.ejs", { logged: req.session.loggedin, login: req.session.login, error: false })
});
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

    let height = data['height']
    let length = data['length']
    let owner  = req.session.login

    if (height == null || length == null) {
        res.status(400).send("MISSING DATA");
        return;
    }

    db.serialize(() => {

        db.run("INSERT INTO canvas(id,owner,height,length) VALUES(?,?,?,?);", [owner,owner, height,length], function (err, result) {
            console.log(err);
            if (!err) {
                console.log("CANVA CREATED OK id="+owner);
                if (tests)
                    res.send("CANVA CREATED id="+owner);
                else
                    res.redirect('canvas/'+id);

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


router.use("/:id", function(req,res) {
    res.render("canvas.ejs", { logged: req.session.loggedin, login: req.session.login, error: false })
});


module.exports = router;