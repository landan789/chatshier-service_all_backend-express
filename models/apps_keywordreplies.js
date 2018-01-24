var admin = require('firebase-admin'); // firebase admin SDK
var keywordreplies = {};

keywordreplies.findMessagesByAppIdAndKeywordIds = (appId, keywordreplyIds, callback) => {
    let keywordreples = [];
    if (keywordreplyIds === null) {
        callback(keywordreples);
        return;
    }
    keywordreplyIds.map((keywordreplyId, index) => {
        let address = 'apps/' + appId + '/keywordreplies/' + keywordreplyId;
        admin.database().ref(address).once('value', (snap) => {
            let replyMessage = snap.val();
            if (null === replyMessage || undefined === replyMessage || '' === replyMessage) {
                callback(null);
                return;
            }
            keywordreples.push({type: replyMessage.type, text: replyMessage.text});
            if (index === (keywordreplyIds.length - 1)) {
                callback(keywordreples);
            }
        });
    });
};

module.exports = keywordreplies;
