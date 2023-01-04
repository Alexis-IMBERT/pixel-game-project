const express = require('express');
const router = express.Router();

router.use('/', (req, res) => {
    res.render('profile.ejs', { logged: req.session.loggedin, login: req.session.login, testest:"ouioui"});
});





module.exports = router;