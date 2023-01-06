/**  @author Alexis IMBERT */
const express = require('express');
const db = require('./database');
const router = express.Router();
const usersUtil = require('./usersUtilitaries')

function precise(x) {
    /**
     * Fonction pour arrondir un nombre 
     */
    return Math.round(x*1000)/1000;
}

/**
 *  @author Alexis IMBERT
 */
router.use('/', (req, res) => {
    
    // Si l'utilisater n'est pas connecter alors il est redirigé vers la page de connection
    if (!usersUtil.isLoggedIn(req)) {
        res.redirect("/users/login")
        return;
    };

    let login = req.session.login;
    let nombre_pixel_pose;
    let nombre_canvas;
    let ratio;
    let couleur_pref;
    let canvas_plus_actif;
    db.serialize(() => {
        // Requete dans le BD pour selectionner le nombre de pixel posé par un utilisateur
        const statement_nombre_pixel = db.prepare("SELECT COUNT(*) FROM history WHERE idUser = ?;")
        statement_nombre_pixel.get(login, (err, result) => {
            if (err) {
                console.log(err);
                res.status(400).send("Bad request");
                return;
            }
            console.log(result);
            if (result) {
                nombre_pixel_pose = result['COUNT(*)'];
            } else {
                nombre_pixel_pose = 0;
            }
            // requete BD pour le le nombre de canvas ou un utilisateur est inscrit
            const statement_nombre_canva_inscrit = db.prepare("SELECT COUNT(*) FROM usersInCanva WHERE idUser = ?;");
            statement_nombre_canva_inscrit.get(login, (err, result) => {
                if (err) {
                    console.log(err);
                    res.status(400).send("Bad request");
                    return;
                }
                if (result) {
                    nombre_canvas = result['COUNT(*)'];
                } else {
                    nombre_canvas = 0;
                }
                if (nombre_pixel_pose>0) {
                    // calcul du ratio nb_pixel/nb_canva
                    ratio = nombre_pixel_pose / nombre_canvas;
                    ratio = precise(ratio);
                    // requete BD pour selectionner la couleur préférer de l'utilisateur
                    const statement_couleur_pref = db.prepare("SELECT couleur, COUNT(*) as count FROM history WHERE idUser = ? GROUP BY couleur ORDER BY count DESC LIMIT 1;")
                    statement_couleur_pref.get(login, (err, result) => {
                        if (err) {
                            console.log(err);
                            res.status(400).send("Bad request");
                            return;
                        }
                        couleur_pref = result['couleur'];
                        couleur_pref = couleur_pref.substr(2);
                        couleur_pref = "#" + couleur_pref;
                        // requete BD pour donner le canva le plus utilisé
                        const statement_canvas_plus_utilise = db.prepare("SELECT canvas.name, COUNT(*) as count FROM history INNER JOIN canvas ON history.idCanva = canvas.id WHERE history.idUser = ? GROUP BY canvas.name ORDER BY count DESC LIMIT 1;");
                        statement_canvas_plus_utilise.get(login, (err, result) => {
                            if (err) {
                                console.log(err);
                                res.status(400).send("Bad request");
                                return;
                            }
                            canvas_plus_actif = result['name']
                            res.render('profile.ejs', { logged: req.session.loggedin, login: login, couleur_pref: couleur_pref, nb_pixel_pose: nombre_pixel_pose, nb_canvas: nombre_canvas, canvas_plus_actif: canvas_plus_actif, nb_pixel_moyen: ratio });
                        })
                    });
                } else {
                    // dans le cas ou l'utilisateur n'a effectué aucune action
                    couleur_pref = "Incolore";
                    nb_pixel_pose = 0;
                    nb_canvas = 0;
                    canvas_plus_actif = "LES TP DE WEB";
                    ratio = "X";
                    res.render('profile.ejs', { logged: req.session.loggedin, login: login, couleur_pref: couleur_pref, nb_pixel_pose: nombre_pixel_pose, nb_canvas: nombre_canvas, canvas_plus_actif: canvas_plus_actif, nb_pixel_moyen: ratio });
                }
            })
        })
    })
});

module.exports = router;