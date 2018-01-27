var admin = require('firebase-admin'); // firebase admin SDK
var appsChatrooms = {};

appsChatrooms.insert = (appId, chatroomId, callback) => {
    let proceed = Promise.resolve();

    proceed.then(() => {
        return new Promise((resolve, reject) => {
            if (null === chatroomId || undefined === chatroomId || '' === chatroomId) {
                let newChatroomId = admin.database().ref('apps/' + appId + '/chatrooms').push().key;
                resolve(newChatroomId);
                return;
            }
            resolve(chatroomId);
        });
    }).then((chatroomId) => {
        callback(chatroomId);
    }).catch(() => {
        callback(null);
    });
};

module.exports = appsChatrooms;
