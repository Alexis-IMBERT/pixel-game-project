const express = require('express');
const router = express.Router();

// home
router.use('/home', function (req, res) {
	res.render('index.ejs', { logged: req.session.loggedin, login: req.session.login, error: false, idCanva: "general"  });
});

router.use('/index.html', function (req, res) {
	res.redirect('/');
});

/*router.use("/:lien_erreur", function (req,res, next) {
	console.log("unknown link accessed");
	console.log(req);
	console.log(req.params);
	console.log(req.params.lien_erreur);
	console.log(req.params.lien_erreur.length == 0);
	//res.send("pas ok");
	//res.redirect('/404');
	
});*/

router.use('/', function (req, res) {
	res.redirect('/home');
});

// 404
router.use('*', function (req, res) {
	res.redirect('/404');
});

module.exports = router;