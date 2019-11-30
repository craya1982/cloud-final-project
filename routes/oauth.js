const express = require('express');
const router = express.Router();
const axios = require('axios');

const config = require('../gcloud_keys');

//Datastore items
const {Datastore} = require('@google-cloud/datastore');
const datastore = new Datastore({projectId: "lucc-gae-final"});
const STATE = "state";

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
    let key = datastore.key(STATE);
    let state = {"value": makeStateCode()};
    await datastore.save({
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
        let query = datastore.createQuery(STATE).filter('value', '=', req.query.state);
        let results = await datastore.runQuery(query);
        //If its not found, bail early
        if (results === undefined || results === null || results.length === 0) {
            res.render('error.ejs', {
                title: "Error!",
                reason: "Error with secret state!"
            });
            return
        }
        //remote from data store so code can be reused again
        await datastore.delete(datastore.key([STATE, parseInt(results[0][0][Datastore.KEY].id, 10)]));
    } catch (e) {
        //bail on error
        console.log(e);
        res.render('error.ejs', {
            title: "Error!",
            reason: "Error with database"
        });
        return
    }

    //Use axios to make a http post request directly to get the access token
    await axios.post('https://oauth2.googleapis.com/token', {
        code: req.query.code,
        client_id: clientId,
        client_secret: secret,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code"
    }).then(response => {
        //Now render the user screen with the data
        res.render("userdata.ejs", {
            title: "Token Retrieved!",
            token: response.data.id_token
        })
    }).catch(error => {
        console.log(error);
        res.render('error.ejs', {
            title: "Error!",
            reason: "Error communicating with API"
        })
    })
});

function makeStateCode() {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < 10; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

async function verify_and_extract_sub(req) {
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