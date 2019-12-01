//Datastore items
const {Datastore} = require('@google-cloud/datastore');
const datastore = new Datastore({projectId: "lucc-gae-final"});
const STATE = "state";
const USER = "users";

module.exports = {
    USER: USER,
    STATE: STATE,
    DATASTORE: datastore,
    KEY: datastore.KEY
}