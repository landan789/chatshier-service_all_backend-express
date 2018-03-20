module.exports = (function() {
    const admin = require('firebase-admin'); // firebase admin SDK

    function AppsChatroomsModel() {}
    /**
     * @param {string} appId
     * @param {(newChatroomId: string) => any} [callback]
     * @returns {Promise<string>}
     */
    AppsChatroomsModel.prototype.insert = (appId, callback) => {
        let newChatroom = {
            createdTime: Date.now()
        };

        return admin.database().ref('apps/' + appId + '/chatrooms').push(newChatroom).then((ref) => {
            let newChatroomId = ref.key;
            ('function' === typeof callback) && callback(newChatroomId);
            return newChatroomId;
        }).catch(() => {
            ('function' === typeof callback) && callback(null);
            return null;
        });
    };

    let instance = new AppsChatroomsModel();
    return instance;
})();
