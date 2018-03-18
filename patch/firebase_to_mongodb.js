const admin = require('firebase-admin');

const serviceAccount = require('../config/firebase-adminsdk');
const databaseURL = require('../config/firebase_admin_database_url');

const appsMdl = require('../models/apps');
const apps_Mdl = require('../models/apps_.js');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: databaseURL.url
});

let appsPromise = new Promise((resolve, reject) => {
    appsMdl.find('', (apps) => {
        if (!apps) {
            reject(new Error());
        }
        resolve(apps);
    });
});

// let apps_promise = new Promise((resolve, reject) => {
//     apps_Mdl.then((xy) => {
//         resolve(xy);
//         console.log(xy);
//     });
// });

appsPromise.then((apps) => {
    // console.log(apps);
    return Promise.resolve([1, 2, 3]);
}).then((arr) => {
    console.log(arr);
    // return apps_promise;
}).catch((err) => {
    console.log(err);
});
