/**  @author Alexis IMBERT */
const express = require('express');
const router = express.Router();
const usersUtil = require('./usersUtilitaries')

router.use('/', (req, res) => {
    /**
     * @author Alexis IMBERT
     *  */
    // Si l'utilisater n'est pas connecter alors il est redirigé vers la page de connection
    if (!usersUtil.isLoggedIn(req)) {
        res.redirect("/users/login")
        return;
    };
    // Sinon on affiche les statistiques
    res.render('profile.ejs', { logged: req.session.loggedin, login: req.session.login, couleur_pref: "couleur pref", nb_pixel_pose: "nb_pixel_pose", nb_canvas: "nb_canva", canvas_plus_actif: "canvas + actif ", nb_pixel_moyen: "nb_pixel_moyen" });
});

module.exports = router;