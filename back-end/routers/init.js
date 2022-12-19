const express = require('express');

const db = require('./database');

const crypto = require('crypto');

const createCanva  = require("./canvas").createCanva;

function initDatabase() {

    db.serialize(() => {
        db.run(".read db/init.sql; " , (err,result) => {
            if (err) {
                console.log(err);
            }
        })
    })

}

function initGeneralCanva() {

    if (!createCanva("general","general","serveur",1000,1000,false)) {
        console.log("general canva already in db, skipping initialisation");
    } else {
        console.log("canva general created")
    }

}



module.exports = { initDatabase, initGeneralCanva }