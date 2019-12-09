const express = require('express');
const data = require('../datastore/datastore');
const auth = require('../auth/authentication');
const router = express.Router();

router.post('/', async function (req, res) {
    let sub = await auth.verify_and_extract_sub(get_authorization_header(req)).catch(() => null);
    const accepts = req.accepts(['application/json']);
    if (!accepts) {
        res.status(406).send('Must accept JSON responses');
    }
    else if (req.get('content-type') !== 'application/json') {
        res.status(415).send('Server only accepts application/json data.');
    }
    else if (sub === null || sub === undefined) {
        res.status(401).send("Invalid jwt");
    }
    else if (!data.validate_boat_params(req)) {
        res.status(400).send("Invalid body parameters");
    }
    else {
        return data.post_boat(req.body.name, req.body.type, req.body.length, sub)
                   .then(key => data.get_boat(key.id))
                   .then(boat => {
                       res.location(boat.self);
                       res.status(201).json(boat);
                   });
    }
});

//Modifies all fields on a boat in the datastore
router.put('/:id', async function (req, res) {
    let sub = await auth.verify_and_extract_sub(get_authorization_header(req)).catch(() => null);
    if (req.get('content-type') !== 'application/json') {
        res.status(415).send('Server only accepts application/json data.');
    }
    else if (sub === null || sub === undefined) {
        res.status(401).send("Invalid jwt");
    }
    else if (data.validate_boat_params(req)) {
        data.get_boat(req.params.id)
            .then(boat => {
                if (boat === null || boat === undefined) {
                    res.status(404).end();
                }
                else if (boat.owner !== sub) {
                    res.status(403).send("Invalid owner");
                }
                else {
                    return data.put_boat(req.params.id, req.body.name,
                                         req.body.type,
                                         req.body.length, sub)
                               .then(key => data.get_boat(key.id))
                               .then(boat => {
                                   res.location(boat.self);
                                   res.status(303).end();
                               });
                }
            })
    }
    else {
        res.status(400).send("Invalid body parameters");
    }
});

//Modifies only provided fields on a boat in the data store
router.patch('/:id', async function (req, res) {
    let sub = await auth.verify_and_extract_sub(get_authorization_header(req)).catch(() => null);
    if (req.get('content-type') !== 'application/json') {
        res.status(415).send('Server only accepts application/json data.');
    }
    else if (sub === null || sub === undefined) {
        res.status(401).send("Invalid jwt");
    }
    else if (data.validate_all_provided_boat_params_valid(req, sub)) {
        data.get_boat(req.params.id)
            .then(boat => {
                if (boat === null || boat === undefined) {
                    res.status(404).end();
                }
                else if (boat.owner !== sub) {
                    res.status(403).send("Invalid owner");
                }
                else {
                    return data.patch_boat(req.params.id, req.body.name,
                                           req.body.type,
                                           req.body.length, boat)
                               .then(key => data.get_boat(key.id))
                               .then(boat => {
                                   res.location(boat.self);
                                   res.status(200).json(boat);
                               });
                }
            })
    }
    else {
        res.status(400).send("Invalid body parameters");
    }
});

router.get('/:id', function (req, res) {
    const accepts = req.accepts(['application/json']);

    if (!accepts) {
        res.status(406).send('Must accept JSON responses');
    }
    else {
        data.get_boat(req.params.id)
            .then(boat => {
                if (boat === undefined || boat === null) throw Error("Not found");
                res.status(200).send(boat)

            })
            .catch(() => res.status(404).json({"Error": "No boat with this boat_id exists"}));
    }
});

router.get('/', async function (req, res) {
    const accepts = req.accepts(['application/json']);
    let sub = await auth.verify_and_extract_sub(get_authorization_header(req)).catch(() => null);

    if (!accepts) {
        res.status(406).send('Must accept JSON responses');
    }
    else {
        if (sub !== null && sub !== undefined) {
            data.get_boats_by_owner(sub).then((boats) => {
                res.status(200).json(boats)
            }).catch(error => res.send(error));
        }
        else {
            data.get_boats_paged(req).then((boats) => {
                res.status(200).json(boats)
            }).catch(error => res.send(error));
        }
    }
});

router.delete('/:id', async function (req, res) {
    let sub = await auth.verify_and_extract_sub(get_authorization_header(req)).catch(() => null);

    if (sub === null || sub === undefined) {
        res.status(401).send("Invalid jwt");
    }
    else {
        data.get_boat(req.params.id)
            .then(boat => {
                if (boat === undefined || boat === null) {
                    throw Error("Not found for some reason");
                }
                else if (boat.owner === sub) {
                    return data.delete_boat(boat.id)
                }
                else {
                    res.status(403).send("Owner of boat doesn't match JWT");
                }
            }).then(() => res.status(204).end())
            .catch(() => res.status(404).json({"Error": "No boat with this boat_id exists"}));
    }
});

function get_authorization_header(req) {
    if (req === null || req === undefined || req.headers === null || req.headers === undefined) {
        return null
    }
    // check header or url parameters or post parameters for token
    let token = null;
    const tokenHeader = req.headers["authorization"];

    if (tokenHeader === null || tokenHeader === undefined) {
        return null
    }

    let items = tokenHeader.split(/[ ]+/);

    if (items.length > 1 && items[0].trim().toLowerCase() === "bearer") {
        token = items[1];
    }
    return token
}

module.exports = router;