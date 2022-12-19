const express = require('express');
const db = require('./database');
const router = express.Router();

const usersUtil = require('./usersUtilitaries')

const crypto = require('crypto');
const uuid = crypto.randomUUID;


const deasync = require('deasync');
const { exit } = require('process');

const jimp = require("jimp")


// add data to req.body (for POST requests)
router.use(express.urlencoded({ extended: true }));



router.post("/generate", 
    /**
     * Generate a canvas 
     * 
     * @param {*} req (req.body["name"] ; req.body['height'] ; req.body['width'])
     * @param {*} res 
     * 
     * @author Jean-Bernard CAVELIER
     */    
    function (req,res) {

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
        let width = data['width']
        let idOwner  = req.session.login
        let idcanva = uuid();

        if (height == null || width == null) {
            res.status(400).send("MISSING DATA");
            return;
        }

        // ADD CANVA in CANVAS table + CREATE TABLE CANVA_IDCANVA to store all the pixels + link owner to the table
        if (!createCanva(idcanva,name,idOwner,height,width, true)){
            res.status(400).end("Bad request");
            return;
        }

        if (tests) {
            res.send("CANVA CREATED id=" + idcanva);
        } else {
            res.redirect('/canvas/' + idcanva);
        }

    }
);

router.use("/generate", 
    /**
     * Affiche la page permettant de créer un canvas
     * @param {*} req 
     * @param {*} res 
     * @returns 
     * 
     * @author Jean-Bernard CAVELIER
     */
    function(req,res) {
        if (!usersUtil.isLoggedIn(req)) { 
            res.redirect("/users/login")
            return;
        }

        if (!usersUtil.isVip(req)) {  
            res.redirect('/');
            return;
        }

        res.render("generate.ejs", { logged: req.session.loggedin, login: req.session.login, error: false})
    }
);



router.post("/accessible", 
    /**
     * Pour récupérer la liste de tous les canvas accessible par l'utilisateur connecté
     * 
     * @param {*} req 
     * @param {*} res 
     * 
     * @returns 400 si non connecté
     * @returns JSON des canvas si connecté
     * 
     * @author Jean-Bernard CAVELIER
     */
    function(req,res) {

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

    }
);


router.post("/getImage", 

    /**
     * Pour récuperer l'image d'un canva
     * 
     * @param {*} req (req.body['idCanva'])
     * @param {*} res 
     * 
     * @returns "general" canva if asked for (all users connected or not)
     * @returns 400 if you are not logged in and ask for something else
     * @returns 400 if you cannot access the canva you asked for
     * @returns base64 string of image's buffer if you can access the canva
     * 
     * @author Jean-Bernard CAVELIER
     */
    function(req,res) {

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
            res.status(400).end('YOU ARE NOT LOGGED IN');
            return;
        }

        let canvasUser = getCanvasUtilisateurs(idUser);
        console.log(id)
        console.log(canvasUser[id])



        if (! userCanAccessCanva(idUser,id)) {
            res.status(400).end("YOU CANNOT ACCESS THIS CANVA")
            return;
        }

        res.end("OK");
        
    }
)


router.use("/:id", 
    /**
     * Acceder à un canva particulier en fournissant l'ID dans le lien (/canvas/:id)
     * 
     * @param {*} req (req.params.id)
     * @param {*} res 
     * 
     * @returns redirect to the list of your accessible canvas (/canvas) if you cannot access the given canva
     * @returns render index.ejs page with the canva's id inside to ajax with /canvas/getImage
     * 
     * @author Jean-Bernard CAVELIER
     */
    function(req,res) {

        let id = req.params.id;

        let accessible = userCanAccessCanva(req.session.login,id);

        if (!accessible) {
            res.redirect("/canvas")
            return;
        }

        res.render('index.ejs', { logged: req.session.loggedin, login: req.session.login, error: false, idCanva: id });
    }
);


router.use("/", 
    /**
     * Acceder à la page de la liste complète des canvas accessible par l'utilisateur
     * 
     * @param {*} req 
     * @param {*} res 
     * 
     * @returns redirect to / if not logged in
     * @returns render canvas.ejs page if logged in
     * 
     * @author Jean-Bernard CAVELIER
     */
    function (req, res) {

        if (!usersUtil.isLoggedIn(req)) {
            res.redirect('/');
            return;
        }
        
        res.render('canvas.ejs', { logged: req.session.loggedin, login: req.session.login, isVip: usersUtil.isVip(req), error: false });

    }
);







/**
 * Verifie si un string est une couleur en HEXA
 * 
 * @param {*} hex 
 * @returns true si c'est une couleur, false sinon
 * 
 * @author Jean-Bernard CAVELIER
 */
function isHexColor(hex) { 
    return typeof hex === 'string' && hex.length === 6 && !isNaN(Number('0x' + hex)) 
}


/**
 * Create a canva with its table in the db
 * 
 * @param {*} idCanva 
 * @param {*} name canva's name to display
 * @param {*} idOwner 
 * @param {*} height 
 * @param {*} width 
 * @param {*} linkOwnerToCanva if owner should be liked to the canva (should only be false if the server is the owner)
 *  
 * @returns true if creation was completed
 * @returns false if an error occured (Bad request)
 * 
 * @author Jean-Bernard CAVELIER
 */
function createCanva(idcanva, name, idOwner, height, width, linkOwnerToCanva) {
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
        db.run("CREATE TABLE '" + idcanva + "' ( pxl_x integer, pxl_y integer, couleur VARCHAR, pose TIMESTAMP,CONSTRAINT pxl_key PRIMARY KEY (pxl_x,pxl_y));", function (err, result) {
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
        db.run("INSERT INTO canvas(id,name,owner,height,width) VALUES(?,?,?,?,?);", [idcanva, name, idOwner, height, width], function (err, result) {
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

/**
 * Envoie le canva au client
 * 
 * @param {*} idCanva 
 * @param {*} res 
 * 
 * @author Jean-Bernard CAVELIER
 */
function sendCanva(idCanva, res) {
    console.log("OK GENERAL");

    let color = 0x000000ff;

    const width = 1000;
    const height = 1000;

    // Create a new image with the specified width and height
    const image = new jimp(width, height);

    // Set the pixel colors for each pixel in the image
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            image.setPixelColor(color, x, y);
            color += 0x00000100;
        }
    }

    // Generate the image and send it as a response
    image.getBuffer(jimp.MIME_PNG, (error, buffer) => {
        if (error) {
            res.status(500).send(error);
        } else {
            res.status(200);
            res.set('Content-Type', jimp.MIME_PNG);
            res.set('Content-Length', buffer.length);
            //res.set('Access-Control-Allow-Origin', '*');
            res.send(buffer.toString('base64'));
        }
    });

}

/**
 * Obtenir la liste JSON des canvas accessible par l'utilisateur
 * 
 * @param {*} login 
 * 
 * @returns JSON
 * 
 * @author Jean-Bernard CAVELIER
 */
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

    while (res == null)
        deasync.runLoopOnce();


    return res;
}

/**
 * Vérifie si un utilisateur peut acceder à un canva
 * 
 * @param {*} idUser 
 * @param {*} idCanva 
 * @returns true si il peut, false sinon
 * 
 * @author Jean-Bernard CAVELIER
 */
function userCanAccessCanva(idUser, idCanva) {
    let canvas = getCanvasUtilisateurs(idUser)
    for (canva_itm in canvas) {
        if (canvas[canva_itm].idCanva == idCanva) return true;
    }
    return false;
}


module.exports = { router, createCanva };