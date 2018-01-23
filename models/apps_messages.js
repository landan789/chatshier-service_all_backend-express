var admin = require('firebase-admin'); // firebase admin SDK
var appsMessages = {};

appsMessages.findKeywordreplyIds = (appId, messengeId, callback) => {
    let proceed = Promise.resolve();

    proceed.then(() => {
        return admin.database().ref('apps/' + appId + '/messages/' + messengeId).once('value');
    }).then((snap) => {
        let keywordreplyIds = snap.val().keywordreply_ids;
        if (null === keywordreplyIds || undefined === keywordreplyIds || '' === keywordreplyIds) {
            callback(null);
            return;
        }
        callback(keywordreplyIds);
    });
}; 

appsMessages.findTemplateIds = (appId, messengeId, callback) => {
    let proceed = Promise.resolve();

    proceed.then(() => {
        return admin.database().ref('apps/' + appId + '/messages/' + messengeId).once('value');
    }).then((snap) => {
        let templatereplyIds = snap.val().templatereply_ids;
        if (null === templatereplyIds || undefined === templatereplyIds || '' === templatereplyIds) {
            callback(null);
            return;
        }
        callback(templatereplyIds);
    });
};

module.exports = appsMessages;
