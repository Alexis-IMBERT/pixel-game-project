const express = require("express");

const db = require('./database');

const deasync = require('deasync');


var crypto = require('crypto');

/**
 * hash sha256 of input
 * @param {*} input 
 * @returns hashed value of input
 * 
 * @author Jean-Bernard Cavelier
 */
var sha256 = function (input) {
    return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');
}


/**
 * check if login is connected
 * @param {*} req 
 * @returns boolean
 * @author Jean-Bernard CAVELIER
 */
function isLoggedIn(req) {
    //console.log(req.session)
    //if (req.session == undefined) return false;
    return req.session.loggedin;
}

/**
 * Check if login is rank
 * @param {*} login 
 * @param {*} rank 
 * @returns boolean
 * 
 * @author Jean-Bernard CAVELIER
 */
function isRank(login,rank) {

    rank = rank.toUpperCase();
    
    let isrank = null;

    db.serialize(() => {

        const statement = db.prepare("SELECT rank FROM users WHERE login=?;");
        statement.get(login, (err, result) => {
            if (err) {
                console.log(err);
                isrank = false;
                //next(err);
            }
            //console.log(result);
            if (result) {
                isrank = (result['RANK'] == rank);

            } else {
                console.log("what")
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

/**
 * Check if login is vip
 * @param {*} login 
 * @returns boolean
 * @author Jean-Bernard CAVELIER
 */
function isVip(login) {
    return isRank(login,'VIP');
}

/**
 * Check if login is admin
 * @param {*} login 
 * @returns boolean
 * @author Jean-Bernard CAVELIER
 */
function isAdmin(login) {
    return isRank(login,'ADMIN');
}

/**
 * Check if login is owner of idcanva
 * @param {*} login 
 * @param {*} idCanva 
 * @returns {boolean} isowner
 * 
 * @author Jean-Bernard CAVELIER
 */
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
            if (result) {
                isowner = (login == result['owner']);
            } else {
                isowner = false;
                
            }

        });
        statement.finalize();
    });

    while (isowner == null) {
        deasync.runLoopOnce();
    }

    return isowner;
}

/**
 * Check if user exists in the database
 * 
 * @param {*} login 
 * @returns boolean
 * 
 * @author Jean-Bernard CAVELIER
 */
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

/**
 * redirect connected user to the root page
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {boolean} debug_mode 
 * @returns {boolean} boolean redirected
 * 
 * @author Jean-Bernard CAVELIER
 * 
 */
function redirectLoggedUsers(req, res, debug_mode = false) {
    if (isLoggedIn(req)) {
        console.log("already logged in");
        if (debug_mode)
            res.status(400).send("already logged in")
        else
            res.redirect('/');
        return true;
    }
    return false;
}

/**
 * redirect a user to the login page if he is not connected
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} debug_mode 
 * @returns {boolean}
 * 
 * @author Jean-Bernard CAVELIER
 */
function redirectNotLoggedUsers(req,res,debug_mode=false) {
    let tests = req.query['tests'];
    if (!isLoggedIn(req)) {
        if (debug_mode)
            res.status(400).send("YOU ARE NOT LOGGED IN");
        else
            res.redirect("/users/login")
        return true;
    }
    return false;
}


/**
 * remove a <script></script> tag and its content from a text
 * 
 * @param {*} text 
 * @returns {text} text with <script> </script> tag
 * 
 * @author Jean-Bernard CAVELIER
 */
function removeScript(text) {
    var scriptRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
    return html2 = text.replace(scriptRegex, "");
}



module.exports = {isLoggedIn, isVip, isAdmin, isOwner, exists, redirectLoggedUsers, redirectNotLoggedUsers,sha256, removeScript }