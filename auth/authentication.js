const config = require('../gcloud_keys');
const {OAuth2Client} = require('google-auth-library');
const client = new OAuth2Client(config.client_id);

function make_state_code() {
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
                                                  audience: config.client_id
                                              })
                               .catch(e => null);

    if (ticket === null || ticket === undefined) {
        return null
    }

    const payload = ticket.getPayload();
    return payload['sub'];
    // If request specified a G Suite domain:
    //const domain = payload['hd'];
}

module.exports = {
    make_state_code: make_state_code,
    verify_and_extract_sub: verify_and_extract_sub
};