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

keywordreplies.findKeywordreplies = (appId, message, callback) => {
    admin.database().ref('apps/' + appId + '/keywordreplies/').orderByChild("isDeleted").equalTo(1).child('-L3ghQJBz4fGa8d9pmaj').once('value').then((snap) => {
        var keywordreplies = snap.val();
        console.log(keywordreplies);
        return Promise.resolve(keywordreplies);
    }).then((keywordreplies) => {
        callback(keywordreplies);
    }).catch(() => {
        callback(null);
    });
}

module.exports = keywordreplies;