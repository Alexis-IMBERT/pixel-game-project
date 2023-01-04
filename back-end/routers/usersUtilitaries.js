const express = require("express");

const db = require('./database');

const deasync = require('deasync');



function isLoggedIn(req) {
    //console.log(req.session)
    //if (req.session == undefined) return false;
    return req.session.loggedin;
}

function isRank(login,rank) {

    rank = rank.toUpperCase();
    
    let isrank = null;

    db.serialize(() => {

        const statement = db.prepare("SELECT rank FROM users WHERE login=?;");
        statement.get(login, (err, result) => {
            console.log("get");
            if (err) {
                console.log(err);
                isrank = false;
                //next(err);
            }
            //console.log(result);
            if (result) {
                isrank = (result['RANK'] == rank);

            } else {

                // if here that means the user doesn't exist
                // not possible
                // or the session is invalid
                //req.session.destroy();
            }

        });
        statement.finalize();
    });

    while (isrank == null) {
        deasync.runLoopOnce();
    }

    return isrank;
}

function isVip(login) {
    return isRank(login,'VIP');
}

function isAdmin(login) {
    return isRank(login,'ADMIN');
}

function isOwner(login,idCanva) {
    let isowner = null;

    db.serialize(() => {

        const statement = db.prepare("SELECT owner FROM canvas WHERE id=?;");
        statement.get([encodeURIComponent(idCanva)], (err, result) => {
            if (err) {
                console.log(err);
                isowner = false;
                //next(err);
            }
            //console.log(result);
            if (result) {
                isowner = (login == result['owner']);
            } else {
                // if here that means the user doesn't exist
                // not possible
                // or the session is invalid
                //req.session.destroy();
            }

        });
        statement.finalize();
    });

    while (isowner == null) {
        deasync.runLoopOnce();
    }

    return isowner;
}

function exists(login) {
    let res = null;

    db.serialize(() => {

        const statement = db.prepare("SELECT count(*) FROM users WHERE login=?;");
        statement.all([login], function (err, result) {
            console.log(err);
            if (err) {
                console.log(err);
                res = false;
                return;
            }

            if (result) {

                res = result[0]['count(*)'] == 1 ? true : false;

            } else {
                res = false;
                return;
            }

        });
        statement.finalize();
    });

    while (res == null)
        deasync.runLoopOnce();

    return res;
}

function redirectLoggedUsers(req, res, debug_mode = false) {
    if (usersUtil.isLoggedIn(req)) {
        console.log("already logged in");
        if (debug_mode)
            res.status(400).send("already logged in")
        else
            res.redirect('/');
        return true;
    }
    return false;
}

function redirectNotLoggedUsers(req,res) {
    let tests = req.query['tests'];
    if (!usersUtil.isLoggedIn(req.session.login)) {
        if (tests)
            res.status(400).send("YOU ARE NOT LOGGED IN");
        else
            res.redirect("/users/login")
        return true;
    }
    return false;
}



module.exports = {isLoggedIn, isVip, isAdmin, isOwner, exists, redirectLoggedUsers, redirectNotLoggedUsers }