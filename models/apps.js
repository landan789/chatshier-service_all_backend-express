var admin = require("firebase-admin"); //firebase admin SDK
var apps = {};

apps.getAll = (callback) => {
    admin.database().ref('apps').once('value', snap => {
        var app = snap.val();
        callback(app);
    });
}

apps.getById = (appId, callback) => {
    admin.database().ref('apps/' + appId).once('value', snap => {
        var app = snap.val();
        callback(app);
    });
}


module.exports = apps;