const express = require('express');
const db = require('./database');
const router = express.Router();

const usersUtil = require('./usersUtilitaries')

const crypto = require('crypto');
const uuid = crypto.randomUUID;


const deasync = require('deasync');
const { exit } = require('process');


// add data to req.body (for POST requests)
router.use(express.urlencoded({ extended: true }));

router.post("/generate", function (req,res) {
    console.log("generate canva method accessed");

    let tests = req.query['tests'];

    if (!usersUtil.isLoggedIn(req)) {
        if (tests)
            res.status(400).send("YOU ARE NOT LOGGED IN");
        else
            res.redirect("/users/login")
        return;
    }
        
    if (!usersUtil.isVip(req)) {
        if (tests)
            res.status(400).send("YOU ARE NOT A VIP");
        else
            res.redirect('/');
        return;
    }
    

    let data = req.body

    let name = data['name']
    let height = data['height']
    let length = data['length']
    let idOwner  = req.session.login
    let idcanva = uuid();

    if (height == null || length == null) {
        res.status(400).send("MISSING DATA");
        return;
    }

    // ADD CANVA in CANVAS table + CREATE TABLE CANVA_IDCANVA to store all the pixels
    if (!createCanva(idcanva,name,idOwner,height,length, true))
        res.status(400).end("Bad request");


    if (tests) {
        res.send("CANVA CREATED id=" + idcanva);
    } else {
        res.redirect('/canvas/' + idcanva);
    }

    
});


function getCanvasUtilisateurs(login) {
    let res = null;

    db.serialize(() => {

        const statement = db.prepare("SELECT u.idCanva, c.owner, c.name FROM usersInCanva u, canvas c WHERE u.idCanva =c.id AND u.idUser=?;");
        statement.all([login], function (err, result) {
            console.log(err);
            if (err) {
                console.log(err);
                res = false;
                return;
            }

            if (result) {

                console.log(result)

                res = result;

            } else {
                res = false;
                return;
            }

        });
        statement.finalize();
    });

    while (res==null)
        deasync.runLoopOnce();


    return res;
}

function userCanAccessCanva(idUser,idCanva){
    let canvas = getCanvasUtilisateurs(idUser)
    for (canva_itm in canvas) {
        if (canvas[canva_itm].idCanva == idCanva) return true;
    }
    return false;
}

router.get("/accessible", function(req,res) {

    if (!usersUtil.isLoggedIn(req)) {
        res.status(400).send("YOU ARE NOT LOGGED IN");
        return;
    }

    console.log(req.session.login)

    let canvas = getCanvasUtilisateurs(req.session.login) ;

    if (!canvas) {
        res.status(400).end("Bad request");
        return;
    }

    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify(canvas));

    
});

/*
router.use("/:id", function(req,res) {
    res.render("canvas.ejs", { logged: req.session.loggedin, login: req.session.login, error: false })
});*/

function sendCanva(idCanva,res) {
    console.log("OK GENERAL");
    res.send("OK GENERAL")
}

router.post("/getImage", function(req,res) {

    console.log("get entered")

    let data = req.body

    let id = data['idCanva'];

    let tests = req.query["tests"];

    let idUser = req.session.login;

    if (id=="general") {
        sendCanva(id,res);
        return;
    }

    if (!usersUtil.isLoggedIn(req)) {
        res.end('YOU ARE NOT LOGGED IN');
        return;
    }

    let canvasUser = getCanvasUtilisateurs(idUser);
    console.log(id)
    console.log(canvasUser[id])



    if (! userCanAccessCanva(idUser,id)) {
        res.end("YOU CANNOT ACCESS THIS CANVA")
        return;
    }

    res.end("OK");
    
    
})

router.post("/", function(req,res) {
    let data = req.body

    let id = data['idCanva'];

    res.render('canvas.ejs', { logged: req.session.loggedin, login: req.session.login, error: false, idCanva: id });

});

router.use("/", function (req, res) {
    if (!usersUtil.isLoggedIn(req)) {
        res.redirect('/');
        return;
    }
       
    res.redirect("/");
});










/**
 * @author Jean-Bernard CAVELIER
 * 
 * @param {*} idCanva 
 * @param {*} name 
 * @param {*} idOwner 
 * @param {*} height 
 * @param {*} length 
 * @param {*} linkOwnerToCanva
 * 
 * @returns true if creation was completed
 * @returns false if an error occured (Bad request)
 */
function createCanva(idcanva, name, idOwner, height, length, linkOwnerToCanva) {
    var ok = null;

    // create callbacks

    let rollback = () => {
        db.run("rollback", (err) => {
            ok = false;
            if (!err)
                console.log("rollback")
            else 
                console.log('rollback failed')
        })
    }

    let commit = () => {
        db.run("commit", (err) => {
            if (!err) {
                console.log("commit")
                ok = true;
            } else {
                ok = false;
                console.log('commit failed')
            }
                
        })
    }

    let addUser = null;
    if (linkOwnerToCanva) {
        addUser = () => {
            db.run("INSERT INTO usersInCanva(idCanva,idUser) VALUES (?,?)", [idcanva, idOwner], function (err, result) {
                
                if (!err) {
                    console.log("USER " + idOwner + " LINKED to " + idcanva);
                    commit();
                } else {
                    console.log(err);
                    console.log("linkage failed");
                    rollback();
                }
            })
        }

    }

    let createTableCanva = () => {
        db.run("CREATE TABLE '" + idcanva + "' ( pxl_x integer, pxl_y integer, pose TIMESTAMP,CONSTRAINT pxl_key PRIMARY KEY (pxl_x,pxl_y));", function (err, result) {
            if (!err) {
                console.log("CANVA PXL TABLE CREATED " + idcanva);
                if (linkOwnerToCanva)
                    addUser()
                else {
                    commit();
                }
                    
            } else {
                console.log(err);
                console.log("CANVA ALREADY IN DB");
                rollback();
            }

        });
    }

    let insertCanvaTable = () => {
        db.run("INSERT INTO canvas(id,name,owner,height,length) VALUES(?,?,?,?,?);", [idcanva, name, idOwner, height, length], function (err, result) {
            if (!err) {
                console.log("CANVA CREATED OK id=" + idcanva);
                createTableCanva();
            } else {
                console.log("CANVA ALREADY IN DB");
                rollback()
            }

        });
    }



    // start SQL queries
    db.serialize(()=> {

        db.run('begin;', (err) => {
            if (err) {
                ok = false;
                console.log("error begin");
            } else {
                console.log("begin");
                insertCanvaTable();
            }
        });


    });

    while (ok == null) {
        deasync.runLoopOnce();
    }

    console.log('finished');
    return ok;

}


module.exports = { router, createCanva };