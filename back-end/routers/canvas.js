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
     * @param {*} req (req.body["name"] ; req.body['height'] ; req.body['name'] ; req.body['width'] ; req.body['users'])
     * @param {*} res 
     * 
     * @author Jean-Bernard CAVELIER
     */    
    function (req,res) {

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
        
        let idCanva = encodeURIComponent(req.params.id);

        let data = req.body

        let name = encodeURIComponent(data['name'])
        let height,width;
        try {
            height = data['height']
            width = data['width']
        } catch (e) {
            res.status(400).send("HEIGHT AND WIDTH SHOULD BE NUMBERS")
            return;
        }
        
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

        res.render("generate.ejs", { logged: req.session.loggedin, login: req.session.login, error: false, type: {edit: false, action: "/canvas/generate"}, canva_infos: { height: 0, width: 0, name: "", users:[{idUser:req.session.login}], id: "" }})
    }

);

router.post("/:id/update",
    /**
     * Update a canva
     * 
     * @param {*} req (req.body['height'], req.body['width'], req.body['name'], req.body['users'] like ["vip","toto",...])
     * @param {*} res 
     * 
     * @author Jean-Bernard CAVELIER
     */
    function(req,res) {

        let tests = req.query['tests'];

        let idCanva = encodeURIComponent(req.params.id);

        if (!usersUtil.isLoggedIn(req)) {
            if (tests) {
                res.status(400).send("YOU ARE NOT LOGGED IN")
                return;
            } else {
                res.redirect("/users/login")
                return;
            }
            
        }

        if (!usersUtil.isOwner(req, idCanva)) {
            if (tests) {
                res.status(400).send("YOU ARE NOT THE OWNER")
                return;
            } else {
                res.redirect('/canvas');
                return;
            }
            
        }

        let height;
        let width;

        let users = req.body['users']
        let name = encodeURIComponent(req.body['name']);

        try {
            height = parseInt(req.body['height'])
            width  = parseInt(req.body['width'])
        } catch (e) {
            //res.status(400).send("HEIGHT AND WIDTH SHOULD BE NUMBERS")
            renderGeneratePage(req,res,"HEIGHT AND WIDTH SHOULD BE NUMBERS", true, "/canvas/" + idCanva + "/update", idCanva, req.body['height'], req.body['width'], name, users)
            return;
        }
        
        
        

        users = JSON.parse(users);

        for (key in users) {
            users[key].idUser = encodeURIComponent(users[key].idUser)
        }

        let ownerInList = false;
        for (key in users) {
            if (!usersUtil.exists(users[key].idUser)) {
                if (tests)
                    res.status(400).send("USER "+users[key].idUser+" DOES NOT EXIST")
                else
                    renderGeneratePage(req,res,"USER " + users[key].idUser + " DOES NOT EXIST", true, "/canvas/" + idCanva + "/update", idCanva, req.body['height'], req.body['width'], name, users)
                return;
            }
            if (users[key].idUser == req.session.login) {
                ownerInList = true;
            }
        }

        if (!ownerInList) {
            if (tests)
                res.status(400).send("OWNER CANNOT BE REMOVED")   ;
            else
                renderGeneratePage(req,res,"OWNER "+req.session.login+" CANNOT BE REMOVED", true, "/canvas/" + idCanva + "/update", idCanva, req.body['height'], req.body['width'], name, users)
            return;
        }

        let usersIn = usersInCanva(idCanva);

        db.serialize(()=>{
            db.run("UPDATE canvas SET height=? , width=? , name=? WHERE id=?", [height,width,name,idCanva], function(err){
                if (err) {
                    console.log(err);
                    // canva doesn't exist
                    res.redirect("/canvas");
                    return;
                }
            });

            let incanva = false;
            // on ajoute les nouveaux users
            for (key in users){
                incanva = false;
                for (key2 in usersIn){
                    if (users[key].idUser==usersIn[key2].idUser) {
                        incanva = true;
                    }
                }
                if (!incanva) {
                    console.log("insert "+users[key].idUser)
                    db.run("INSERT INTO usersInCanva (idCanva,idUser) VALUES (?,?)", [idCanva,users[key].idUser], function (err) {
                        if (err) {
                            // ne devrait pas arriver
                            res.redirect("/canvas/" + idCanva + "/edit");
                            return
                        }
                    })
                }
            }

            let inlist = false;
            // on supprime ceux qui ne sont plus dans la liste
            for (key2 in usersIn) {
                inlist = false;
                for (key in users) {
                    if (users[key].idUser == usersIn[key2].idUser ) {
                        console.log("in list")
                        inlist = true;
                    }
                }
                if (!inlist) {
                    console.log("delete "+usersIn[key2].idUser)
                    db.run("DELETE FROM usersInCanva WHERE idCanva=? AND idUser=?", [idCanva, usersIn[key2].idUser], function (err) {
                        if (err) {
                            // ne devrait pas arriver
                            res.redirect("/canvas/" + idCanva + "/edit");
                            return
                        }
                    })
                }
            }

            
        })

        if (tests)
            res.send("OK")
        else
            res.redirect("/canvas");

    }

);

