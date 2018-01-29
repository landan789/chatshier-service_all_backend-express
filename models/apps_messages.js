var admin = require('firebase-admin'); // firebase admin SDK
var appsMessages = {};

appsMessages.findMessage = (appId, messengeId, callback) => {
    let proceed = Promise.resolve();

    proceed.then(() => {
        return admin.database().ref('apps/' + appId + '/messages/' + messengeId).once('value');
    }).then((snap) => {
        let message = snap.val();
        if (null === message || undefined === message || '' === message) {
            return Promise.reject();
        }

        return Promise.resolve(message);

    }).then((message) => {
        callback(message);

    }).catch(() => {
        callback(null);
    });
};
appsMessages.findKeywordreplyIds = (appId, messengeId, callback) => {
    let proceed = Promise.resolve();

    proceed.then(() => {
        return admin.database().ref('apps/' + appId + '/messages/' + messengeId).once('value');
    }).then((snap) => {
        let message = snap.val();
        if (null === message || undefined === message || '' === message) {
            return Promise.reject();
        }
        callback(message.keywordreply_ids);
    }).catch(() => {
        callback(null);
    });
};

appsMessages.findTemplateIds = (appId, messengeId, callback) => {
    let proceed = Promise.resolve();

    proceed.then(() => {
        return admin.database().ref('apps/' + appId + '/messages/' + messengeId).once('value');
    }).then((snap) => {
        let message = snap.val();
        if (null === message || undefined === message || '' === message) {
            return Promise.reject();
        }
        callback(message.template_ids);
    }).catch(() => {
        callback(null);
    });
};

module.exports = appsMessages;