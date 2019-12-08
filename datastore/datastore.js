//Datastore items
const {Datastore} = require('@google-cloud/datastore');
const datastore = new Datastore({projectId: "lucc-gae-final"});
const STATE = "state";
const USER = "users";
const LOADS = "loads";
const BOATS = "boats";

const BASE_URL = "http://adslkgj/";

//Returns a specified user
function get_user(id) {
    const key = datastore.key([USER, parseInt(id, 10)]);
    return datastore.get(key);
}

//Validates that all required params are included in the request
function validate_boat_params(req, sub) {
    return !(req.body === null || req.body === undefined || req.body.name === null ||
        req.body.name === undefined || typeof req.body.name !== "string" ||
        !req.body.name.matches(/^[A-Za-z]+$/) || req.body.type === null || req.body.type ===
        undefined || req.body.length === null || req.body.length === undefined ||
        isNaN(req.body.length) || req.body.owner !== sub);
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

//Checks if a boat name already exists
//Returns true if so, false otherwise
async function check_if_boat_name_unique(name) {
    let boats = await get_boats();
    for (let boat of boats) {
        if (boat.name === `${name}`) {
            return false
        }
    }
    return true
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

//Returns all boats
function get_boats() {
    const q = datastore.createQuery(BOATS);
    return datastore.runQuery(q).then(entities => entities[0].map(fromBoatDatastore));
}

//Returns a specified boat
function get_boat(id, sub) {
    const key = datastore.key([BOATS, parseInt(id, 10)]);
    return datastore.get(key).then(data => fromBoatDatastore(data[0]));
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
function fromBoatDatastore(item) {
    if (item === null || item === undefined) return item;
    item.id = item[Datastore.KEY].id;
    item.self = `${BASE_URL}${BOATS}/${item.id}`;
    return item;
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
    check_if_boat_name_unique: check_if_boat_name_unique,
    post_boat: post_boat,
    get_boat: get_boat,
    validate_all_provided_boat_params_valid: validate_all_provided_boat_params_valid,
    patch_boat: patch_boat,
    get_boats: get_boats,
    put_boat: put_boat,
    delete_boat: delete_boat
};