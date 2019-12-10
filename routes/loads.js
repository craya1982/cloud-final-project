const express = require('express');
const data = require('../datastore/datastore');
const router = express.Router();

router.post('/', function (req, res) {
    const accepts = req.accepts(['application/json']);
    if (!accepts) {
        res.status(406).send('Must accept JSON responses');
    }
    else if (req.get('content-type') !== 'application/json') {
        res.status(415).send('Server only accepts application/json data.');
    }
    else if (!data.validate_load_items(req)) {
        res.status(400).send("Invalid body parameters");
    }
    else {
        data.post_load(req.body.weight, req.body.contents, req.body.origin)
            .then(key => data.get_load(key.id))
            .then(load => {
                if (load === undefined || load === null) {
                    res.status(404).end();
                }
                else {
                    res.location(load.self);
                    res.status(201).json(load);
                }
            })
            .catch((e) => {
                console.log(e);
                res.status(500)
                   .send("Server Error")
            });
    }
});

router.put('/:id', async function (req, res) {
    if (req.get('content-type') !== 'application/json') {
        res.status(415).send('Server only accepts application/json data.');
    }
    else if (data.validate_load_items(req)) {
        data.get_load(req.params.id)
            .then(load => {
                if (load === null || load === undefined) {
                    res.status(404).end();
                }
                else {
                    return data.put_load(req.params.id, req.body.weight, req.body.contents,
                                         req.body.origin, load)
                               .then(key => data.get_load(key.id))
                               .then(load => {
                                   res.location(load.self);
                                   res.status(303).end();
                               });
                }
            })
            .catch(() => {
                res.status(404).end()
            });
    }
    else {
        res.status(400).send("Invalid body parameters");
    }
});

//Assigns a load to a boat
router.put('/:id/boat/:boat_id', async function (req, res) {
    const accepts = req.accepts(['application/json']);
    if (!accepts) {
        res.status(406).send('Must accept JSON responses');
    }
    else {
        data.get_load(req.params.id)
            .then(load => {
                if (load === null || load === undefined) {
                    res.status(404).end();
                }
                else {
                    return data.get_boat(req.params.boat_id)
                               .then(boat => {
                                   if (boat === null || boat === undefined) {
                                       res.status(404).end();
                                   }
                                   else {
                                       data.put_load_on_boat(load, boat.id)
                                           .then(key => data.get_load(key.id))
                                           .then((new_load => {
                                               res.location(new_load.self);
                                               res.status(201).json(new_load);
                                           }));
                                   }
                               })
                }
            })
            .catch((e) => {
                console.log(e);
                res.status(404).end()
            });
    }
});

//Removes the load from its assigned boat
router.delete('/:id/boat/', async function (req, res) {

    data.get_load(req.params.id)
        .then(load => {
            if (load === null || load === undefined) {
                res.status(404).end();
            }
            else {
                data.remove_load_from_boat(load, boat.id)
                    .then((() => {
                        res.status(204).end();
                    }));
            }
        })
        .catch((e) => {
            res.status(404).end()
        });

});

router.patch('/:id', async function (req, res) {
    const accepts = req.accepts(['application/json']);
    if (!accepts) {
        res.status(406).send('Must accept JSON responses');
    }
    else if (req.get('content-type') !== 'application/json') {
        res.status(415).send('Server only accepts application/json data.');
    }
    else if (data.validate_all_provided_load_params_valid(req)) {
        data.get_load(req.params.id)
            .then(load => {
                if (load === null || load === undefined) {
                    res.status(404).end();
                }
                else {
                    return data.patch_load(req.params.id, req.body.name,
                                           req.body.type,
                                           req.body.length,
                                           load)
                               .then(key => data.get_load(key.id))
                               .then(load => {
                                   res.location(load.self);
                                   res.status(200).json(load);
                               })
                               .catch(() => res.status(404).end());
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
        data.get_load(req.params.id)
            .then(load => {
                if (load === undefined || load === null) {
                    res.status(404).end();
                }
                else {
                    res.status(200).send(load)
                }
            })
            .catch(() => res.status(404).json({"Error": "No load with this load_id exists"}));
    }
});

router.get('/', function (req, res) {
    const accepts = req.accepts(['application/json']);
    if (!accepts) {
        res.status(406).send('Must accept JSON responses');
    }
    else {
        data.get_loads()
            .then((loads) => res.status(200).json(loads))
            .catch(error => res.status(500).send(error));
    }
});

router.delete('/:id', function (req, res) {
    data.get_load(req.params.id)
        .then(load => {
            if (load === undefined || load === null) {
                res.status(404).json(
                    {"Error": "No load with this load_id exists"});
            }
            else {
                return data.delete_load(load.id);
            }
        }).then(() => res.status(204).end())
        .catch(() => res.status(500).send("Server error"));
});

router.delete('/', function (req, res) {
    res.set('Accept', 'GET');
    res.status(405).end();
});

router.put('/', function (req, res) {
    res.set('Accept', 'GET, POST');
    res.status(405).end();
});

module.exports = router;
