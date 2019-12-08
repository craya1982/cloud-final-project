const express = require('express');
const data = require('../datastore/datastore');
const auth = require('../auth/authentication');
const router = express.Router();

router.post('/', async function (req, res) {
    let sub = await auth.verify_and_extract_sub().catch(() => null);
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
    else if (!data.validate_boat_params(req, sub)) {
        res.status(400).send("Invalid body parameters");
    }
    else {
        return data.check_if_boat_name_unique(req.body.name)
                   .then(valid => {
                       if (valid) {
                           return data.post_boat(req.body.name, req.body.type, req.body.length,
                                                 sub);
                       }
                       else {
                           res.status(403).send("Name must be unique");
                       }
                   })
                   .then(key => data.get_boat(key.id))
                   .then(boat => {
                       res.location(boat.self);
                       res.status(201).json(boat);
                   });
    }
});

//Modifies all fields on a boat in the datastore
router.put('/:id', async function (req, res) {
    let sub = await auth.verify_and_extract_sub().catch(() => null);
    if (req.get('content-type') !== 'application/json') {
        res.status(415).send('Server only accepts application/json data.');
    }
    else if (sub === null || sub === undefined) {
        res.status(401).send("Invalid jwt");
    }
    else if (data.validate_boat_params(req, sub)) {
        data.get_boat(req.params.id)
            .then(boat => {
                if (boat === null || boat === undefined) {
                    res.status(404).end();
                }
                else if (boat.owner !== sub) {
                    //TODO
                    res.status(401).send("Invalid owner");
                }
                else if (req.body.name === boat.name) {
                    return data.put_boat(req.params.id, req.body.name, req.body.type,
                                         req.body.length,
                                         sub);
                }
                else {
                    return data.check_if_boat_name_unique(req.body.name)
                               .then(valid => {
                                   if (valid) {
                                       return data.put_boat(req.params.id, req.body.name,
                                                            req.body.type,
                                                            req.body.length, sub);
                                   }
                                   else {
                                       res.status(403).send("Name must be unique");
                                   }
                               })
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
    let sub = await auth.verify_and_extract_sub().catch(() => null);
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
                    //TODO
                    res.status(401).send("Invalid owner");
                }
                else if (req.body.name === boat.name) {
                    return data.patch_boat(req.params.id, req.body.name, req.body.type,
                                           req.body.length,
                                           boat);
                }
                else {
                    return data.check_if_boat_name_unique(req.body.name)
                               .then(valid => {
                                   if (valid) {
                                       return data.patch_boat(req.params.id, req.body.name,
                                                              req.body.type,
                                                              req.body.length, boat);
                                   }
                                   else {
                                       res.status(403).send("Name must be unique");
                                   }
                               })
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
    data.get_boat(req.params.id)
        .then(boat => {
            if (boat === undefined || boat === null) throw Error("Not found");
            res.status(200).send(boat)
        })
        .catch(() => res.status(404).json({"Error": "No boat with this boat_id exists"}));
});

router.get('/', function (req, res) {
    data.get_boats(req).then((boats) => {
        console.log(boats);
        res.status(200).json(boats)
    }).catch(error => res.send(error));
});

router.delete('/:id', async function (req, res) {
    let sub = await auth.verify_and_extract_sub().catch(() => null);
    if (sub === null || sub === undefined) {
        res.status(401).send("Invalid jwt");
    }
    data.get_boat(req.params.id).then(boat => {
        if (boat === undefined || boat === null) {
            throw Error("Not found for some reason");
        }
        else if (boat.owner === sub) {
            return data.delete_boat(boat.id)
        }
        else {
            res.status(401).send("Owner of boat doesn't match JWT");
        }
    }).then(() => res.status(204).end())
        .catch(() => res.status(404).json({"Error": "No boat with this boat_id exists"}));
});

module.exports = router;