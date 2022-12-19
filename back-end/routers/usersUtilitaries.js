const express = require("express");

const db = require('./database');

const deasync = require('deasync');



function isLoggedIn(req) {
    //console.log(req.session)
    //if (req.session == undefined) return false;
    return req.session.loggedin;
}

function isRank(req,rank) {

    rank = rank.toUpperCase();
    
    let isrank = null;

    db.serialize(() => {

        const statement = db.prepare("SELECT rank FROM users WHERE login=?;");
        statement.get(req.session.login, (err, result) => {
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

function isVip(req) {
    return isRank(req,'VIP');
}

function isAdmin(req) {
    return isRank(req,'ADMIN');
}

function isOwner(req,idCanva) {
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
                isowner = (req.session.login == result['owner']);
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
module.exports = {isLoggedIn, isVip, isAdmin, isOwner }