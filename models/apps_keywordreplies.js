var admin = require('firebase-admin'); // firebase admin SDK
var keywordreplies = {};

keywordreplies.findMessagesByAppIdAndKeywordIds = (appId, keywordreplyIds, callback) => {
    let keywordreples = [];
    keywordreplyIds.map((keywordreplyId, index) => {
        let address = 'apps/' + appId + '/keywordreplies/' + keywordreplyId;
        admin.database().ref(address).once('value', (snap) => {
            let replyMessage = snap.val().format;
            keywordreples.push(replyMessage);
            if (index === (keywordreplyIds.length - 1)) {
                callback(keywordreples);
            }
        });
    });
};

module.exports = keywordreplies;
