const express = require('express');
const db = require('./database');
const router = express.Router();

const usersUtil = require('./usersUtilitaries')

const crypto = require('crypto');
const uuid = crypto.randomUUID;


const deasync = require('deasync');
const { exit } = require('process');

const jimp = require("jimp")

//const canvas = require('canvas')


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

   /* let height = 20;
    let width = 20;

    let color = 0x123456;

    const canva = canvas.createCanvas(width,height)
    const ctx = canva.getContext('2d');

    for (let y=0; y < width; y++) {
        for (let x=0; x < height; x++){
            ctx.fillStyle = color;
            ctx.fillRect(x,y,1,1);
        }
    }

    //let c = canva.toBuffer();

    //console.log(c);

    res.setHeader('Content-Type','image/png');
    res.send(canva.toBuffer());*/

    //res.send("OK GENERAL")

    /*const pixels = [[0xff0000ff, 0x00ff00ff, 0x0000ffff],
    [0xffff00ff, 0x00ffffff, 0xff00ffff],
    [0xffffff00, 0xff00ff00, 0x00ffff00]
    ];*/

    const color = 0xff0000ff;

    const width = 1000;
    const height = 1000;

    // Create a new image with the specified width and height
    const image = new jimp(width, height);

    // Set the pixel colors for each pixel in the image
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            image.setPixelColor(color, x, y);
        }
    }

    // Generate the image and send it as a response
    image.getBuffer(jimp.MIME_PNG, (error, buffer) => {
        if (error) {
            res.status(500).send(error);
        } else {
            console.log(buffer);
            res.status(200);
            res.set('Content-Type', jimp.MIME_PNG);
            res.set('Content-Length', buffer.length);
            //res.set('Access-Control-Allow-Origin', '*');
            res.send(buffer);
        }
    });
}

router.post("/getImage", function(req,res) {

    console.log("get entered")

    let data = req.body

    let id = data['idCanva'];

    let tests = req.query["tests"];

    let idUser = req.session.login;

    console.log(id);
    console.log(id=="general")

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