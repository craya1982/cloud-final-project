//Datastore items
const {Datastore} = require('@google-cloud/datastore');
const datastore = new Datastore({projectId: "lucc-gae-final"});
const STATE = "state";
const USER = "users";
const LOADS = "loads";
const BOATS = "boats";

const BASE_URL = "https://lucc-gae-final.appspot.com/";

//Returns a specified user
function get_user(id) {
    const key = datastore.key([USER, parseInt(id, 10)]);
    return datastore.get(key);
}

//Validates that all required params are included in the request
function validate_boat_params(req) {
    return !(req.body === null || req.body === undefined || req.body.name === null ||
        req.body.name === undefined || req.body.type === null || req.body.type ===
        undefined || req.body.length === null || req.body.length === undefined ||
        isNaN(req.body.length));
}

//Validates that all provided params are valid AND that at least one is present
//Returns false if no params provided OR if any of the provided params are in an invalid format
function validate_all_provided_boat_params_valid(req, sub) {
    var minimumParamsPresent = false;
    if (req.body !== null && req.body !== undefined) {
        if (req.body.name !== null && req.body.name !== undefined) {
            minimumParamsPresent = true;
        }
        if (req.body.type !== null && req.body.type !== undefined) {
            minimumParamsPresent = true;
        }
        if (req.body.length !== null && req.body.length !== undefined) {
            //Invalidate flag if length is NaN
            minimumParamsPresent = !isNaN(req.body.length);
        }
        if (req.body.owner !== null && req.body.owner !== undefined) {
            minimumParamsPresent = req.body.owner === sub;
        }
    }
    return minimumParamsPresent;
}

function post_boat(name, type, length, owner) {
    var key = datastore.key(BOATS);
    const new_boat = {
        "name": `${name}`,
        "type": `${type}`,
        "length": Number(length),
        "owner": `${owner}`
    };
    return datastore.save({"key": key, "data": new_boat}).then(() => key);
}

async function get_boats_by_owner(sub) {
    const q = datastore.createQuery(BOATS).filter('owner', '=', sub);
    return datastore.runQuery(q).then(async entities => {
        var results = [];
        for (var boat of entities[0]) {
            results.push(await fromBoatDatastore(boat))
        }
        return results;
    });
}

async function get_boats_paged(req) {
    var q = datastore.createQuery(BOATS).limit(5);
    var count = (await datastore.runQuery(datastore.createQuery(BOATS)))[0].length;

    const results = {};
    var prev;
    if (Object.keys(req.query).includes("cursor")) {
        prev = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" + req.query.cursor;
        q = q.start(req.query.cursor);
    }
    return datastore.runQuery(q).then(async (entities) => {
        results.items = [];
        results.total_records = count;
        for (boat of entities[0]) {
            results.items.push(await fromBoatDatastore(boat));
        }

        if (entities[1].moreResults !== Datastore.NO_MORE_RESULTS) {
            results.next = req.protocol + "://" + req.get("host") + req.baseUrl + "?cursor=" +
                entities[1].endCursor;
        }
        return results;
    });
}

//Returns a specified boat
function get_boat(id) {
    if (isNaN(id)) {
        return Promise.resolve(null)
    }
    try {
        const key = datastore.key([BOATS, parseInt(id, 10)]);
        return datastore.get(key).then(data => fromBoatDatastore(data[0]));
    } catch (e) {
        return Promise.resolve(null)
    }
}

//Modifies all fields on the specified boat
function put_boat(id, name, type, length, sub) {
    const key = datastore.key([BOATS, parseInt(id, 10)]);
    const modified_boat = {
        "name": `${name}`,
        "type": `${type}`,
        "length": Number(length),
        "owner": `${sub}`
    };
    return datastore.save({"key": key, "data": modified_boat}).then(() => key);
}

//Modifies NONNULL fields on a provided boat
function patch_boat(id, name, type, length, boat) {
    const key = datastore.key([BOATS, parseInt(id, 10)]);
    const modified_boat = {
        "name": name !== null && name !== undefined ? `${name}` : boat.name,
        "type": type !== null && type !== undefined ? `${type}` : boat.type,
        "length": length !== null && length !== undefined ? Number(length) : boat.length,
        "owner": boat.owner
    };
    return datastore.save({"key": key, "data": modified_boat}).then(() => key);
}

