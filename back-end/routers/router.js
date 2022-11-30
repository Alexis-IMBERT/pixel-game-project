const express = require('express');
const router = express.Router();

// home
router.use('/home', function (req, res) {
	res.redirect('/');
});

router.use('/index.html', function (req, res) {
	res.redirect('/');
});

router.use('/', function (req, res) {
	res.render('index.ejs', {logged: req.session.loggedin});
});

// 404
router.use('*', function(req, res){
    res.status(404);
	res.render('404.ejs', {logged: req.session.loggedin});
});

module.exports = router;