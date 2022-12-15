const express = require('express');

const sqlite3 = require('sqlite3').verbose();

/**
 * connecting an existing database (handling errors)
 * @author Jean-Bernard Cavelier
 */
const db = new sqlite3.Database('./db/pixelwar.sqlite', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the database!');
});


module.exports = db;