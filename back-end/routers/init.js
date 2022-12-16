const express = require('express');

const db = require('./database');

const crypto = require('crypto');

const createCanva  = require("./canvas").createCanva;



function initDatabase() {

    if (!createCanva("general","general","serveur",1000,1000,false)) {
        console.log("general canva already in db, skipping initialisation");
    } else {
        console.log("canva general created")
    }

}



module.exports = { initDatabase }