const express = require('express');
const router = express.Router();

router.use("/404", function(req, res) {
	res.status(404);
	res.render('404.ejs', { logged: req.session.loggedin });
});

// home
/*router.use('/home', function (req, res) {
	if (req.params.id)
		res.redirect('/404')
	else
});*/

router.use('/index.html', function (req, res) {
	res.redirect('/');
});


router.use('/:id', function (req, res,next) {
	if (!req.params.id)
		next() // si le lien est /
	else 
		res.redirect("/404")
});


router.use("/", function (req, res) {
	res.render('index.ejs', { logged: req.session.loggedin, login: req.session.login, error: false, idCanva: "general" });

})

// 404

router.use( (err,req,res) => {
	res.redirect("/404")
})


module.exports = router;