//Removes a boat from the data store
function delete_boat(id) {
    const key = datastore.key([BOATS, parseInt(id, 10)]);
    return datastore.delete(key);
}

//Appends id and self to a datastore item before sending them to the client
async function fromBoatDatastore(item) {
    if (item === null || item === undefined) return item;
    item.id = item[Datastore.KEY].id;
    item.self = `${BASE_URL}${BOATS}/${item.id}`;

    let query = datastore.createQuery(LOADS).filter('current_boat', '=', item.id);
    let results = await datastore.runQuery(query);
    item.loads = [];

    if (results !== undefined && results !== null && results[0] !== null && results[0] !==
        undefined && results[0].length !== 0) {
        for (let result of results[0]) {
            item.loads.push(result);
        }
    }

    return item;
}


/* SLIP DATASTORE METHODS */
function fromLoadDatastore(item) {
    item.id = item[Datastore.KEY].id;
    item.self = `${BASE_URL}${LOADS}/${item.id}`;
    return item;
}

function validate_load_items(req) {
    return !(req.body === null || req.body === undefined || req.body.weight === null ||
        req.body.weight === undefined || isNaN(req.body.weight) || req.body.contents === null ||
        req.body.contents === undefined || req.body.origin === null || req.body.origin ===
        undefined);
}

function validate_all_provided_load_params_valid(req) {
    let minimumParamsPresent = false;
    if (req.body !== null && req.body !== undefined) {
        if (req.body.contents !== null && req.body.contents !== undefined) {
            minimumParamsPresent = true;
        }
        if (req.body.weight !== null && req.body.weight !== undefined) {
            minimumParamsPresent = !isNaN(req.body.weight);
        }
        if (req.body.origin !== null && req.body.length !== origin) {
            //Invalidate flag if length is NaN
            minimumParamsPresent = true;
        }
    }
    return minimumParamsPresent;
}


function post_load(weight, contents, origin) {
    const key = datastore.key(LOADS);
    const new_load = {
        "weight": Number(weight),
        "current_boat": null,
        "origin": `${origin}`,
        "contents": `${contents}`
    };
    return datastore.save({"key": key, "data": new_load}).then(() => key);
}

function get_load(load_id) {
    const key = datastore.key([LOADS, parseInt(load_id, 10)]);
    return datastore.get(key).then(entities => fromLoadDatastore(entities[0]));
}

function get_loads() {
    const q = datastore.createQuery(LOADS);
    return datastore.runQuery(q).then(entities => entities[0].map(fromLoadDatastore));
}

function delete_load(id) {
    const key = datastore.key([LOADS, parseInt(id, 10)]);
    return datastore.delete(key);
}

function patch_load(id, weight, origin, contents, load) {
    const key = datastore.key([LOADS, parseInt(id, 10)]);
    const modified_load = {
        "weight": weight !== null && weight !== undefined ? Number(weight) : load.weight,
        "origin": origin !== null && origin !== undefined ? `${origin}` : load.origin,
        "contents": contents !== null && contents !== undefined ? `${contents}` : load.contents,
        "current_boat": load.current_boat
    };
    return datastore.save({"key": key, "data": modified_load}).then(() => key);
}

function put_load(id, weight, origin, contents, load) {
    const key = datastore.key([LOADS, parseInt(id, 10)]);
    const modified_load = {
        "weight": Number(weight),
        "origin": `${origin}`,
        "contents": `${contents}`,
        "current_boat": load.current_boat
    };
    return datastore.save({"key": key, "data": modified_load}).then(() => key);
}

module.exports = {
    USER: USER,
    STATE: STATE,
    DATASTORE: datastore,
    BOATS: BOATS,
    LOADS: LOADS,
    KEY: datastore.KEY,
    get_user: get_user,
    validate_boat_params: validate_boat_params,
    post_boat: post_boat,
    get_boat: get_boat,
    validate_all_provided_boat_params_valid: validate_all_provided_boat_params_valid,
    patch_boat: patch_boat,
    get_boats_paged: get_boats_paged,
    get_boats_by_owner: get_boats_by_owner,
    put_boat: put_boat,
    delete_boat: delete_boat,
    validate_load_items: validate_load_items,
    validate_all_provided_load_params_valid: validate_all_provided_load_params_valid,
    post_load: post_load,
    get_load: get_load,
    get_loads: get_loads,
    delete_load: delete_load,
    patch_load: patch_load,
    put_load: put_load
};