const express = require('express');
const router = express.Router();
const axios = require('axios');
const datastore = require('../datastore/datastore');
const config = require('../gcloud_keys');

//oAuth items
const clientId = config.client_id;
const secret = config.secret;
const scope = "https://www.googleapis.com/auth/userinfo.profile email";
const redirect_uri = "https://lucc-gae-final.appspot.com/login";

const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client(clientId);

//Other routes
router.get('/', function (req, res) {
    res.status(200).render('index.ejs', {
        title: "Christopher Luc - Final"
    });
});

router.get('/privacy', function (req, res) {
    res.status(200).render('privacy.ejs', {
        title: "Privacy Policy"
    });
});

//oAuth2 route -- starts flow
router.get('/oauth2', async function (req, res) {
    let key = datastore.DATASTORE.key(datastore.STATE);
    let state = {"value": makeStateCode()};
    await datastore.DATASTORE.save({
        "key": key,
        "data": state
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?scope=${scope}&client_id=${clientId}&redirect_uri=${redirect_uri}&response_type=code&state=${state.value}`);
});

//Handles the redirect from oAuth2
router.get('/login', async function (req, res) {
    //Bail early if the required params are missing
    if (req.query === null || req.query === undefined || req.query.code === null || req.query.code === undefined || req.query.state === null || req.query.state === undefined) {
        res.render('error.ejs', {
            title: "Error!",
            reason: "Invalid access"
        });
        return
    }

    //Now ensure state exists in datastore
    try {
        let query = datastore.DATASTORE.createQuery(datastore.STATE).filter('value', '=', req.query.state);
        let results = await datastore.DATASTORE.runQuery(query);
        //If its not found, bail early
        if (results === undefined || results === null || results.length === 0) {
            res.render('error.ejs', {
                title: "Error!",
                reason: "Error with secret state!"
            });
            return
        }
        //remote from data store so code can be reused again
        await datastore.DATASTORE.delete(datastore.DATASTORE.key([datastore.STATE, parseInt(results[0][0][datastore.KEY].id, 10)]));
    } catch (e) {
        //bail on error
        console.log(e);
        res.render('error.ejs', {
            title: "Error!",
            reason: "Error with database"
        });
        return
    }

    try {
        //Use axios to make a http post request directly to get the access token
        let response = await axios.post('https://oauth2.googleapis.com/token', {
            code: req.query.code,
            client_id: clientId,
            client_secret: secret,
            redirect_uri: redirect_uri,
            grant_type: "authorization_code"
        });
        let sub = await verify_and_extract_sub(response.data.id_token);

        if (sub === null || sub === undefined) {
            throw Error("Unexpected error verifying JWT")
        }

        await add_sub_to_datastore_if_not_present(sub);
        //Now render the user screen with the data
        res.render("userdata.ejs", {
            title: "Token Retrieved!",
            token: response.data.id_token
        });
    } catch (error) {
        console.log(error);
        res.render('error.ejs', {
            title: "Error!",
            reason: "Error communicating with API"
        })
    }
});

async function add_sub_to_datastore_if_not_present(sub) {
    let query = datastore.DATASTORE.createQuery(datastore.USER).filter('sub', '=', sub);

    let results = await datastore.DATASTORE.runQuery(query);
    //If its not found, create new user
    if (results === undefined || results === null || results[0] === null || results[0] === undefined || results[0].length === 0) {
        let key = datastore.DATASTORE.key(datastore.USER);
        let user = {"sub": sub};
        await datastore.DATASTORE.save({
            "key": key,
            "data": user
        });
    }
}

function makeStateCode() {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < 10; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

async function verify_and_extract_sub(token) {

    const ticket = await client.verifyIdToken({
        idToken: token,
        audience: clientId
    }).catch(e => null);

    if (ticket === null || ticket === undefined) {
        return null
    }

    const payload = ticket.getPayload();
    return payload['sub'];
    // If request specified a G Suite domain:
    //const domain = payload['hd'];
}

module.exports = {
    router: router,
    verify_and_extract_sub: verify_and_extract_sub
};