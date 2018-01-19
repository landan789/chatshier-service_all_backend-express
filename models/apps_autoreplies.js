var admin = require("firebase-admin"); //firebase admin SDK
var appsAutoreplies = {};

appsAutoreplies.insert = (appId, obj, callback) => {
    let autorepliesId = admin.database().ref('apps/' + appId + '/autoreplies').push().key;
    admin.database().ref('apps/' + appId + '/autoreplies/' + autorepliesId).update(obj);
    callback(autorepliesId);
}

appsAutoreplies.find = (appId, callback) => {
    admin.database().ref('apps/' + appId + '/autoreplies').once('value', snap => {
        let info = snap.val();
        callback(info);
    });
}

appsAutoreplies.findOne = (appId, autoreplyId, callback) => {
    admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).once('value', snap => {
        let info = snap.val();
        callback(info);
    });
}

appsAutoreplies.update = function(appId, autoreplyId, obj, callback) {
    admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).update(obj)
        .then(() => {
            callback();
        })
        .catch(() => {
            callback(false);
        });

}

appsAutoreplies.removeByAutoreplyId = function(appId, autoreplyId, callback) {
    admin.database().ref('apps/' + appId + '/autoreplies/' + autoreplyId).update({
            delete: 1
        })
        .then(() => {
            callback();
        })
        .catch(() => {
            callback(false);
        });
}

module.exports = appsAutoreplies;