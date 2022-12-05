const express = require('express');
const router = express.Router();

// home
router.use('/home', function (req, res) {
	res.render('index.ejs', { logged: req.session.loggedin });
});

router.use('/index.html', function (req, res) {
	res.redirect('/');
});

router.use('/', function (req, res) {
	res.redirect('/home');
});

module.exports = router;