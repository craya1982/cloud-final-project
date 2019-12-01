const express = require('express');
const router = express.Router();
const oauth = require('./oauth');
const datastore = require('../datastore/datastore');

function validate_user_params(req) {

}

//Adds a new user to the data store
router.post('/', async function (req, res) {
    let jwtSub = await oauth.verify_and_extract_sub(req).catch(e => null);
    if (jwtSub === null || jwtSub === undefined) {
        res.status(401).send("Invalid jwt");
    } else if (boats_datastore.validate_params(req)) {
        return boats_datastore.post_boat(req.body.name, req.body.type, req.body.length, jwtSub)
            .then(key => boats_datastore.get_boat(key.id))
            .then(boat => res.status(201).json(boat))
            .catch(e => res.status(500).send("Unknown server error"));
    } else {
        res.status(400).send("Invalid body parameters");
    }
});