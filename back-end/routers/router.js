const express = require('express');
const router = express.Router();

// home
router.use('/home', function (req, res) {
	res.render('index.ejs', { logged: req.session.loggedin, login: req.session.login, error: false, idCanva: "general"  });
});

router.use('/index.html', function (req, res) {
	res.redirect('/');
});

const profile = require('./profile');
router.use('/perfil', profile);


router.use('/', function (req, res) {
	res.redirect('/home');
});

// 404
router.use('*', function (req, res) {
	res.redirect('/404');
});

module.exports = router;