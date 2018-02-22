let schedule = require('node-schedule');
let line = require('@line/bot-sdk');
let admin = require('firebase-admin');
let serviceAccount = require('../config/firebase-adminsdk');
let databaseURL = require('../config/firebase_admin_database_url');
let timer = require('../helpers/timer');

const API_ERROR = require('../config/api_error');
const SCHEMA = require('../config/schema');

const SYSTEM = 'SYSTEM';
const CHATSHIER = 'CHATSHIER';
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL.url
});

for (var i = 0; i <= 100; i++) {
    let compose = {
        createdTime: Date.now(),
        isDeleted: 0,
        status: 1,
        text: 'COMPOSE-' + i,
        type: 'text',
        updatedTime: Date.now(),
        time: Date.now()
    }
    admin.database().ref('apps/' + '-L5TUSL-BfGK8hEsMNDQ' + '/composes/').push(compose);

}