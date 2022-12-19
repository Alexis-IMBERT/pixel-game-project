// import express module and create your express app
const express = require('express');
const app = express();


// import  and use express-session module
const session = require('express-session');

app.use(session({
	secret: 'login', //used to sign the session ID cookie
	name: 'pixelwar', // (optional) name of the session cookie
	resave: true, // forces the session to be saved back to the session store
	saveUninitialized: true, // forces a session an uninitialized session to be saved to the store	
	cookie: {secure:false}
}));


// set the server host and port
const port = 3000;

// add data to req.body (for POST requests)

// serve static files
app.use(express.static('../front-end'));

// set the view engine to ejs
app.set('view engine', 'ejs');



// routers
app.use("/404", function(req, res) {
	res.status(404);
	console.log(req.session)
	res.render('404.ejs', { logged: req.session.loggedin });
});


const users = require('./routers/users');
app.use('/users', express.static('../front-end'));
app.use('/users', users);

const canvas = require('./routers/canvas').router
app.use('/canvas', express.static('../front-end'));
app.use('/canvas', canvas)



const router = require('./routers/router');
app.use('/', router);



const init = require("./routers/init")

// run the server
app.listen(port, () => {
	// callback executed when the server is launched
	console.log(`Express app listening on port ${port}`);

	//init.initDatabase()

	init.initGeneralCanva();
	
});