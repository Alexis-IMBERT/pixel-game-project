const express = require('express');
const router = express.Router();

// home
router.use('/home', function (req, res) {
	res.render('index.ejs', { logged: req.session.loggedin });
});

router.use('/index.html', function (req, res) {
	res.redirect('/');
});

/*router.use("/:lien", function (req,res, next) {
	console.log(req.params.lien);
	next("injection");
	if (req.params.lien === "") {
		//next("/*");
	} else {
		//next(Error("File not found"))
	}	
});*/

router.use('/', function (req, res) {
	res.redirect('/home');
});

// 404
router.use('*', function (err, req, res) {
	res.status(404);
	res.render('404.ejs', { logged: req.session.loggedin });
});

module.exports = router;