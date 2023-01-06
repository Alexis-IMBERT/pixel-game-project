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


        let link = "/canvas/generate"

        let tests = req.query['tests'];

        if (usersUtil.redirectNotLoggedUsers(req,res)) {
            return
        }

            
        if (!usersUtil.isVip(req.session.login)) {
            if (tests)
                res.status(400).send("YOU ARE NOT A VIP");
            else
                res.redirect('/404');
            return;
        }

        
        let data = req.body

        let name = usersUtil.removeScript(data['name'])//encodeURIComponent(data['name'])

        let idOwner = req.session.login

        let usersPre = req.body['users']

        let idcanva = "";

        try {
            usersPre = JSON.parse(usersPre);
        } catch (e) {
            if (tests)
                res.status(400).send("USERS STRING SHOULD BE LIKE [{\"idUser\":\"id1\"},{\"idUser\":\"id2\"}]")
            else {
                renderGeneratePage(req, res, "USERS IS NOT A JSON OBJECT [{}]", false, link, idcanva, req.body['height'], req.body['width'], name, usersPre)
            }
            return true;
        }



        let users = JSON.parse(JSON.stringify(usersPre))
        
        for (key in usersPre) {
            users[key].idUser = usersUtil.removeScript(usersPre[key].idUser)
        }


        let ownerInList = false;
        for (key in users) {
            if (!usersUtil.exists(users[key].idUser)) {
                if (tests)
                    res.status(400).send("USER " + usersPre[key].idUser + " DOES NOT EXIST")
                else
                    renderGeneratePage(req, res, "USER " + usersPre[key].idUser + " DOES NOT EXIST", false, link, idcanva, req.body['height'], req.body['width'], name, users)
                return;
            }
            if (users[key].idUser == idOwner) {
                ownerInList = true;
            }
        }

        if (!ownerInList) {
            if (tests)
                res.status(400).send("OWNER CANNOT BE REMOVED");
            else
                renderGeneratePage(req, res, "OWNER " + idOwner + " CANNOT BE REMOVED", false, link, idcanva, req.body['height'], req.body['width'], name, users)
            return;
        }

        let height, width;
        try {
            height = parseInt(req.body['height'])
            width = parseInt(req.body['width'])
        } catch (e) {
            if (tests)
                res.status(400).send("HEIGHT AND WIDTH SHOULD BE NUMBERS")
            else {
                renderGeneratePage(req, res, "HEIGHT AND WIDTH SHOULD BE NUMBERS", false, link, idcanva, req.body['height'], req.body['width'], name, users)
            }
            return;
        }



        idcanva = uuid();

        

        // ADD CANVA in CANVAS table + CREATE TABLE CANVA_IDCANVA to store all the pixels + link owner to the table
        if (!createCanva(idcanva,name,idOwner,height,width, true)){
            res.status(400).end("Bad request");
            return;
        }



        // add users in canva
        db.serialize( ()=> {
            for (key in users) {
                if (users[key].idUser == idOwner)
                    continue;

                db.run("INSERT INTO usersInCanva (idCanva,idUser,derniereDemande) VALUES (?,?,?)", [idcanva, users[key].idUser,0], function (err) {
                    if (err) {
                        console.log(err);
                        // ne devrait pas arriver
                        res.redirect("/canvas/" + idcanva + "/edit");
                        return;
                    }
                })
            }
           
        })


        

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
        if (usersUtil.redirectNotLoggedUsers(req,res)) {
            return;
        }

        if (!usersUtil.isVip(req.session.login)) {  
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

        let link = "/canvas"+idCanva+"/update"

        if (usersUtil.redirectNotLoggedUsers(req,res)) {
            return;
        }

        if (!usersUtil.isOwner(req.session.login, idCanva)) {
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

        let usersPre = req.body['users']
        let name = usersUtil.removeScript(req.body['name'])

        if (name == "") {
            if (tests)
                res.status(400).send("NAME IS EMPTY")
            else {
                renderGeneratePage(req, res, "NAME IS EMPTY", true, link, idCanva, req.body['height'], req.body['width'], name, usersPre)
            }
            return true;
        }

        try {
            usersPre = JSON.parse(usersPre);
        } catch (e) {
            if (tests)
                res.status(400).send("USERS STRING SHOULD BE LIKE [{\"idUser\":\"id1\"},{\"idUser\":\"id2\"}]")
            else {
                renderGeneratePage(req, res, "USERS IS NOT A JSON OBJECT [{}]", true, link, idCanva, req.body['height'], req.body['width'], name, usersPre)
            }
            return true;
        }


        let users = JSON.parse(JSON.stringify(usersPre))
        for (key in usersPre) {
            users[key].idUser = usersUtil.removeScript(usersPre[key].idUser)
        }

        let ownerInList = false;
        for (key in users) {
            if (!usersUtil.exists(users[key].idUser)) {
                if (tests)
                    res.status(400).send("USER " + usersPre[key].idUser + " DOES NOT EXIST")
                else
                    renderGeneratePage(req, res, "USER " + usersPre[key].idUser + " DOES NOT EXIST", true, link, idCanva, req.body['height'], req.body['width'], name, users)
                return true;
            }
            if (users[key].idUser == req.session.login) {
                ownerInList = true;
            }
        }

        if (!ownerInList) {
            if (tests)
                res.status(400).send("OWNER CANNOT BE REMOVED");
            else
                renderGeneratePage(req, res, "OWNER " + req.session.login + " CANNOT BE REMOVED", true, link, idCanva, req.body['height'], req.body['width'], name, users)
            return true;
        }



        try {
            height = parseInt(req.body['height'])
            width = parseInt(req.body['width'])
        } catch (e) {
            if (tests)
                res.status(400).send("HEIGHT AND WIDTH SHOULD BE NUMBERS")
            else {
                renderGeneratePage(req, res, "HEIGHT AND WIDTH SHOULD BE NUMBERS", true, link, idCanva, req.body['height'], req.body['width'], name, users)
            } 
            return true;
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
                    db.run("INSERT INTO usersInCanva (idCanva,idUser,derniereDemande) VALUES (?,?,?)", [idCanva,users[key].idUser,0], function (err) {
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
                        inlist = true;
                    }
                }
                if (!inlist) {
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

        if (usersUtil.redirectNotLoggedUsers(req, res)) {
            console.log("redirected not logged")
            return;
        }



        if (!usersUtil.isOwner(req.session.login,idCanva)) {
            if (tests) {
                res.status(400).send("YOU ARE NOT THE OWNER")
            } else {
                res.redirect('/404');
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

/**
 * to render canva generation page
 * @param {*} req 
 * @param {*} res 
 * @param {*} error 
 * @param {*} edit 
 * @param {*} action 
 * @param {*} idCanva 
 * @param {*} height 
 * @param {*} width 
 * @param {*} name 
 * @param {*} users 
 * 
 * @author Jean-Bernard CAVELIER
 */
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

        if (usersUtil.redirectNotLoggedUsers(req, res)) {
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


router.post("/:id/getImage", 

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

        let id = encodeURIComponent(req.params.id);

        let idUser = req.session.login;

        if (id=="general") {
            sendCanva(id,res);
            return;
        }

        if (usersUtil.redirectNotLoggedUsers(req, res)) {
            return;
        }


        if (! userCanAccessCanva(idUser,id)) {
            res.status(400).end("YOU CANNOT ACCESS THIS CANVA")
            return;
        }

        sendCanva(id,res);
        
    }
)

router.post("/:id/timer", 
    /**
     * Retourne le temps d'attente restant pour poser un pixel sur le canva :id
     * 
     * @param {*} req 
     * @param {*} res 
     */
    function(req,res) {

        let idCanva = encodeURIComponent(req.params.id);
        let idUser  = req.session.login;

        if (usersUtil.redirectNotLoggedUsers(req, res)) {
            return;
        }


        if (!userCanAccessCanva(idUser, idCanva)) {
            res.status(400).end("YOU CANNOT ACCESS THIS CANVA")
            return;
        }

        

        let timerRestantSecondes = tempsRestantPose(idUser,idCanva);

        res.send("" + timerRestantSecondes);
    }
)

router.post("/:id/pose",
    /**
     * Pose un pixel sur le canva
     * @param {*} req 
     * @param {*} res 
     * @returns
     * 
     * @author Jean-Bernard CAVELIER
     */
    function(req,res) {
        let idCanva = encodeURIComponent(req.params.id);
        let idUser = req.session.login;

        let temps = unixTimestamp();

        if (usersUtil.redirectNotLoggedUsers(req, res)) {
            return;
        }


        if (!userCanAccessCanva(idUser, idCanva)) {
            res.status(400).end("YOU CANNOT ACCESS THIS CANVA")
            return;
        }

        if (tempsRestantPose(idUser,idCanva) != 0) {
            res.status(400).end("YOU CANNOT CHANGE A PIXEL, YOU TIMER HAS NOT ENDED YET");
            return
        }


        let x;
        let y;

        try {
            x = parseInt(req.body['x']);
            y = parseInt(req.body['y']);
        } catch (e) {
            res.status(400).send("X AND Y SHOULD BE NUMBERS")
            return;
        }

        let color = req.body['color'];

        if (!isHexColor(color)) {
            res.status(400).send("YOUR COLOR IS NOT A HEXA COLOR BETWEEN 0x000000 AND 0xffffff");
            return;
        }

        color += "ff";

        let canvaInfos = getCanvaInfos(idCanva);

        if (x < 0 || x > canvaInfos.height || y < 0 || y > canvaInfos.width) {
            res.status(400).send("OUT OF BOUNDS POSITION");
            return;
        }

        db.serialize( () => {
            db.run(`INSERT INTO '${encodeURIComponent(idCanva)}' (pxl_x,pxl_y,couleur,pose) VALUES (?,?,?,?);`, [x,y,color,temps], function(err,result) {
                if (err) {
                    if (err.code == 'SQLITE_CONSTRAINT') {
                        db.run(`UPDATE '${encodeURIComponent(idCanva)}' SET couleur=?,pose=? WHERE pxl_x=? AND pxl_y=?;`, [color,temps,x,y], function(err,result) {
                            if (err) {
                                console.log(err);
                            }
                        })
                    }
                }
            })
            db.run("UPDATE usersInCanva SET dernierePose=? WHERE idCanva=? AND idUser=?;", [temps,idCanva,idUser], function(err,result) {
                if (err) {
                    console.log(err);
                    return;
                }
            })

            db.run(`INSERT INTO history (idCanva,idUser,tempsPose,pxl_x,pxl_y,couleur) VALUES (?,?,?,?,?,?);`, [idCanva,idUser,temps,x, y, color], function (err, result) {
                if (err) {
                    console.log("failed to log in history table")
                    console.log(err);
                }
            })
        })


        res.send("OK")

    }
)

router.get("/:id/getDerniersPixels",
    /**
     * To get all pixels you didn't got from last request
     * @param {*} req 
     * @param {*} res 
     * @returns 
     * 
     * @author Jean-Bernard CAVELIER
     */
    function (req, res) {
        let idCanva = encodeURIComponent(req.params.id);
        let idUser = req.session.login;

        let canvaInfos = getCanvaInfos(idCanva);

        let temps = unixTimestamp();

        if (idCanva != "general") {
            if (usersUtil.redirectNotLoggedUsers(req, res)) {
                return;
            }

            if (!userCanAccessCanva(idUser, idCanva)) {
                res.status(400).end("YOU CANNOT ACCESS THIS CANVA")
                return;
            }

        }

        
        
        if (usersUtil.isLoggedIn(req)) {
        
            db.serialize(() => {

                db.all(`select pxl_x,pxl_y,couleur from '${idCanva}' c, usersInCanva u WHERE u.idUser = ? AND u.idCanva = ? AND c.pose >= u.derniereDemande  `, [idUser, idCanva], function (err, result) {
                    if (err) {
                        console.log(err)
                    } else {

                        res.setHeader('Content-Type', 'application/json')
                        res.end(JSON.stringify(result));
                    }

                })

                // UPDATE DERNIERE POSE
                db.run("UPDATE usersInCanva SET derniereDemande = ? WHERE idCanva = ? AND idUser = ?", [temps, idCanva, idUser], function (err, result) {
                    if (err)
                        console.log(err);
                })

            })
            
        } else { // guest mode
            db.all(`select pxl_x,pxl_y,couleur from '${idCanva}' c WHERE pose>=?`,[temps-3], function (err, result) {
                if (err) {
                    console.log(err)
                } else {
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify(result));
                }

            })
        }


        

        

        


        

    }
)

router.use("/:id/history",
    /**
     * To get a complete history of a canva
     * @param {*} req 
     * @param {*} res 
     * @returns content of a canva
     * 
     * @author Jean-Bernard CAVELIER
     */
    function(req,res) {


        if (usersUtil.redirectNotLoggedUsers(req,res,debug_mode=true)) {
            
            return
        }

        let idUser = req.session.login


        let idCanva = encodeURIComponent(req.params.id);

        if (!userCanAccessCanva(idUser, idCanva)) {
            res.status(400).end("YOU CANNOT ACCESS THIS CANVA")
            return;
        }


        let content = "";

        db.serialize(() => {

            db.all(`select pxl_x,pxl_y,couleur,idUser,tempsPose from history h WHERE h.idCanva = ? ;`, [idCanva], function (err, result) {
                if (err) {
                    console.log(err)
                } else {
                    content += "temps unix,x,y,couleur,user \n"
                    for (key in result) {
                        let line = result[key]
                        content += ""+line.tempsPose+","+line.pxl_x+","+line.pxl_y+","+line.couleur+","+usersUtil.sha256(line.idUser)+"\n"
                    }
                        

                    res.setHeader('Content-Type', 'application/json')
                    res.end(content);
                }
            })

        })
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

        let id = encodeURIComponent(req.params.id);

        let accessible = userCanAccessCanva(req.session.login,id);

        if (!accessible) {
            res.redirect("/404") // canva not accessible or doesn't exist
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
        
        res.render('canvas.ejs', { logged: req.session.loggedin, login: req.session.login, isVip: usersUtil.isVip(req.session.login), error: false });

    }
);











/**
 * Retourne le temps restant pour poser un pixel
 * @param {*} idUser 
 * @param {*} idCanva 
 * @param {*} timerMaxSecondes 
 * @param {*} tempsAccess 
 * @returns timestamp
 * 
 * @author Jean-Bernard CAVELIER
 */
function tempsRestantPose(idUser,idCanva, timerMaxSecondes = {'normal':'10','vip':'3','admin':'0'}, tempsAccess = unixTimestamp() ) {

    let timerRestantSecondes = null;

    let timerMax = null;

    if      (usersUtil.isAdmin(idUser)) 
        timerMax = timerMaxSecondes.admin;
    else if (usersUtil.isVip(idUser)) 
        timerMax = timerMaxSecondes.vip;
    else                                
        timerMax = timerMaxSecondes.normal;

    db.serialize(() => {
        const statement = db.prepare("SELECT dernierePose FROM usersInCanva WHERE idCanva=? AND idUser=?;");
        statement.all([idCanva, idUser], function (err, result) {
            if (err) {
                console.log(err);
                timerRestantSecondes = timerMax;
            }

            if (result) {
                timerRestantSecondes = (result[0].dernierePose === null ? 0 : Math.min(Math.max(0,timerMax - (tempsAccess - result[0].dernierePose)), timerMax))
            } else {

                timerRestantSecondes = timerMax;
            }
        })
        statement.finalize();

    });

    while (timerRestantSecondes == null) {
        deasync.runLoopOnce();
    }

    return timerRestantSecondes;
}


/**
 * Verifie si un string est une couleur en HEXA
 * 
 * @param {*} hex 
 * @returns true si c'est une couleur, false sinon
 * 
 * @author Jean-Bernard CAVELIER
 */
function isHexColor(hex) { 
    return typeof hex === 'string' && hex.length === 8 && hex.startsWith("0x") && !isNaN(Number(hex)) 
}


/**
 * Returns the current UNIX timestamp.
 *
 * @returns {Number}
 * 
 * @author Jean-Bernard CAVELIER
 */
function unixTimestamp() {
    return Math.floor(Date.now() / 1000)
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
            db.run("INSERT INTO usersInCanva(idCanva,idUser,derniereDemande) VALUES (?,?,?)", [idcanva, idOwner,0], function (err, result) {
                
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
                console.log("CANVA "+idcanva+" ALREADY IN DB");
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
                if (row.pxl_x > height || row.pxl_y > width) 
                    return;
                color = parseInt(row.couleur,"16");
                image.setPixelColor(color,row.pxl_x,row.pxl_y)
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

        const statement = db.prepare("SELECT u.idCanva, c.owner, c.name, c.height, c.width FROM usersInCanva u, canvas c WHERE u.idCanva =c.id AND u.idUser=?;");
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