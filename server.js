const express = require('express');
const oauth = require('./routes/oauth');
const bodyParser = require('body-parser');
const {Datastore} = require('@google-cloud/datastore');

const projectId = 'lucc-gae-final';
const datastore = new Datastore({projectId: projectId});

const app = express();

const router = express.Router();
app.set('view engine', 'ejs');
app.use(bodyParser.json());


app.use("/", oauth.router);

// Listen to the App Engine-specified port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
});