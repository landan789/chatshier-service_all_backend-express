var admin = require('firebase-admin'); // firebase admin SDK
var appsMessages = {};

appsMessages.findKeywordreplyIds = (appId, messengeId, callback) => {
    let proceed = Promise.resolve();

    proceed.then(() => {
        return admin.database().ref('apps/' + appId + '/messages/' + messengeId).once('value');
    }).then((snap) => {
        let keywordreplies = snap.val();
        if (null === keywordreplies || undefined === keywordreplies || '' === keywordreplies) {
            callback(null);
            return;
        }
        callback(keywordreplies.keywordreply_ids);
    });
};

appsMessages.findTemplateIds = (appId, messengeId, callback) => {
    let proceed = Promise.resolve();

    proceed.then(() => {
        return admin.database().ref('apps/' + appId + '/messages/' + messengeId).once('value');
    }).then((snap) => {
        let templatereplies = snap.val();
        if (null === templatereplies || undefined === templatereplies || '' === templatereplies) {
            callback(null);
            return;
        }
        callback(templatereplies.template_ids);
    });
};

module.exports = appsMessages;
