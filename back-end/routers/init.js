const express = require('express');

const db = require('./database');

const crypto = require('crypto');

const createCanva  = require("./canvas").createCanva;

function initDatabase() {

    db.serialize(() => {
        db.run("CREATE TABLE users ('LOGIN' VARCHAR PRIMARY KEY,'PASSWORD' VARCHAR NOT NULL,'RANK' VARCHAR NOT NULL DEFAULT 'NORMAL',CHECK(RANK IN('NORMAL', 'VIP', 'ADMIN'))); ", function (err, result) {
            if (err) {
                console.log("TABLE users ALREADY IN DB")
            } else {
                console.log("TABLE users CREATED")
            }
        });

        db.run("CREATE TABLE canvas (id VARCHAR PRIMARY KEY,name VARCHAR NOT NULL,owner VARCHAR NOT NULL,height INTEGER NOT NULL,width INTEGER NOT NULL,FOREIGN KEY(owner) REFERENCES users(login)); ", (err, result) => {
            if (err) {
                console.log("TABLE canvas ALREADY IN DB");
            } else {
                console.log("TABLE canvas CREATED")
            }
        })

        db.run("CREATE TABLE usersInCanva (idCanva VARCHAR,idUser VARCHAR,dernierePose TIMESTAMP,derniereDemande TIMESTAMP,FOREIGN KEY(idUser) REFERENCES users(login),FOREIGN KEY(idCanva) REFERENCES canvas(id),CONSTRAINT can_us PRIMARY KEY(idCanva, idUser)); ", (err, result) => {
            if (err) {
                console.log("TABLE usersInCanva ALREADY IN DB");
            } else {
                console.log("TABLE usersInCanva CREATED")
            }
        })

        db.run("CREATE TABLE history (idCanva VARCHAR,idUser VARCHAR,tempsPose TIMESTAMP,pxl_x INTEGER,pxl_y INTEGER,couleur VARCHAR,FOREIGN KEY(idUser) REFERENCES users(login),FOREIGN KEY(idCanva) REFERENCES canvas(id),CONSTRAINT can_us PRIMARY KEY(idCanva, idUser, tempsPose)); ", (err, result) => {
            if (err) {
                console.log("TABLE history ALREADY IN DB");
            } else {
                console.log("TABLE history CREATED")
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