router.use("/:id/edit", 

    /**
     * Envoyer la page /edit d'un canva
     * 
     * @param {*} req 
     * @param {*} res 
     * @returns 
     * 
     * @author Jean-Bernard CAVELIER
     */
    function(req,res) {

        let tests = req.query['tests'];

        let idCanva = encodeURIComponent(req.params.id);

        if (!usersUtil.isLoggedIn(req)) {
            if (tests) {
                res.status(400).send("YOU ARE NOT LOGGED IN")
            } else {
                res.redirect("/users/login")
                return;
            }
           
        }

        if (!usersUtil.isOwner(req,idCanva)) {
            if (tests) {
                res.status(400).send("YOU ARE NOT THE OWNER")
            } else {
                res.redirect('/canvas');
                return;
            }
            
        }

        let info = getCanvaInfos(idCanva);

        if (tests)
            res.send(info);
        else
            renderGeneratePage(req,res,false, true, "/canvas/" + idCanva + "/update", idCanva, info['height'], info['width'], info['name'], info['users'])
            //res.render("generate.ejs", { logged: req.session.loggedin, login: req.session.login, error: false, type: { edit: true, action: "/canvas/"+idCanva+"/update" },canva_infos: {height: info['height'], width: info['width'],name: info['name'], users: info["users"], id:idCanva} })

    }

)


function renderGeneratePage(req,res,error, edit, action, idCanva, height, width, name, users) {
    res.render("generate.ejs", { logged: req.session.loggedin, login: req.session.login, error: error, type: { edit: edit, action: action }, canva_infos: { height: height, width: width, name: name, users: users, id: idCanva } })
}



router.get("/accessible", 
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

        let data = req.body

        let id = data['idCanva'];

        let idUser = req.session.login;

        if (id=="general") {
            sendCanva(id,res);
            return;
        }

        if (!usersUtil.isLoggedIn(req)) {
            res.status(400).end('YOU ARE NOT LOGGED IN');
            return;
        }


        if (! userCanAccessCanva(idUser,id)) {
            res.status(400).end("YOU CANNOT ACCESS THIS CANVA")
            return;
        }

        sendCanva(id,res);
        
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
    function(req,res, next) {

        let id = encodeURIComponent(req.params.id);

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
            console.log("not logged")
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
 * Get all the infos of a canva (height,width, name, users)
 * 
 * @param {*} idCanva 
 * @returns a JSON of all the canva's info
 * 
 * @author Jean-Bernard CAVELIER
 */
function getCanvaInfos(idCanva) {
    let res = null;

    db.serialize(() => {
        const statement = db.prepare("SELECT height,width,name FROM canvas WHERE id=?;");
        statement.all([idCanva], function (err, result) {
            if (err) {
                console.log(err);
                res = false;
                return;
            }

            if (result) {

                res = result[0];

            } else {
                res = false;
                return;
            }

        });
        statement.finalize();
    });

    while (res == null)
        deasync.runLoopOnce();

    res['users'] = usersInCanva(idCanva);

    return res;
}

/**
 * Obtenir tous les utilisateurs d'un canva
 * 
 * @param {*} idCanva
 * @returns array of users
 * 
 * @author Jean-Bernard CAVELIER
 */
function usersInCanva(idCanva) {

    let res = null; 
    db.serialize(()=>{
        const statement = db.prepare("SELECT idUser FROM usersInCanva WHERE idCanva =?;");
        statement.all([idCanva], function (err, result) {
            if (err) {
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
                    //console.log(err);
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
                //console.log(err);
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
                //console.log(err);
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

    let reslt = null;

    let color = 0xffffffff;

    let width = null;
    let height = null;

    db.serialize( ()=>{
        const statement = db.prepare("SELECT height, width FROM canvas WHERE id = ?;");
        statement.all([idCanva], function (err, result) {
            if (err) {
                console.log(err);
                res.status(400).send("bad request");
                return;
            }

            if (result) {

                height = result[0].height
                width  = result[0].width

            } else {
                res.status(400).send("bad request");
                return;
            }

        });
        statement.finalize();
    });


    while (height == null || width == null)
        deasync.runLoopOnce();


    // Create a new image with the specified width and height
    const image = new jimp(width, height);

    // Set the pixel colors for each pixel to white in the image
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            image.setPixelColor(color, x, y);
        }
    }


    db.serialize(()=>{
        db.each("SELECT pxl_x,pxl_y,couleur from '"+encodeURIComponent(idCanva)+"';", (err, row) => {
            if (err)
                console.log(err.message);
            else {
                // Easy access to row-Entries using row.NAME
                console.log(row.pxl_x + " | " + row.pxl_y + " | " + row.couleur);
                image.setPixelColor(parseInt(row.couleur),row.pxl_x,row.pxl_y)
            }
                
        });
        db.run('',(err)=>{
            reslt = true;
        })
    });

    while (reslt == null)
        deasync.runLoopOnce();


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
 * Obtenir la liste des canvas accessible par l'utilisateur
 * 
 * @param {*} login 
 * 
 * @returns  array of canvas
 * 
 * @author Jean-Bernard CAVELIER
 */
function getCanvasUtilisateurs(login) {
    let res = null;

    db.serialize(() => {

        const statement = db.prepare("SELECT u.idCanva, c.owner, c.name FROM usersInCanva u, canvas c WHERE u.idCanva =c.id AND u.idUser=?;");
        statement.all([login], function (err, result) {
            if (err) {
                console.log(err);
                res = false;
                return;
            }

            if (result) {
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