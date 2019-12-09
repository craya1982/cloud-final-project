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
        res.status(400).json({"Error": "The request object is missing the required number"});
    }
    else {
        data.post_load(req.body.weight, req.body.contents, req.body.origin)
            .then(key => data.get_load(key.id))
            .then(load => {
                if (load === undefined || load === null) throw Error("Not found for some reason");
                res.status(201).json(load)
            })
            .catch(() => res.status(400)
                            .json({"Error": "The request object is missing the required number"}));
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
                if (load === undefined || load === null) throw Error("Not found");
                res.status(200).send(load)
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
            return data.delete_load(load.id)
        }).then(() => res.status(204).end())
        .catch(() => res.status(500).send("Server error"));
});


module.exports = router;
