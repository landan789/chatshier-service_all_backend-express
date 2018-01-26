var admin = require('firebase-admin'); // firebase admin SDK
var keywordreplies = {};

keywordreplies.findKeywordrepliesByAppIdByKeywordIds = (appId, keywordreplyIds, callback) => {

    Promise.all(keywordreplyIds.map((keywordreplyId) => {
        return admin.database().ref('apps/' + appId + '/keywordreplies/' + keywordreplyId).once('value');
    })).then((result) => {
        callback(result);
    }).catch(() => {
        callback(false);
    });
};

module.exports = keywordreplies;