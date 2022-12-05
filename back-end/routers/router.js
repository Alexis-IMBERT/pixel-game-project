const express = require('express');
const router = express.Router();

// home
router.use('/home', function (req, res) {
	res.render('index.ejs', { logged: req.session.loggedin });
});

router.use('/index.html', function (req, res) {
	res.redirect('/');
});

router.use("/:lien_erreur", function (req,res, next) {
	console.log(req.params.lien_erreur);
	console.log(req.params.lien_erreur.length == 0);
	res.redirect('/404');
	
});

router.use('/', function (req, res) {
	res.redirect('/home');
});

// 404
router.use('*', function (req, res) {
	res.redirect('/404');
});

module.exports = router;