var admin = require("firebase-admin"); //firebase admin SDK
var apps = {};

apps.getDataById = (callback) => {
    admin.database().ref('apps').once('value', snap => {
        var app = snap.val();
        callback(app);
    });
}

module.exports = apps;
