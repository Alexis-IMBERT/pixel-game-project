const express = require('express');

const db = require('./database');

const crypto = require('crypto');
const uuid = crypto.randomUUID;

function initDatabase() {
    db.run("INSERT INTO canvas(id,name,owner,height,length) VALUES(?,?,?,?,?);", ["general","general" ,"serveur", 1000, 1000], function (err, result) {
        if (err) {
            console.log("canva general already exists, skipping initialisation");
            return;
        }

        console.log("canva general created");

    })
}



module.exports = { initDatabase }