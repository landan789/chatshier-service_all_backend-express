var admin = require("firebase-admin"); //firebase admin SDK
var apps = {};

apps.getById = (appId, callback) => {
    admin.database().ref('apps/' + appId).once('value', snap => {
        var app = snap.val();
        callback(app);
    });
}

module.exports = apps;
